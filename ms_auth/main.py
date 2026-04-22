from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from keycloak import KeycloakOpenID
from keycloak.exceptions import KeycloakAuthenticationError
import os

# Ce microservice est responsable de l'authentification avec Keycloak.
# Il fournit un token JWT après connexion via Keycloak.

app = FastAPI(title="Microservice Core (Auth)", version="1.0")

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration du client Keycloak
# IMPORTANT : Ces valeurs doivent correspondre à celles configurées dans l'interface Keycloak
KEYCLOAK_URL = os.getenv("KEYCLOAK_URL", "http://keycloak:8080")

keycloak_openid = KeycloakOpenID(
    server_url=KEYCLOAK_URL,
    client_id="ent-app",
    realm_name="ent-realm",
    verify=True
)

@app.get("/")
def read_root():
    return {"message": "Service d'Authentification (Keycloak Integration)"}

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    try:
        # On demande le token à Keycloak avec le username et password fournis par l'utilisateur
        token = keycloak_openid.token(form_data.username, form_data.password,grant_type="password")
        return {"access_token": token["access_token"], "token_type": "bearer"}
    except KeycloakAuthenticationError as e:
        print(f"Keycloak Authentication Error: {e}")
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    except Exception as e:
        import traceback
        error_msg = getattr(e, 'error_message', str(e))
        print(f"--- ERREUR CRITIQUE AUTH ---")
        print(f"URL Keycloak configurée: {os.getenv('KEYCLOAK_URL')}")
        print(f"Exception: {type(e).__name__}")
        print(f"Message: {error_msg}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Erreur interne lors de la communication avec Keycloak: {error_msg}"
        )
