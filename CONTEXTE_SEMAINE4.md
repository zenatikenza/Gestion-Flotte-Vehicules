# Contexte Semaine 4 - Gestion de Flotte

## Stack technique utilisée
- **vehicle-service** : Java Spring Boot 3 (port 8081)
- **conductor-service** : Node.js (port 8082)
- **maintenance-service** : Node.js (port 8083)
- **Base de données** : PostgreSQL (une instance par service)
- **Messagerie** : Apache Kafka via opérateur Strimzi
- **Auth** : Keycloak, realm = GestionFlotteM1, rôles = admin/manager/technicien/utilisateur
- **API Gateway** : GraphQL
- **Observabilité** : OpenTelemetry + Jaeger + Prometheus + Grafana + Loki
- **Déploiement** : Docker Compose (local) + Kubernetes (namespace fleet-management) + Helm

## Topics Kafka existants
- vehicle-events (produit par vehicle-service, consommé par events-service)
- driver-events (produit par conductor-service, consommé par events-service)
- maintenance-alerts (produit par maintenance-service, consommé par events-service et vehicle-service)
- location-updates
- system-notifications

## Format des messages Kafka
JSON (pas Avro). Exemple vehicle-events :
{ "event_type": "vehicle_created", "vehicle_id": 1, "license_plate": "AB123CD", "status": "available", "timestamp": "..." }

## Ce qui est fait (semaines 1-3)
- Infrastructure Docker + Kubernetes opérationnelle (namespace fleet-management)
- CI/CD GitHub Actions (build Maven + push Docker Hub)
- Stack observabilité déployée (Jaeger, Prometheus, Grafana, Loki, OpenTelemetry Collector)
- Keycloak configuré (realm GestionFlotteM1, 4 rôles, clients créés pour chaque service)
- vehicle-service : CRUD REST complet, Kafka producer/consumer, GraphQL (allVehicles + addVehicle), tests JUnit5+Mockito+Testcontainers (couverture 85%), OpenTelemetry instrumenté

## Schéma BDD - Service Conducteurs (PostgreSQL)
Table conducteur : id_conducteur (UUID PK), keycloak_user_id (VARCHAR UNIQUE), nom, prenom, numero_permis (VARCHAR UNIQUE), categorie_permis, date_validite_permis (DATE), actif (BOOLEAN)
Table assignation : id_assignation (UUID PK), vehicule_id (UUID ref logique), conducteur_id (UUID FK), date_depart, date_retour, statut (statut_assignation)

## Schéma BDD - Service Maintenance (PostgreSQL)
Table intervention : id_intervention (UUID PK), vehicule_immat (VARCHAR), technicien_id (VARCHAR), type (type_intervention), date_planifiee, date_realisation, statut (statut_intervention), cout (NUMERIC)

## Patterns à respecter (copier le style de vehicle-service)
- Architecture en couches : Controller → Service → Repository → Entity
- Kafka : Producer injecté dans le service, publie à chaque opération CRUD
- Tests : JUnit5 + Mockito (unitaires) + Testcontainers (intégration) + JaCoCo (couverture >80%)
- OpenTelemetry : dépendances micrometer-tracing-bridge-otel + opentelemetry-exporter-otlp
- Logs structurés avec traceId et spanId dans le pattern
- Dockerfile multi-stage (build Maven → JRE runtime, user non-root)
- Kubernetes : Deployment + Service (NodePort) dans namespace fleet-management