# Innov'Events Manager

Application ECF Concepteur Développeur d'Applications : gestion de prospects, clients, événements, devis, avis, tâches, notes et journalisation.

## Stack
- Front web : HTML/CSS/JS
- Back : Node.js / Express
- SQL : MariaDB
- NoSQL : MongoDB pour les logs
- Mobile : React Native / Expo
- Docker : Docker Compose
- CI/CD : GitHub Actions
- Déploiement : Railway

## Lancement local
```bash
cp .env.example .env
docker compose up --build
```
Application : http://localhost:3000

Compte admin de test : `chloe@innovevents.com` / `password`
Compte employé : `jose@innovevents.com` / `password`
Compte client : `client@example.com` / `password`

## Git
Branches obligatoires : `main` production, `dev` développement.
Flux conseillé :
```bash
git checkout -b dev
git add . && git commit -m "Initialisation du projet Docker Node MariaDB MongoDB"
git checkout main
git merge dev
```

## Docker
Le fichier `docker-compose.yml` démarre : backend Express, MariaDB et MongoDB. Les scripts SQL sont montés dans `/docker-entrypoint-initdb.d`.

## Tests
```bash
cd backend
npm install
npm test
```

## Mobile
```bash
cd mobile
npm install
npm run start
```
