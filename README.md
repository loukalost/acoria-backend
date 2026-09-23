# Acoria Backend

API backend de l'application Acoria, construite avec NestJS. Elle centralise l'authentification, la gestion des couples, le chat temps réel, les activités, les notes et les statistiques, derrière un unique gateway sécurisé par JWT.

## Sommaire

- [Architecture](#architecture)
- [Stack technique](#stack-technique)
- [Prérequis](#prérequis)
- [Lancer le projet en local](#lancer-le-projet-en-local)
- [Variables d'environnement](#variables-denvironnement)
- [Base de données](#base-de-données)
- [Tests](#tests)
- [Déploiement](#déploiement)
- [Contribuer](#contribuer)
- [Ressources](#ressources)
- [Roadmap](#roadmap)

## Architecture

```mermaid
flowchart TD
    Mobile[App mobile React Native] -->|HTTP / WebSocket| Gateway
    Backoffice[Backoffice Next.js] -->|HTTP| Gateway

    subgraph API["acoria-backend (NestJS)"]
        Gateway[API Gateway<br/>Auth JWT, rôles, rate limiting]
        Gateway --> Auth[Module Auth]
        Gateway --> Chat[Module Chat]
        Gateway --> Activites[Module Activités]
        Gateway --> Notes[Module Notes]
        Gateway --> Stats[Module Stats]
        Gateway --> Therapeute[Module Thérapeute]
    end

    Auth --> DB[(PostgreSQL)]
    Chat --> DB
    Activites --> DB
    Notes --> DB
    Stats --> DB
    Therapeute --> DB
```

Le gateway centralise l'authentification JWT, le contrôle des rôles (patient / thérapeute) et le rate limiting avant que la moindre requête n'atteigne un module métier.

## Stack technique

| Composant        | Choix                                   |
| ---------------- | --------------------------------------- |
| Framework        | NestJS 11                               |
| Langage          | TypeScript                              |
| ORM              | Prisma (adapter `pg`)                   |
| Base de données  | PostgreSQL                              |
| Authentification | Passport + JWT (access / refresh token) |
| Validation       | class-validator / class-transformer     |
| Tests            | Jest                                    |

## Prérequis

- Node.js 20 ou supérieur
- npm
- Une instance PostgreSQL accessible (locale ou distante)

## Lancer le projet en local

```bash
# 1. Cloner le repo
git clone https://github.com/loukalost/acoria-backend.git
cd acoria-backend

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# puis renseigner les valeurs, voir la section ci-dessous

# 4. Appliquer les migrations Prisma
npx prisma migrate dev

# 5. Lancer le serveur en mode watch
npm run start:dev
```

L'API est disponible sur `http://localhost:3001` par défaut.

## Variables d'environnement

| Variable                 | Description                            | Exemple                                                          |
| ------------------------ | -------------------------------------- | ---------------------------------------------------------------- |
| `DATABASE_URL`           | Chaîne de connexion PostgreSQL         | `postgresql://user:password@localhost:5432/dbname?schema=public` |
| `PORT`                   | Port d'écoute de l'API                 | `3001`                                                           |
| `JWT_ACCESS_SECRET`      | Secret de signature des access tokens  | à générer, jamais commité                                        |
| `JWT_REFRESH_SECRET`     | Secret de signature des refresh tokens | à générer, jamais commité                                        |
| `JWT_ACCESS_EXPIRES_IN`  | Durée de vie de l'access token         | `15m`                                                            |
| `JWT_REFRESH_EXPIRES_IN` | Durée de vie du refresh token          | `7d`                                                             |

Un fichier `.env.example` est fourni comme référence. Le fichier `.env` réel ne doit jamais être commité.

## Base de données

Le schéma est géré via Prisma :

```bash
# Créer une nouvelle migration après modification du schema.prisma
npx prisma migrate dev --name <nom_de_la_migration>

# Régénérer le client Prisma
npx prisma generate

# Explorer la base en local
npx prisma studio
```

## Tests

```bash
npm run test        # tests unitaires
npm run test:watch  # mode watch
npm run test:cov    # avec couverture
npm run test:e2e    # tests end-to-end
```

## Déploiement

Le déploiement est automatisé via GitHub Actions (`.github/workflows/main.yml`), déclenché à chaque push :

```
[Push] → [Security Check] + [Tests] → [Build & Push image Docker] → [Deploy to Server]
```

- **Security Check** : analyse de sécurité du code et des dépendances
- **Tests** : exécution de la suite Jest
- **Build & Push Docker** : construction de l'image et publication sur le registre
- **Deploy to Server** : déploiement sur le serveur de production (Scaleway)

Aucune action manuelle n'est requise pour déployer en production, un merge sur la branche principale déclenche le pipeline complet.

## Contribuer

```bash
npm run lint    # ESLint avec correction automatique
npm run format  # Prettier sur src/ et test/
```

- Créer une branche par fonctionnalité ou correctif
- Ouvrir une pull request vers la branche principale
- S'assurer que le lint et les tests passent avant de merger

## Ressources

- Backoffice thérapeute : dépôt [`acoria-backoffice`](https://github.com/loukalost/acoria-backoffice)
- Registre d'images Docker : GitHub Container Registry, image `ghcr.io/loukalost/acoria-backend:latest` ([page du package](https://github.com/loukalost/acoria-backend/pkgs/container/acoria-backend))
- Pipeline CI/CD : [GitHub Actions](https://github.com/loukalost/acoria-backend/actions)
- Qualité du code : analyse SonarQube (projet `loukalost_acoria-backend_4cc1c111-8758-49fb-894e-d0643dc8c518`)
- Sécurité des dépendances : analyse Snyk, lancée à chaque push
- Dashboard de monitoring : _à compléter (aucun outil de monitoring en place pour l'instant)_

## Roadmap

- [ ] Documentation Swagger de l'API (OpenAPI)
- [ ] `docker-compose.yml` versionné pour l'environnement de développement local
- [ ] ADR sur les choix structurants (NestJS, Prisma, PostgreSQL, Scaleway)
