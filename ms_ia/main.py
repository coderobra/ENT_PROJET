import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

# ...

app = FastAPI(title="Microservice Assistant IA (Ollama)", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# URL de l'API REST d'Ollama (Configurable pour Docker)
# Si Ollama tourne sur la machine hôte, utilisez http://host.docker.internal:11434
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")

class PromptRequest(BaseModel):
    prompt: str

@app.get("/")
def root():
    return {"message": "Service Intelligence Artificielle (Llama 3 via Ollama)"}

@app.get("/health")
def health():
    return {"status": "ok", "service": "ms_ia"}

@app.post("/chat/")
async def chat_avec_llama(request: PromptRequest):
    """
    Envoie un prompt à Ollama (Llama 3) et retourne la réponse.
    Si Ollama n'est pas disponible, retourne une réponse de fallback.
    """
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                OLLAMA_URL,
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": request.prompt,
                    "stream": False
                }
            )
            response.raise_for_status()
            data = response.json()
            return {"reponse": data.get("response", "Aucune réponse reçue de Llama 3.")}

    except httpx.ConnectError:
        # Ollama n'est pas lancé → fallback informatif
        reponse_fallback = (
            f"[Service IA hors ligne] Ollama n'est pas disponible sur localhost:11434. "
            f"Pour activer l'assistant IA, lancez Ollama avec : `ollama run {OLLAMA_MODEL}`"
        )
        return {"reponse": reponse_fallback}

    except httpx.TimeoutException:
        return {"reponse": "[Service IA] Le modèle prend trop de temps à répondre. Réessayez dans quelques instants."}

    except Exception as e:
        return {"reponse": f"[Service IA] Erreur inattendue : {str(e)}"}
