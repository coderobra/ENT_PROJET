import os
import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# URL du JWKS Keycloak (configuré via variable d'env pour Docker)
KEYCLOAK_URL = os.getenv("KEYCLOAK_URL", "http://keycloak:8080")
JWKS_URL = f"{KEYCLOAK_URL}/realms/ent-realm/protocol/openid-connect/certs"

jwks_client = PyJWKClient(JWKS_URL)

# 🔥 IMPORTANT : remplace OAuth2 par HTTPBearer
security = HTTPBearer()

def verifier_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        # Récupère le token envoyé dans "Authorization: Bearer ..."
        token = credentials.credentials

        # Récupère la clé publique Keycloak
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        # Décode et vérifie le JWT
        data = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False}
        )

        return data

    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Non autorisé (Token Invalide) : {str(e)}"
        )