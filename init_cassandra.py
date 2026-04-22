import os
import time
from cassandra.cluster import Cluster
from cassandra.query import SimpleStatement

def verifier_connexion():
    print("Tentative de connexion à Cassandra...")
    cassandra_host = os.getenv("CASSANDRA_HOST", "cassandra")
    cluster = Cluster([cassandra_host], port=9042)
    
    # On va essayer de se connecter avec un retry pour attendre que Cassandra démarre
    session = None
    for i in range(40):
        try:
            session = cluster.connect()
            print("Connecté avec succès à Cassandra !")
            break
        except Exception as e:
            print(f"En attente de Cassandra... ({i+1}/40)")
            time.sleep(3)
            
    if not session:
        print("Impossible de se connecter à Cassandra. Vérifiez que Docker est bien lancé.")
        exit(1)
        
    return cluster, session

def initialiser_base(session):
    print("Création du Keyspace 'ent_db'...")
    session.execute("""
        CREATE KEYSPACE IF NOT EXISTS ent_db 
        WITH replication = {'class':'SimpleStrategy', 'replication_factor':1};
    """)
    
    session.set_keyspace('ent_db')

    print("Création de la table 'utilisateurs'...")
    session.execute("""
        CREATE TABLE IF NOT EXISTS utilisateurs (
            email text PRIMARY KEY,
            nom text,
            prenom text,
            role text,
            mot_de_passe text
        );
    """)

    print("Création de la table 'cours'...")
    session.execute("""
        CREATE TABLE IF NOT EXISTS cours (
            id uuid PRIMARY KEY,
            titre text,
            description text,
            nom_fichier text,
            url text
        );
    """)

    print("Initialisation terminée avec succès !")

if __name__ == "__main__":
    cluster, session = verifier_connexion()
    initialiser_base(session)
    cluster.shutdown()
