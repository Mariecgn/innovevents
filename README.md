# Innov'Events Manager

Application fullstack de gestion événementielle.

L’application permet :
- la gestion des prospects et clients,
- la gestion des événements,
- la génération de devis PDF,
- la journalisation des actions utilisateurs,
- l’authentification JWT,
- un accès mobile React Native / Expo.

---

# Stack technique

## Frontend web
- HTML5
- CSS3
- JavaScript Vanilla

## Backend
- Node.js
- Express.js

## Bases de données
- MariaDB (données métier)
- MongoDB (logs et audit)

## Mobile
- React Native
- Expo

## Infrastructure
- Docker
- Docker Compose

## Outils
- Git / GitHub
- Jest
- Supertest

---

# Installation du projet

## Cloner le projet

```bash
git clone https://github.com/VOTRE-USERNAME/innovevents.git
cd innovevents
```
# Installation Docker
## Vérifier Docker
```bash
docker --version
docker compose version
```
# Lancement des conteneurs
```bash
docker compose up --build
```
Conteneurs lancés : 
- backend Express
- Mariadb
- MongoDB
# Vérfication des conteneurs
```bash
docker ps
 ```
Résultat attendu :

- innovevents_backend
- innovevents_mariadb
- innovevents_mongo

# Frontend Web
Application disponible sur :
```bash
http://localhost:3000
```
# Test Backend
Lancer les tests :
```
docker compose exec backend npm test
```
Résultat attendu : 
```
PASS tests/health.test.js
```
# Test API Health
```
Invoke-RestMethod -Uri "http://localhost:3000/api/health"
```
# Création d’un prospect via PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/prospects" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{
    "company_name":"Demo Company",
    "firstname":"Marie",
    "lastname":"Test",
    "email":"marie@test.com",
    "phone":"0600000000",
    "location":"Paris",
    "event_type":"Séminaire",
    "desired_date":"2026-06-20",
    "estimated_participants":50,
    "need_description":"Besoin test pour vérifier la BDD"
  }'
```
# Vérification MariaDB
```
docker compose exec mariadb mariadb -u innovevents -pinnovevents innovevents
```
Puis :
```sql
SELECT * FROM prospects;
SELECT * FROM users;
SELECT * FROM clients;
```
# Vérification MongoDB
```
docker compose exec mongo mongosh innovevents_logs --eval "db.logs.find().pretty()"
```
Logs visibles :

- ECHEC_CONNEXION
- CONNEXION_REUSSIE
# Authentification
## Création de compte
```
POST /api/auth/register
```
## Connexion
```
POST /api/auth/login
```
JWT utilisé pour sécuriser les routes administrateur.

# Mobile React Native
L’application mobile reprend le site web : mêmes couleurs (charte graphique), mêmes pages, mêmes fonctionnalités, et la même API Express.

- pages publiques : accueil, événements (filtres), avis, contact, demande de devis, mentions légales, CGU / CGV ;
- compte : inscription et connexion (JWT, conservé en mémoire uniquement) ;
- espace administrateur : prospects (conversion en client, refus), clients, devis (création, PDF, envoi), messages reçus ;
- espace employé : événements et clients ;
- espace client : messagerie et devis (PDF, acceptation, demande de modification, refus).

## Installation
```
cd mobile
npm install
```
## Lancement dans le navigateur
```
npx expo start --web --clear
```
Application disponible sur :
> http://localhost:8081

## Lancement sur téléphone (Expo Go)
```
npx expo start
```
Scanner le QR code avec Expo Go (SDK 54). Le PC et le téléphone doivent être sur le même Wi-Fi, et le backend doit tourner sur le port 3000 du PC.

L’adresse de l’API est déduite de celle du serveur Expo. Pour la forcer :
```
$env:EXPO_PUBLIC_API_URL = "http://192.168.1.16:3000/api"
npx expo start
```
Le PDF d’un devis s’ouvre dans le navigateur du téléphone grâce à un lien signé valable 2 minutes (`POST /api/quotes/:id/pdf-link`).

# GitHub
Initialisation Git : 
```
git init
git add .
git commit -m "Initial commit"
```
Push Github :
```
git remote add origin https://github.com/VOTRE-USERNAME/innovevents.git
git branch -M main
git push -u origin main
```
# Captures
Les captures du projet sont disponibles dans le dossier :
> /captures
