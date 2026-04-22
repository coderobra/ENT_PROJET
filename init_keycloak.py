import time
import os
import sys
from keycloak import KeycloakAdmin

def get_keycloak_admin(url, user, password):
    """Tente de créer un objet KeycloakAdmin robuste."""
    return KeycloakAdmin(
        server_url=url,
        username=user,
        password=password,
        realm_name="master",
        user_realm_name="master",
        verify=True
    )

def init_keycloak():
    internal_url = os.getenv("KEYCLOAK_URL", "http://keycloak:8080")
    admin_user = os.getenv("KEYCLOAK_ADMIN", "admin")
    admin_pass = os.getenv("KEYCLOAK_ADMIN_PASSWORD", "admin")
    
    # Nettoyage de l'URL
    internal_url = internal_url.rstrip("/")

    print(f"--- INITIALISATION KEY_QUARKUS (Direct Connect) ---")
    print(f"URL: {internal_url}")
    
    keycloak_admin = None
    # Boucle de connexion directe sur l'API Admin
    for i in range(40):
        try:
            keycloak_admin = get_keycloak_admin(internal_url, admin_user, admin_pass)
            # Un appel simple pour vérifier la validité de la connexion
            keycloak_admin.get_realms()
            print("✓ Connecté à Keycloak !")
            break
        except Exception as e:
            # On affiche une version courte de l'erreur pour les logs
            err_msg = str(e)[:100]
            print(f"⏳ ({i+1}/40) Keycloak pas encore prêt... ({err_msg})")
            time.sleep(5)
            
    if not keycloak_admin:
        print("❌ Échec critique : Keycloak injoignable après 40 tentatives.")
        sys.exit(1)

    # 1. Realm
    realm_name = "ent-realm"
    try:
        realms = keycloak_admin.get_realms()
        if not any(r['realm'] == realm_name for r in realms):
            print(f"🔧 Création du realm '{realm_name}'...")
            keycloak_admin.create_realm(payload={"realm": realm_name, "enabled": True})
        else:
            print(f"✓ Realm '{realm_name}' présent.")
    except Exception as e:
        print(f"⚠️ Erreur Realm : {e}")

    keycloak_admin.realm_name = realm_name

    # 2. Client Public (ent-app)
    try:
        client_id = "ent-app"
        clients = keycloak_admin.get_clients()
        client = next((c for c in clients if c['clientId'] == client_id), None)
        
        client_payload = {
            "clientId": client_id,
            "enabled": True,
            "publicClient": True,
            "directAccessGrantsEnabled": True,
            "webOrigins": ["*"],
            "redirectUris": ["*"],
            "fullScopeAllowed": True,
            "protocol": "openid-connect"
        }
        
        if not client:
            print(f"🔧 Création du client '{client_id}'...")
            keycloak_admin.create_client(payload=client_payload)
        else:
            print(f"🔧 Mise à jour du client '{client_id}'...")
            keycloak_admin.update_client(client['id'], payload=client_payload)
    except Exception as e:
        print(f"⚠️ Erreur Client : {e}")

    # 3. Roles
    roles = ["etudiant", "enseignant", "admin"]
    existing_roles = [r['name'] for r in keycloak_admin.get_realm_roles()]
    for role in roles:
        if role not in existing_roles:
            keycloak_admin.create_realm_role(payload={"name": role})
    print(f"✓ Rôles OK.")

    # 4. Utilisateur Admin
    try:
        test_user = "admin"
        users = keycloak_admin.get_users({"username": test_user})
        if not users:
            print(f"🔧 Création de l'utilisateur '{test_user}'...")
            user_id = keycloak_admin.create_user(payload={
                "username": test_user,
                "enabled": True,
                "email": "admin@um5.ac.ma",
                "firstName": "Admin",
                "lastName": "ENT",
                "requiredActions": [] 
            })
        else:
            user_id = users[0]['id']
            keycloak_admin.update_user(user_id, payload={
                "requiredActions": [],
                "emailVerified": True,
                "enabled": True
            })
            
        keycloak_admin.set_user_password(user_id, "admin", temporary=False)
        role_admin = keycloak_admin.get_realm_role("admin")
        keycloak_admin.assign_realm_roles(user_id, [role_admin])
        print(f"✓ User '{test_user}' OK.")
        
    except Exception as e:
        print(f"⚠️ Erreur Utilisateur : {e}")

    print("🚀 INITIALISATION TERMINÉE")

if __name__ == "__main__":
    init_keycloak()
