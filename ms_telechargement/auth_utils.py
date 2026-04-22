import os
import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# URL JWKS Keycloak (configuré via variable d'env pour Docker)
KEYCLOAK_URL = os.getenv("KEYCLOAK_URL", "http://keycloak:8080")
JWKS_URL = f"{KEYCLOAK_URL}/realms/ent-realm/protocol/openid-connect/certs"

jwks_client = PyJWKClient(JWKS_URL)

# 🔥 Sécurité Bearer (remplace OAuth2)
security = HTTPBearer(auto_error=True)

def verifier_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        # 🔥 Nettoyage du token (évite erreurs padding)
        token = credentials.credentials.strip()

        # Vérifier qu'il ressemble à un JWT
        if token.count(".") != 2:
            raise HTTPException(status_code=401, detail="Token mal formé")

        # Récupération clé publique
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        # Décodage JWT
        data = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False}
        )

        return data

    except Exception as e:
        print(f"❌ ERREUR AUTH : {str(e)}") # Visible dans les logs Docker
        raise HTTPException(
            status_code=401,
            detail=f"Non autorisé (Token Invalide) : {type(e).__name__} - {str(e)}"
        )