from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta
import uuid
import os

from minio import Minio
from database import get_db_session
from auth_utils import verifier_token

app = FastAPI(title="MS Téléchargement")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Client pour les opérations INTERNES (Docker à Docker)
MINIO_INTERNAL = os.getenv("MINIO_ENDPOINT", "ent-minio:9000")
internal_client = Minio(
    MINIO_INTERNAL,
    access_key=os.getenv("MINIO_ROOT_USER", "admin"),
    secret_key=os.getenv("MINIO_ROOT_PASSWORD", "admin123"),
    secure=False,
    region="us-east-1"
)

# 2. Client dédié à la SIGNATURE des URLs (pour le Navigateur)
MINIO_PUBLIC_HOST = "localhost:9000"
signer_client = Minio(
    MINIO_PUBLIC_HOST,
    access_key=os.getenv("MINIO_ROOT_USER", "admin"),
    secret_key=os.getenv("MINIO_ROOT_PASSWORD", "admin123"),
    secure=False,
    region="us-east-1"
)

@app.get("/cours/")
def list_cours(token_data: dict = Depends(verifier_token)):
    roles = token_data.get("realm_access", {}).get("roles", [])
    if not any(r in roles for r in ["etudiant", "enseignant", "admin"]):
        raise HTTPException(status_code=403, detail="Accès refusé : rôle requis")

    session = get_db_session()
    rows = session.execute("SELECT id, titre, description, nom_fichier, url FROM cours")

    cours = []
    for row in rows:
        cours.append({
            "id": str(row.id),
            "titre": row.titre,
            "description": row.description,
            "nom_fichier": row.nom_fichier,
            "url": row.url
        })
    return {"cours": cours}

@app.get("/cours/download/{cours_id}")
def download(cours_id: str, token_data: dict = Depends(verifier_token)):
    roles = token_data.get("realm_access", {}).get("roles", [])
    if not any(r in roles for r in ["etudiant", "enseignant", "admin"]):
        raise HTTPException(status_code=403, detail="Accès refusé : rôle requis")

    session = get_db_session()
    try:
        uid = uuid.UUID(cours_id)
        row = session.execute("SELECT nom_fichier FROM cours WHERE id=%s", [uid]).one()
        if not row:
            raise HTTPException(status_code=404, detail="Fichier introuvable")

        # On utilise le 'signer_client' (localhost) pour que la signature MATCH avec l'URL
        # presigned_get_object ne fait pas d'appel réseau, c'est juste un calcul local.
        url = signer_client.presigned_get_object(
            "cours",
            row.nom_fichier,
            expires=timedelta(hours=2),
            response_headers={
                'response-content-disposition': f'attachment; filename="{row.nom_fichier}"'
            }
        )

        return {"url_telechargement": url}

    except ValueError:
        raise HTTPException(status_code=400, detail="ID invalide")
    except Exception as e:
        print(f"❌ Erreur download: {e}")
        raise HTTPException(status_code=500, detail=str(e))