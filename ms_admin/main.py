import os
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_db_session
from auth_utils import verifier_token
from keycloak import KeycloakAdmin
from keycloak.exceptions import KeycloakError

# Microservice Administration : CRUD complet des utilisateurs
# Synchronisation Keycloak ↔ Cassandra

app = FastAPI(title="Microservice Administration", version="2.0")

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Client Keycloak Admin (s'authentifie avec le compte master admin)
KEYCLOAK_ADMIN = os.getenv("KEYCLOAK_ADMIN", "admin")
KEYCLOAK_ADMIN_PASS = os.getenv("KEYCLOAK_ADMIN_PASSWORD", "admin")

keycloak_admin = KeycloakAdmin(
    server_url="http://keycloak:8080",
    username=KEYCLOAK_ADMIN,
    password=KEYCLOAK_ADMIN_PASS,
    realm_name="ent-realm",
    user_realm_name="master",
    client_id="admin-cli",
    verify=True
)

# =============================================
# Modèles Pydantic
# =============================================

class UserCreate(BaseModel):
    nom: str
    prenom: str
    email: str
    role: str  # etudiant | enseignant | admin

class UserUpdate(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None  # si None → ne change pas le mot de passe

class PasswordUpdate(BaseModel):
    password: str

class UserResetPassword(BaseModel):
    email: str
    nom: str
    prenom: str
    new_password: str

# =============================================
# Helper : vérifier le rôle admin dans le token
# =============================================
def require_admin(token_data: dict):
    roles = token_data.get("realm_access", {}).get("roles", [])
    if "admin" not in roles:
        raise HTTPException(status_code=403, detail="Accès refusé : rôle 'admin' requis")

# =============================================
# Helper : assigner un rôle Keycloak à un user
# =============================================
def assigner_role(user_id: str, nom_role: str):
    try:
        try:
            role = keycloak_admin.get_realm_role(nom_role)
        except KeycloakError:
            keycloak_admin.create_realm_role({"name": nom_role})
            role = keycloak_admin.get_realm_role(nom_role)
        keycloak_admin.assign_realm_roles(user_id=user_id, roles=[role])
    except Exception as e:
        print(f"[WARN] Erreur assignement rôle '{nom_role}' : {e}")

# =============================================
# GET / – Root
# =============================================
@app.get("/")
def admin_root():
    return {"message": "Service d'Administration v2 (CRUD Utilisateurs)"}

# =============================================
# GET /users/ – Liste tous les utilisateurs (depuis Cassandra)
# =============================================
@app.get("/users/")
def lister_utilisateurs(token_data: dict = Depends(verifier_token)):
    require_admin(token_data)
    try:
        session = get_db_session()
        rows = session.execute("SELECT email, nom, prenom, role, mot_de_passe FROM utilisateurs")
        return {
            "utilisateurs": [
                {"email": r.email, "nom": r.nom, "prenom": r.prenom, "role": r.role, "mot_de_passe": r.mot_de_passe}
                for r in rows
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Cassandra : {e}")

# =============================================
# POST /users/ – Créer un utilisateur
# =============================================
@app.post("/users/")
def creer_utilisateur(user: UserCreate, token_data: dict = Depends(verifier_token)):
    require_admin(token_data)

    # 1. Créer dans Keycloak
    try:
        new_user_id = keycloak_admin.create_user({
            "email":     user.email,
            "username":  user.email,
            "enabled":   True,
            "firstName": user.prenom,
            "lastName":  user.nom,
            "credentials": [{"value": "azerty123", "type": "password", "temporary": False}]
        }, exist_ok=False)
    except KeycloakError as e:
        raise HTTPException(status_code=400, detail=f"Erreur Keycloak création : {e}")

    # 2. Assigner le rôle
    assigner_role(new_user_id, user.role)

    # 3. Sauvegarder dans Cassandra
    try:
        session = get_db_session()
        session.execute(
            "INSERT INTO utilisateurs (email, nom, prenom, role, mot_de_passe) VALUES (%s, %s, %s, %s, %s)",
            (user.email, user.nom, user.prenom, user.role, "azerty123")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Cassandra : {e}")

    return {"message": "Utilisateur créé avec succès", "user": user.dict()}

# =============================================
# PUT /users/{email} – Modifier nom/prenom/role/password
# Synchronise Keycloak + Cassandra
# =============================================
@app.put("/users/{email}")
def modifier_utilisateur(email: str, update: UserUpdate, token_data: dict = Depends(verifier_token)):
    require_admin(token_data)

    # Trouver l'utilisateur dans Keycloak par email
    try:
        users = keycloak_admin.get_users({"email": email})
        if not users:
            raise HTTPException(status_code=404, detail=f"Utilisateur '{email}' introuvable dans Keycloak")
        kc_user = users[0]
        user_id = kc_user["id"]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Keycloak recherche : {e}")

    # Mettre à jour le profil Keycloak
    try:
        kc_payload = {}
        if update.nom    is not None: kc_payload["lastName"]  = update.nom
        if update.prenom is not None: kc_payload["firstName"] = update.prenom
        if kc_payload:
            keycloak_admin.update_user(user_id, kc_payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Keycloak update profil : {e}")

    # Changer le mot de passe dans Keycloak si fourni
    if update.password:
        try:
            keycloak_admin.set_user_password(user_id, update.password, temporary=False)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erreur Keycloak update password : {e}")

    # Mettre à jour le rôle Keycloak si fourni
    if update.role:
        try:
            # Récupérer les rôles actuels et les retirer
            current_roles = keycloak_admin.get_realm_roles_of_user(user_id)
            business_roles = [r for r in current_roles if r["name"] in ["etudiant", "enseignant", "admin"]]
            if business_roles:
                keycloak_admin.delete_realm_roles_of_user(user_id, business_roles)
            # Assigner le nouveau rôle
            assigner_role(user_id, update.role)
        except Exception as e:
            print(f"[WARN] Erreur update rôle : {e}")

    # Mettre à jour Cassandra
    try:
        session = get_db_session()
        # Récupérer les valeurs actuelles pour préserver celles qui ne sont pas modifiées
        row = session.execute("SELECT nom, prenom, role, mot_de_passe FROM utilisateurs WHERE email=%s", [email]).one()
        nom_final      = update.nom      if update.nom      is not None else (row.nom          if row else "")
        prenom_final   = update.prenom   if update.prenom   is not None else (row.prenom       if row else "")
        role_final     = update.role     if update.role     is not None else (row.role         if row else "")
        password_final = update.password if update.password is not None else (row.mot_de_passe if row else "azerty123")

        session.execute(
            "UPDATE utilisateurs SET nom=%s, prenom=%s, role=%s, mot_de_passe=%s WHERE email=%s",
            (nom_final, prenom_final, role_final, password_final, email)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Cassandra update : {e}")

    return {"message": f"Utilisateur '{email}' modifié avec succès"}

# =============================================
# DELETE /users/{email} – Supprimer un utilisateur
# Supprime de Keycloak ET de Cassandra
# =============================================
@app.delete("/users/{email}")
def supprimer_utilisateur(email: str, token_data: dict = Depends(verifier_token)):
    require_admin(token_data)

    # Supprimer de Keycloak
    try:
        users = keycloak_admin.get_users({"email": email})
        if not users:
            raise HTTPException(status_code=404, detail=f"Utilisateur '{email}' introuvable dans Keycloak")
        user_id = users[0]["id"]
        keycloak_admin.delete_user(user_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Keycloak suppression : {e}")

    # Supprimer de Cassandra
    try:
        session = get_db_session()
        session.execute("DELETE FROM utilisateurs WHERE email=%s", [email])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Cassandra suppression : {e}")

    return {"message": f"Utilisateur '{email}' supprimé de Keycloak et Cassandra"}

# =============================================
# PUT /profile/password – L'utilisateur change son PROPRE mot de passe
# =============================================
@app.put("/profile/password")
def changer_mon_password(update: PasswordUpdate, token_data: dict = Depends(verifier_token)):
    email = token_data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Token invalide : email manquant")

    # 1. Trouver l'utilisateur dans Keycloak
    try:
        users = keycloak_admin.get_users({"email": email})
        if not users:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        user_id = users[0]["id"]
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

    # 2. Mettre à jour Keycloak
    try:
        keycloak_admin.set_user_password(user_id, update.password, temporary=False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Keycloak : {e}")

    # 3. Mettre à jour Cassandra
    try:
        session = get_db_session()
        session.execute(
            "UPDATE utilisateurs SET mot_de_passe=%s WHERE email=%s",
            (update.password, email)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Cassandra : {e}")

    return {"message": "Votre mot de passe a été mis à jour avec succès"}

# =============================================
# POST /public/reset-password – Public Reset Flow
# =============================================
@app.post("/public/reset-password")
def reinitialiser_password_public(reset: UserResetPassword):
    try:
        session = get_db_session()
        # 1. Vérifier l'identité dans Cassandra
        row = session.execute(
            "SELECT nom, prenom FROM utilisateurs WHERE email=%s",
            [reset.email]
        ).one()

        if not row:
            raise HTTPException(status_code=404, detail="Email introuvable")

        # Vérification stricte (case-insensitive pour plus de souplesse?)
        # Restons strict pour la sécurité de ce projet
        if row.nom.strip().lower() != reset.nom.strip().lower() or \
           row.prenom.strip().lower() != reset.prenom.strip().lower():
            raise HTTPException(status_code=403, detail="Vérification d'identité échouée : Nom ou Prénom incorrect")

        # 2. Identité confirmée -> Mettre à jour Keycloak
        users = keycloak_admin.get_users({"email": reset.email})
        if not users:
            raise HTTPException(status_code=404, detail="Utilisateur Keycloak introuvable")
        user_id = users[0]["id"]
        
        keycloak_admin.set_user_password(user_id, reset.new_password, temporary=False)

        # 3. Mettre à jour Cassandra
        session.execute(
            "UPDATE utilisateurs SET mot_de_passe=%s WHERE email=%s",
            (reset.new_password, reset.email)
        )

        return {"message": "Mot de passe réinitialisé avec succès"}

    except HTTPException: raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
