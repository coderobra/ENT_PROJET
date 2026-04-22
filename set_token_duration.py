#!/usr/bin/env python3
"""
Configure la durée de vie du token Keycloak à 7 jours pour ent-realm.
"""
import urllib.request
import urllib.parse
import json

KEYCLOAK_URL = "http://localhost:8080"
REALM        = "ent-realm"
ADMIN_USER   = "admin"
ADMIN_PASS   = "admin"

SEVEN_DAYS   = 7 * 24 * 3600  # 604800 secondes

def get_admin_token():
    data = urllib.parse.urlencode({
        "client_id":  "admin-cli",
        "username":   ADMIN_USER,
        "password":   ADMIN_PASS,
        "grant_type": "password"
    }).encode()
    req = urllib.request.Request(
        f"{KEYCLOAK_URL}/realms/master/protocol/openid-connect/token",
        data=data,
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())["access_token"]

def update_realm_token_duration(admin_token):
    payload = json.dumps({
        "accessTokenLifespan":           SEVEN_DAYS,  # token d'accès : 7 jours
        "ssoSessionMaxLifespan":         SEVEN_DAYS,  # session SSO max : 7 jours
        "ssoSessionIdleTimeout":         SEVEN_DAYS,  # session SSO idle : 7 jours
        "offlineSessionMaxLifespan":     SEVEN_DAYS,
        "offlineSessionIdleTimeout":     SEVEN_DAYS,
        "accessTokenLifespanForImplicitFlow": SEVEN_DAYS,
    }).encode()
    req = urllib.request.Request(
        f"{KEYCLOAK_URL}/admin/realms/{REALM}",
        data=payload,
        method="PUT",
        headers={
            "Authorization": f"Bearer {admin_token}",
            "Content-Type":  "application/json"
        }
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code

if __name__ == "__main__":
    print(f"Connexion à Keycloak ({KEYCLOAK_URL})...")
    try:
        token  = get_admin_token()
        status = update_realm_token_duration(token)
        if status in (200, 204):
            print(f"✓ Durée du token mise à {SEVEN_DAYS}s (7 jours) dans le realm '{REALM}'")
            print("  → accessTokenLifespan, ssoSessionMaxLifespan, ssoSessionIdleTimeout = 7 jours")
        else:
            print(f"✗ Erreur HTTP {status}")
    except Exception as e:
        print(f"✗ Impossible de joindre Keycloak : {e}")
