import os
from cassandra.cluster import Cluster

def get_db_session():
    # En production, l'IP vient des variables d'environnement (DNS Docker 'cassandra')
    cassandra_host = os.getenv("CASSANDRA_HOST", "cassandra")
    cluster = Cluster([cassandra_host], port=9042)
    session = cluster.connect('ent_db')
    return session
