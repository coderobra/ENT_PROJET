# 🎓 Espace Numérique de Travail (ENT) - Architecture Micro-services

Ce projet est une plateforme ENT complète et moderne basée sur une architecture micro-services. Il permet la gestion des utilisateurs (étudiants, enseignants, administrateurs), le partage de cours et l'intégration de services intelligents.

## 🚀 Technologies utilisées

*   **Backend** : Python (FastAPI)
*   **Base de données** : Apache Cassandra (Données structurées)
*   **Stockage d'objets** : MinIO (S3 compatible pour les fichiers de cours)
*   **Authentification & IAM** : Keycloak (Identity & Access Management)
*   **Frontend** : React.js (Interface utilisateur moderne)
*   **Conteneurisation** : Docker & Docker Compose
*   **IA** : Ollama (Assistant IA pour les micro-services)

## 🏗️ Architecture du Projet

Le système est décomposé en 5 micro-services indépendants :
1.  **ms-auth** : Gestion des jetons JWT et accès sécurisé.
2.  **ms-admin** : Gestion complète du cycle de vie des utilisateurs (CRUD).
3.  **ms-fichiers** : Upload et gestion du stockage MinIO.
4.  **ms-telechargement** : Service de récupération sécurisée des documents.
5.  **ms-ia** : Intégration de l'intelligence artificielle (Assistant Llama).

## 🛠️ Installation et Démarrage

### Pré-requis
*   Docker & Docker Compose installés sur votre machine.

### Lancement
1. Clonez le dépôt :
   ```bash
   git clone https://github.com/votre-compte/ENT_Projet.git
   cd ENT_Projet
   ```

2. Démarrez l'ensemble des services :
   ```bash
   docker-compose up --build
   ```

3. Accédez à l'application :
   *   **Frontend** : [http://localhost](http://localhost)
   *   **Keycloak Admin** : [http://localhost/auth/](http://localhost/auth/) (admin / admin)
   *   **MinIO Console** : [http://localhost:9001](http://localhost:9001)

## 🔑 Identifiants par défaut (Développement)

| Service | Utilisateur | Mot de passe |
| :--- | :--- | :--- |
| Administrateur ENT | `admin` | `admin` |
| Keycloak Master | `admin` | `admin` |
| MinIO Root | `admin` | `admin123` |

## 🌟 Fonctionnalités

- [x] **SSO (Single Sign-On)** : Une seule connexion pour tous les services via Keycloak.
- [x] **Rôles Utilisateurs** : Permissions distinctes pour Étudiants, Enseignants et Admins.
- [x] **Cours Interactifs** : Upload par les enseignants et téléchargement direct pour les étudiants.
- [x] **Initialisation Automatisée** : Les bases de données et realms sont configurés automatiquement au lancement.

---
Projet réalisé dans le cadre du cursus Ingénierie Informatique.
