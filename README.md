# Système de Gestion de Flotte — Microservices

![Tests Cypress](https://img.shields.io/badge/Tests%20Cypress-28%2F28%20%E2%9C%85-brightgreen)
![Services](https://img.shields.io/badge/Services-6%20microservices-blue)
![Stack](https://img.shields.io/badge/Stack-Spring%20Boot%20%2B%20NestJS%20%2B%20React-orange)

Projet Master GIL Rouen — Architecture microservices pour la gestion d'une flotte de véhicules avec authentification SSO (Keycloak), messagerie Kafka, observabilité complète (Jaeger + Prometheus + Grafana + Loki) et tests de charge (K6).

## Architecture

```
[fleet-frontend:5173]
        ↓ GraphQL/REST
[api-gateway:3000]
  ↙      ↓      ↘      ↘
[8081]  [8082]  [8083]  [8084]
vehicle conductor maint  local
  ↓       ↓       ↓      ↓
       [PostgreSQL:5432]
              ↕
         [Kafka:9092]
              ↕
      [Keycloak:8080] (SSO)

Observabilité :
  [Jaeger:16686]      ← traces OTLP
  [Prometheus:9090]   ← métriques
  [Grafana:3001]      ← dashboards
  [Loki:3100]         ← logs
  [Alertmanager:9093] ← alertes
```

## Prérequis

- Docker Desktop 4.x+
- Docker Compose v2
- (optionnel) k6 pour les tests de charge
- (optionnel) Helm 3 pour le déploiement Kubernetes

## Démarrage rapide

```bash
# 1. Cloner le projet
git clone <repo-url> && cd Gestion_flotte

# 2. Démarrer tous les services
docker compose up -d

# 3. Injecter des données de démo
bash scripts/seed-data.sh
```

L'interface est disponible sur **http://127.0.0.1:5173**

> **Windows** : utiliser `127.0.0.1` plutôt que `localhost` (conflit IPv6/WSL2).

## Comptes de test

| Rôle | Login | Mot de passe |
|------|-------|--------------|
| Admin | `admin_flotte` | `Admin1234!` |
| Manager | `manager_flotte` | `Manager1234!` |
| Technicien | `technicien_flotte` | `Tech1234!` |
| Utilisateur | `utilisateur_flotte` | `User1234!` |

## URLs des services

| Service | URL |
|---------|-----|
| Frontend | http://127.0.0.1:5173 |
| API Gateway (GraphQL) | http://127.0.0.1:3000/graphql |
| Vehicle Service | http://127.0.0.1:8081/api/vehicles |
| Conductor Service | http://127.0.0.1:8082/api/conducteurs |
| Maintenance Service | http://127.0.0.1:8083/api/interventions |
| Localization Service | http://127.0.0.1:8084/api/positions |
| Keycloak | http://127.0.0.1:8080 |
| Jaeger | http://127.0.0.1:16686 |
| Prometheus | http://127.0.0.1:9090 |
| Grafana | http://127.0.0.1:3001 |
| Alertmanager | http://127.0.0.1:9093 |

## Lancer les tests

```bash
# Tests E2E Cypress (28 tests)
cd fleet-frontend && npx cypress run

# Tests de charge K6
k6 run k6/smoke-test.js              # 1 VU, 1 min
k6 run k6/load-test.js               # 10 VUs, 5 min
k6 run k6/stress-test.js             # montée progressive 0→30 VUs
k6 run k6/scenarios/full-workflow.js # flux complet
```
