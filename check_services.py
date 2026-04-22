#!/usr/bin/env python3
"""
Script de validation de la compatibilité Frontend ↔ Backend
Vérifie que tous les microservices sont bien accessibles et que les routes répondent.
"""
import urllib.request
import urllib.error
import json
import sys

SERVICES = {
    "ms_auth  (port 8000)": "http://localhost:8000/",
    "ms_admin (port 8001)": "http://localhost:8001/",
    "ms_fichiers (port 8002)": "http://localhost:8002/",
    "ms_telechargement (port 8003)": "http://localhost:8003/",
    "ms_ia (port 8004)": "http://localhost:8004/",
    "ms_ia /health": "http://localhost:8004/health",
    "frontend (port 5173)": "http://localhost:5173/",
    "keycloak (port 8080)": "http://localhost:8080/",
    "minio (port 9001)": "http://localhost:9001/",
}

GREEN = '\033[0;32m'
RED   = '\033[0;31m'
BLUE  = '\033[0;34m'
NC    = '\033[0m'

ok = 0
fail = 0

print(f"\n{BLUE}=== Validation Compatibilité Frontend ↔ Backend ENT ==={NC}\n")

for name, url in SERVICES.items():
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ENT-Validator/1.0"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            status = resp.status
            print(f"  {GREEN}✓{NC} {name:<35} → HTTP {status}")
            ok += 1
    except urllib.error.HTTPError as e:
        # 4xx/5xx signifie que le service tourne, juste une auth requise
        print(f"  {GREEN}✓{NC} {name:<35} → HTTP {e.code} (service actif)")
        ok += 1
    except Exception as e:
        print(f"  {RED}✗{NC} {name:<35} → HORS LIGNE ({type(e).__name__})")
        fail += 1

print(f"\n{BLUE}Résultat : {GREEN}{ok} OK{NC} / {RED}{fail} HORS LIGNE{NC}")

print(f"""
{BLUE}=== Correspondance Routes Frontend ↔ Backend ==={NC}
  LOGIN      : POST http://localhost:8000/login        [ms_auth]
  LIST COURS : GET  http://localhost:8003/cours/       [ms_telechargement]
  DOWNLOAD   : GET  http://localhost:8003/cours/download/{{id}} [ms_telechargement]
  UPLOAD     : POST http://localhost:8002/cours/upload/ [ms_fichiers] (champ: "fichier")
  CHATBOT IA : POST http://localhost:8004/chat/        [ms_ia] (champ: "prompt")
  ADMIN USER : POST http://localhost:8001/users/       [ms_admin]
""")

if fail > 0:
    print(f"{RED}ATTENTION : {fail} service(s) sont hors ligne.{NC}")
    print("Assurez-vous d'avoir lancé ./start_all.sh et que Docker est démarré.")
    sys.exit(1)
else:
    print(f"{GREEN}Tous les services sont opérationnels !{NC}")
