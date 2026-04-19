# Scénarios de Démonstration

## Prérequis

```bash
docker compose up -d
bash scripts/seed-data.sh   # injecte 5 véhicules + GPS
```

Tous les services sont accessibles sur **http://localhost:5173**

---

## Scénario 1 — Authentification RBAC (3 min)

**Objectif :** Démontrer le contrôle d'accès par rôle.

| Étape | Action | Résultat attendu |
|-------|--------|-----------------|
| 1 | Login `admin_flotte` / `Admin1234!` | Accès à toutes les pages |
| 2 | Logout → Login `technicien_flotte` / `Tech1234!` | Accès limité aux interventions |
| 3 | Tenter d'accéder à `/vehicles` | Page "Accès Refusé" affichée |

**Résultat attendu :** RBAC 4 rôles validé ✓

---

## Scénario 2 — Gestion de flotte (5 min)

**Objectif :** Démontrer le cycle de vie véhicule/conducteur.

| Étape | Action |
|-------|--------|
| 1 | Login `manager_flotte` / `Manager1234!` |
| 2 | Menu Véhicules → Créer : BMW X5, plaque `ABC-123`, 5000 km |
| 3 | Menu Conducteurs → Créer : Jean Dupont, email jean@fleet.fr |
| 4 | Véhicule → Assigner → sélectionner Jean Dupont |
| 5 | Menu Localisation → voir marqueur GPS du véhicule ABC-123 |

**Résultat attendu :** Véhicule visible sur la carte avec position GPS ✓

---

## Scénario 3 — Flux maintenance complet (5 min)

**Objectif :** Traçabilité complète conducteur → manager → technicien.

| Étape | Rôle | Action |
|-------|------|--------|
| 1 | `utilisateur_flotte` / `User1234!` | Signaler panne : "Bruit moteur anormal" |
| 2 | `manager_flotte` / `Manager1234!` | Voir alerte SIGNALEE dans le tableau de bord |
| 3 | Manager | Planifier → assigner `technicien_flotte`, coût estimé 500€ |
| 4 | `technicien_flotte` / `Tech1234!` | Voir l'intervention assignée |
| 5 | Technicien | Démarrer → statut passe à EN_COURS |
| 6 | Technicien | Terminer avec rapport → statut TERMINEE |
| 7 | `manager_flotte` | Voir "Traité par technicien_flotte" avec date de résolution |

**Résultat attendu :** Traçabilité complète de la panne, notification Kafka envoyée ✓

---

## Scénario 4 — Observabilité (3 min)

**Objectif :** Démontrer la corrélation Loki↔Jaeger et les métriques.

| Étape | URL | Ce qu'on montre |
|-------|-----|-----------------|
| 1 | http://localhost:16686 | Traces Jaeger : service=maintenance-service, spans distribués |
| 2 | http://localhost:3001 | Grafana Fleet Management : tous les panels actifs |
| 3 | http://localhost:9090/alerts | Prometheus : 4 règles d'alerte (état inactive = services UP) |
| 4 | Grafana → Explore → Loki | Logs HTTP avec `traceId` → clic → ouvre la trace Jaeger |

**Commande de test :**
```bash
curl http://localhost:8083/api/interventions
# Vérifier dans Grafana Loki : "traceId":"<valeur non-null>"
# Cliquer sur le lien → même trace dans Jaeger
```

**Résultat attendu :** Corrélation Loki↔Jaeger fonctionnelle ✓

---

## Scénario 5 — Tests de charge (2 min)

```bash
# Smoke test : validation basique
k6 run k6/smoke-test.js

# Load test : 10 utilisateurs simultanés
k6 run k6/load-test.js
```

**Résultats obtenus :**

| Test | VUs | Durée | p(95) | Taux d'erreur |
|------|-----|-------|-------|---------------|
| Smoke | 1 | 1 min | 362 ms ✓ | 0.00% ✓ |
| Load | 10 | 5 min | 672 ms ✓ | 0.00% ✓ |
