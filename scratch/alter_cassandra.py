from cassandra.cluster import Cluster

def alter_table():
    try:
        cluster = Cluster(['127.0.0.1'], port=9042)
        session = cluster.connect('ent_db')
        print("Connexion à Cassandra réussie.")
        session.execute("ALTER TABLE utilisateurs ADD mot_de_passe text;")
        print("✓ Colonne 'mot_de_passe' ajoutée avec succès.")
        cluster.shutdown()
    except Exception as e:
        print(f"Erreur : {e}")

if __name__ == "__main__":
    alter_table()
