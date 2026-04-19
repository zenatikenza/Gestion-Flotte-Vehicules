# Tests

## Tests unitaires par service

```bash
# vehicle-service (Spring Boot)
cd vehicle-service && ./mvnw test

# conductor-service (NestJS)
cd conductor-service && npm test

# maintenance-service (NestJS)
cd maintenance-service && npm test

# localization-service (NestJS)
cd localization-service && npm test

# api-gateway (NestJS)
cd api-gateway && npm test
```

## Tests E2E Cypress (28/28 ✅)

```bash
# Depuis le répertoire fleet-frontend
cd fleet-frontend

# Mode interactif
npx cypress open

# Mode headless (CI)
npx cypress run
```

**Couverture des tests :**
- Authentification (login/logout, RBAC 4 rôles)
- CRUD véhicules (créer, modifier, supprimer)
- CRUD conducteurs
- Flux signalement → planification → résolution
- Localisation GPS (carte, simulateur)
- Dashboard manager (toutes les vues)

## Tests de charge K6

### Smoke test (validation rapide)
```bash
k6 run k6/smoke-test.js
# 1 VU, 1 minute
# Seuils : p(95) < 500ms, erreurs < 1%
```

**Résultats obtenus :**
```
http_req_duration : avg=108ms  p(95)=362ms ✓ (< 500ms)
http_req_failed   : 0.00%      ✓ (< 1%)
http_reqs         : 184        3.04 req/s
checks_succeeded  : 100%       184/184
```

### Load test (charge nominale)
```bash
k6 run k6/load-test.js
# 10 VUs, 5 minutes
# Seuils : p(95) < 1000ms, erreurs < 5%
```

### Stress test (charge extrême)
```bash
k6 run k6/stress-test.js
# Montée progressive : 0→10 VUs (2min), 10→30 (3min), 30→0 (2min)
# Seuils : p(95) < 2000ms, erreurs < 10%
```

### Scénario workflow complet
```bash
k6 run k6/scenarios/full-workflow.js
# 5 VUs, 2 minutes
# Simule : GET vehicles → GET conducteurs → GET interventions → GET position GPS
```
