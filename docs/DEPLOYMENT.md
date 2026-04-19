# Déploiement

## Docker Compose (développement)

```bash
# Démarrer tous les services
docker compose up -d

# Voir les logs d'un service
docker logs gestion_flotte-maintenance-service-1 -f

# Rebuilder un service après modification
docker compose up --build -d maintenance-service

# Arrêter tous les services
docker compose down

# Arrêter et supprimer les volumes
docker compose down -v
```

**Services démarrés :** postgres, kafka, zookeeper, jaeger, keycloak, vehicle-service, conductor-service, maintenance-service, localization-service, api-gateway, fleet-frontend, prometheus, alertmanager, grafana, loki, promtail

## Kubernetes + Helm (production)

### Prérequis
- Kubernetes 1.25+
- Helm 3.x
- kubectl configuré

### Installation

```bash
# Vérifier le chart
helm lint helm/fleet-management/

# Générer les manifestes (dry-run)
helm template fleet-management helm/fleet-management/

# Déployer en dev
helm install fleet-management helm/fleet-management/ \
  -f helm/fleet-management/values-dev.yaml \
  --namespace fleet-management --create-namespace

# Déployer en prod
helm install fleet-management helm/fleet-management/ \
  -f helm/fleet-management/values-prod.yaml \
  --namespace fleet-management --create-namespace

# Mettre à jour
helm upgrade fleet-management helm/fleet-management/ \
  -f helm/fleet-management/values-prod.yaml

# Désinstaller
helm uninstall fleet-management
```

### Différences dev vs prod

| Paramètre | Dev | Prod |
|-----------|-----|------|
| replicaCount | 1 | 2 |
| autoscaling | désactivé | activé (2-5 replicas) |
| memory request | 256Mi | 512Mi |
| image.pullPolicy | IfNotPresent | Always |
| Ingress | désactivé | activé + TLS |

## Variables d'environnement

| Variable | Service | Description |
|----------|---------|-------------|
| `SPRING_DATASOURCE_URL` | vehicle-service | URL PostgreSQL |
| `MANAGEMENT_OTLP_TRACING_ENDPOINT` | vehicle-service | Endpoint Jaeger OTLP |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | NestJS services | Endpoint Jaeger OTLP |
| `KAFKA_BROKERS` | Tous | Adresse broker Kafka |
| `KEYCLOAK_URL` | Tous | URL Keycloak |
| `KEYCLOAK_REALM` | Tous | Realm Keycloak |
| `DB_HOST/DB_PORT/DB_NAME` | NestJS services | Config PostgreSQL |
