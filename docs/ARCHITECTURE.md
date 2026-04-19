# Architecture — Système de Gestion de Flotte

## Vue d'ensemble

Architecture microservices déployée via Docker Compose (dev) et Helm/Kubernetes (prod).

## Services

| Service | Technologie | Port | Rôle |
|---------|-------------|------|------|
| vehicle-service | Spring Boot 3 + JPA | 8081 | CRUD véhicules, métriques JVM |
| conductor-service | NestJS + TypeORM | 8082 | CRUD conducteurs, assignation |
| maintenance-service | NestJS + TypeORM | 8083 | Interventions, signalements |
| localization-service | NestJS + gRPC | 8084/50051 | GPS, géofencing 50km Paris |
| api-gateway | NestJS GraphQL | 3000 | Fédération, auth JWT |
| fleet-frontend | React 18 + Vite | 5173 | Interface utilisateur |

## Flux Kafka

**Topics et flux de messages :**

```
conducteur → [signalement-panne] → maintenance-service
                                        ↓
manager   → [planifier-intervention] → maintenance-service
                                        ↓
technicien → [mise-a-jour-statut] → maintenance-service
                                        ↓
          → [intervention-terminee] → conductor-service (notification)

localization-service → [position-update] → api-gateway (WebSocket)
localization-service → [geofencing-alert] → conductor-service
```

**Producteurs :**
- conductor-service : `signalement-panne`, `affectation-vehicule`
- maintenance-service : `intervention-creee`, `intervention-mise-a-jour`
- localization-service : `position-gps`, `alerte-geofencing`

**Consommateurs :**
- maintenance-service : `signalement-panne`
- conductor-service : `intervention-terminee`, `alerte-geofencing`
- api-gateway : `position-gps` (relay WebSocket)

## Flux authentification Keycloak

```
[Frontend] → Login → [Keycloak:8080]
                          ↓ JWT (access_token)
[Frontend] → Authorization: Bearer <token> → [api-gateway]
                                                    ↓ vérification JWKS
                                              [vehicle/conductor/...]
```

**Realm :** `FleetManagement`  
**4 rôles RBAC :**
- `ADMIN_FLOTTE` : accès total
- `MANAGER_FLOTTE` : gestion véhicules, conducteurs, planning
- `TECHNICIEN_FLOTTE` : interventions uniquement
- `UTILISATEUR_FLOTTE` : signalement, consultation

## Décisions architecturales (ADR)

| # | Décision | Raison |
|---|----------|--------|
| 001 | NestJS pour services métier | TypeScript, DI natif, OpenTelemetry facile |
| 002 | Spring Boot pour vehicle-service | Démonstration polyglotte, métriques JVM |
| 003 | GraphQL sur api-gateway | Agrégation flexible, évite sur-fetching |
| 004 | gRPC pour localization | Performance pour données GPS haute fréquence |
| 005 | Kafka pour événements async | Découplage signalement→maintenance |
| 006 | Keycloak SSO | Standards OAuth2/OIDC, RBAC centralisé |
| 007 | PostgreSQL par service | Isolation base de données (DB per service) |
| 008 | OpenTelemetry SDK | Standard industrie, vendor-neutral |
| 009 | Jaeger pour traces | Open-source, compatible OTLP |
| 010 | Loki pour logs | Intégration native Grafana, faible coût |
| 011 | Helm pour déploiement K8s | Templating, gestion multi-env dev/prod |

## Observabilité

```
Services → OTLP → [Jaeger] (traces distribuées)
Services → /metrics → [Prometheus] (métriques)
Services → stdout JSON → [Promtail] → [Loki] (logs)
[Loki] ←→ [Grafana] (dashboards + corrélation traceId)
[Prometheus] → [Alertmanager] (alertes ServiceDown/HighLatency)
```

**Corrélation Loki↔Jaeger :** chaque log JSON contient `"traceId"` extrait via `trace.getActiveSpan()` de l'API OpenTelemetry. Le Derived Field Grafana crée un lien cliquable vers la trace Jaeger correspondante.
