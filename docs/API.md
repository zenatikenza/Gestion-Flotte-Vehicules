# API Reference

## Vehicle Service (port 8081)

### REST Endpoints

```bash
# Lister tous les véhicules
GET /api/vehicles
curl http://localhost:8081/api/vehicles

# Créer un véhicule
POST /api/vehicles
curl -X POST http://localhost:8081/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{"licensePlate":"AB-123-CD","brand":"Renault","model":"Clio","mileage":15000}'

# Modifier un véhicule
PUT /api/vehicles/{id}

# Supprimer un véhicule
DELETE /api/vehicles/{id}

# Assigner un conducteur
PUT /api/vehicles/{id}/assign/{conductorId}

# Santé & métriques
GET /actuator/health
GET /actuator/prometheus
```

## Conductor Service (port 8082)

```bash
# Lister les conducteurs
GET /api/conducteurs
curl http://localhost:8082/api/conducteurs

# Créer un conducteur
POST /api/conducteurs
curl -X POST http://localhost:8082/api/conducteurs \
  -H "Content-Type: application/json" \
  -d '{"nom":"Dupont","prenom":"Jean","email":"jean.dupont@fleet.fr","permis":"B"}'

# Signaler une panne
POST /api/conducteurs/{id}/signalement
curl -X POST http://localhost:8082/api/conducteurs/1/signalement \
  -H "Content-Type: application/json" \
  -d '{"description":"Bruit moteur anormal","vehiculeId":"uuid-vehicule"}'
```

## Maintenance Service (port 8083)

```bash
# Lister les interventions
GET /api/interventions
curl http://localhost:8083/api/interventions

# Créer une intervention
POST /api/interventions
curl -X POST http://localhost:8083/api/interventions \
  -H "Content-Type: application/json" \
  -d '{"vehiculeImmat":"AB-123-CD","type":"CORRECTIVE","datePlanifiee":"2026-05-01"}'

# Changer le statut
PATCH /api/interventions/{id}/statut
curl -X PATCH http://localhost:8083/api/interventions/{id}/statut \
  -H "Content-Type: application/json" \
  -d '{"statut":"EN_COURS","technicienId":"uuid-tech"}'

# Assigner un technicien
PUT /api/interventions/{id}/assigner
```

**Statuts possibles :** `SIGNALEE` → `PLANIFIEE` → `EN_COURS` → `TERMINEE` | `ANNULEE`

## Localization Service (port 8084)

```bash
# Position d'un véhicule
GET /api/positions/{vehiculeId}
curl http://localhost:8084/api/positions/{vehiculeId}

# Toutes les positions
GET /api/positions

# Démarrer le simulateur GPS
POST /api/positions/simulateur/vehicules
curl -X POST http://localhost:8084/api/positions/simulateur/vehicules \
  -H "Content-Type: application/json" \
  -d '{"vehiculeId":"uuid"}'

# Arrêter le simulateur
DELETE /api/positions/simulateur/vehicules/{vehiculeId}
```

**gRPC (port 50051) :** service `LocalizationService` avec méthodes `GetPosition`, `StreamPositions`

## API Gateway — GraphQL (port 3000)

```graphql
# Endpoint : http://localhost:3000/graphql

query GetVehicles {
  vehicles {
    id
    licensePlate
    brand
    model
    mileage
    conducteur { nom prenom }
  }
}

query GetInterventions {
  interventions {
    id
    statut
    type
    vehiculeImmat
    technicienId
    datePlanifiee
  }
}

mutation CreateVehicle {
  createVehicle(input: {
    licensePlate: "EF-456-GH"
    brand: "Peugeot"
    model: "308"
    mileage: 5000
  }) {
    id
    licensePlate
  }
}
```
