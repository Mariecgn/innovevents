# Déploiement Railway

## Étapes
1. Créer un compte Railway.
2. Connecter le dépôt GitHub.
3. Créer un service Node.js depuis le dossier backend.
4. Ajouter une base MariaDB.
5. Ajouter une base MongoDB ou utiliser MongoDB Atlas.
6. Configurer les variables d'environnement : JWT_SECRET, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, MONGO_URI.
7. Lancer le déploiement.
8. Exécuter les scripts SQL dans la base distante.

## CI/CD
Le workflow GitHub Actions lance les tests à chaque push sur main/dev. Le déploiement production est déclenché après merge sur main via Railway.
