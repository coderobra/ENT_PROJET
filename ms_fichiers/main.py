from fastapi import FastAPI, UploadFile, File, Depends, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uuid
import io

from minio import Minio
from database import get_db_session
from auth_utils import verifier_token
import os

app = FastAPI(title="MS Fichiers")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

minio_client = Minio(
    os.getenv("MINIO_ENDPOINT", "minio:9000"),
    access_key=os.getenv("MINIO_ROOT_USER", "admin"),
    secret_key=os.getenv("MINIO_ROOT_PASSWORD", "admin123"),
    secure=False
)

# S'assurer que le bucket 'cours' existe au démarrage
try:
    if not minio_client.bucket_exists("cours"):
        minio_client.make_bucket("cours")
        print("✓ Bucket 'cours' créé avec succès.")
    else:
        print("✓ Bucket 'cours' déjà présent.")
except Exception as e:
    print(f"⚠️ Erreur lors de l'initialisation de MinIO : {e}")

@app.post("/cours/upload/")
async def upload_cours(
    titre: str = Form(...),
    description: str = Form(...),
    fichier: UploadFile = File(...),
    token_data: dict = Depends(verifier_token)
):

    roles = token_data.get("realm_access", {}).get("roles", [])
    if "enseignant" not in roles:
        raise HTTPException(status_code=403, detail="Enseignant requis")

    content = await fichier.read()
    content_io = io.BytesIO(content)

    minio_client.put_object(
        "cours",
        fichier.filename,
        content_io,
        len(content),
        content_type=fichier.content_type
    )

    url = f"minio://cours/{fichier.filename}"

    session = get_db_session()
    cours_id = uuid.uuid4()

    session.execute(
        "INSERT INTO cours (id, titre, description, nom_fichier, url) VALUES (%s, %s, %s, %s, %s)",
        (cours_id, titre, description, fichier.filename, url)
    )

    return {"message": "Upload OK", "id": str(cours_id)}