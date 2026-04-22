#!/bin/bash

# Configuration des couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Lancement de l'Espace Numérique de Travail (ENT) ===${NC}"

# Vérifier si Docker tourne
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}ERREUR: Docker n'est pas allumé ! Veuillez lancer l'application 'Docker Desktop' sur votre Mac d'abord.${NC}"
  exit 1
fi

echo -e "${GREEN}[1/3] Nettoyage des anciens processus & Démarrage de Docker...${NC}"

# Tuer tous les processus qui pourraient utiliser nos ports
lsof -ti :8000,8001,8002,8003,8004,5173 | xargs kill -9 2>/dev/null

docker-compose up -d

echo "Attente de 10 secondes pour l'initialisation basale de l'infrastructure..."
sleep 10

python3 init_cassandra.py || echo "Initialisation Cassandra sautée."

echo -e "${GREEN}[2/3] Démarrage des microservices FastAPI...${NC}"

# On utilise des sous-shells ( ... ) pour ne pas modifier le dossier parent
(cd ms_auth && python3 -m uvicorn main:app --port 8000) &
PID_AUTH=$!

(cd ms_admin && python3 -m uvicorn main:app --port 8001) &
PID_ADMIN=$!

(cd ms_fichiers && python3 -m uvicorn main:app --port 8002) &
PID_FICHIERS=$!

(cd ms_telechargement && python3 -m uvicorn main:app --port 8003) &
PID_TELECHARGEMENT=$!

(cd ms_ia && python3 -m uvicorn main:app --port 8004) &
PID_IA=$!

echo -e "${GREEN}[3/3] Démarrage du Frontend React (Port 5173)...${NC}"
(cd frontend && python3 -m http.server 5173) &
PID_FRONT=$!

echo -e "\n${BLUE}=== TOUT EST EN LIGNE ===${NC}"
echo -e "🔗 Frontend React accessible sur : ${GREEN}http://localhost:5173${NC}"
echo -e "🛡️ Accès administrateur Keycloak sur : ${GREEN}http://localhost:8080${NC}"
echo -e "\nAppuyez sur CTRL+C pour tout arrêter proprement."

cleanup() {
    echo -e "\n${BLUE}Arrêt de tous les microservices et serveurs Web...${NC}"
    kill $PID_AUTH $PID_ADMIN $PID_FICHIERS $PID_TELECHARGEMENT $PID_IA $PID_FRONT
    echo -e "${BLUE}Arrêt des conteneurs Docker (Cassandra & Keycloak)...${NC}"
    docker-compose stop
    exit 0
}

trap cleanup SIGINT
wait
