## CONTEXTE PRODUIT — Système de Gestion de Flotte (Microservices)

### Stack technique (NE PAS MODIFIER)
- vehicle-service     : Spring Boot 3 / Java / PostgreSQL / port 8081
- conductor-service   : NestJS 10 / TypeScript / TypeORM / port 8082
- maintenance-service : NestJS 10 / TypeScript / TypeORM / port 8083
- localization-service: NestJS 10 / TypeScript / gRPC + PostgreSQL / port 8084
- api-gateway         : NestJS 10 / GraphQL schema-first / port 3000
- Frontend            : React / Leaflet pour les cartes
- Auth                : Keycloak (realm: GestionFlotteM1)
                        Rôles JWT: admin | manager | technicien | utilisateur
                        Côté NestJS  → JwtAuthGuard (jwks-rsa) + RolesGuard (realm_access.roles)
                        Côté Spring  → SecurityConfig oauth2ResourceServer JWT
- Messagerie          : Kafka — KafkaJS (NestJS) / spring-kafka (Java)
- Observabilité       : Jaeger (OpenTelemetry OTLP)

### Tests existants à NE PAS CASSER
- vehicle-service      : 14/14  (JaCoCo 85%)
- conductor-service    : 55/55  (99.42%)
- maintenance-service  : 52/52  (98.61%)
- localization-service : 81/81  (100%)

### Entités clés déjà existantes
- Conducteur      { id, keycloakUserId (= sub JWT), nom, prenom, 
                    numeroPermis, categoriePermis, dateValiditePermis, actif }
- Assignation     { id, vehiculeId, conducteur (FK), dateDepart, 
                    dateRetour, statut (EN_COURS|TERMINEE|ANNULEE) }
- Intervention    { id, vehiculeImmat, technicienId (keycloakUserId), 
                    typeIntervention, datePlanifiee, statut, cout, description }
- Position        { id, vehiculeId, latitude, longitude, vitesse, 
                    enZoneAutorisee, horodatage }
- Vehicle (Java)  { id, licensePlate, brand, model, mileage, 
                    status (AVAILABLE|RESERVED|MAINTENANCE|OUT_OF_SERVICE) }

---

## RÔLES ET FONCTIONNALITÉS ATTENDUES

### 🔑 ADMIN — La Tour de Contrôle
Gère le système et les personnes. Ne s'occupe PAS du planning opérationnel quotidien.

#### Gestion des Utilisateurs (fonctionnalité principale manquante)
- Interface de création de comptes avec formulaire dynamique :
  les champs s'adaptent au rôle choisi :
    * conducteur  → champs supplémentaires : numeroPermis, categoriePermis, 
                    dateValiditePermis (ces données vont aussi dans conductor-service/Postgres)
    * technicien  → champ supplémentaire : spécialité (stocké en attribut Keycloak)
    * manager     → pas de champ supplémentaire
    * admin       → pas de champ supplémentaire
- Création synchronisée (double écriture atomique) :
    1. Créer le compte dans Keycloak via Admin REST API avec mot de passe temporaire
       (requiredActions: ["UPDATE_PASSWORD"] pour forcer le changement à la 1ère connexion)
    2. Si rôle = conducteur : créer aussi l'entité Conducteur dans conductor-service/Postgres
       avec le keycloakUserId retourné par Keycloak
    3. Si l'étape 2 échoue : supprimer le compte Keycloak créé (compensation)
- Actions sur les comptes existants :
    * Activer / Désactiver un compte (PUT enabled: true/false dans Keycloak)
    * Réinitialiser le mot de passe (envoie un mot de passe temporaire)
    * Modifier le rôle

#### Supervision Globale
- Accès en lecture seule à toutes les données 
  (véhicules, conducteurs, maintenances, positions)
- Consultation des logs système (qui a fait quoi, basé sur Jaeger/OpenTelemetry)
- Santé des microservices (appeler les /actuator/health Spring + équivalent NestJS)

#### Statistiques Système (PAS les stats opérationnelles flotte)
- Nombre d'utilisateurs actifs par rôle (depuis Keycloak Admin API)
- Santé des microservices (UP/DOWN)
- Croissance globale de la flotte (nb véhicules créés par semaine/mois)

#### Sidebar Admin
Dashboard | Utilisateurs | Supervision | Statistiques Système

---

### 👔 MANAGER — Le Chef d'Orchestre
Responsable de la disponibilité et de la rentabilité des véhicules.

#### Gestion des Assignations
- Interface pour lier un conducteur à un véhicule
- Vue de toutes les assignations en cours
- Historique global des assignations

#### Pilotage de la Maintenance
- Planification des entretiens réguliers (création d'Intervention)
- Réception et validation des alertes conducteurs 
  (transformer un signalement en ticket Intervention)
- Vue de toutes les interventions (toutes immatriculations)

#### Suivi en Temps Réel
- Carte Leaflet affichant la position GPS de TOUS les véhicules de la flotte
  (appel GET /api/positions depuis localization-service)
- Alertes géofencing visibles sur la carte

#### Statistiques de Performance (stats opérationnelles flotte)
- Taux de disponibilité de la flotte (nb AVAILABLE / nb total)
- Coûts de maintenance agrégés
- Historiques globaux des assignations
- Nombre de véhicules par statut (graphique)

#### Sidebar Manager
Dashboard | Assignations | Maintenance | Localisation | Statistiques Flotte

---

### 🔧 TECHNICIEN — L'Expert Terrain
Interface simplifiée, centrée sur les interventions qui lui sont attribuées.

#### Gestion de ses Tickets uniquement
- Liste des interventions WHERE technicienId = req.user.sub (son keycloakUserId)
- JAMAIS les interventions des autres techniciens

#### Workflow de Réparation
- Mise à jour du statut : PLANIFIEE → EN_COURS → TERMINEE
- Ajout de notes techniques et du coût réel à la clôture

#### Historique Personnel
- Journal de toutes ses interventions passées (statut TERMINEE)
  filtrées par son technicienId

#### Statistiques Techniques Personnelles
- Temps moyen de réparation (MTTR) calculé sur ses propres interventions
- Types de pannes les plus fréquentes dans ses interventions

#### Sidebar Technicien
Dashboard | Mes Interventions | Mon Historique

---

### 🚛 CONDUCTEUR / UTILISATEUR — L'Opérateur
Interface mobile-friendly, centrée sur son véhicule assigné.

#### Mon Véhicule
- Dashboard affichant UNIQUEMENT le véhicule assigné à ce conducteur
  (l'assignation EN_COURS WHERE conducteur.keycloakUserId = req.user.sub)
- Informations : Modèle, Immatriculation, Statut, Kilométrage

#### Localisation en Direct
- Suivi GPS en temps réel de SON propre véhicule uniquement
  (GET /api/positions/:vehiculeId où vehiculeId = son véhicule assigné)
- Carte Leaflet centrée sur sa position

#### Système d'Alerte / Signalement
- Bouton rapide "Signaler un incident"
- Crée un événement Kafka sur le topic system-notifications
  avec { type: 'CONDUCTEUR_ALERTE', vehiculeId, conducteurId, message }
- Le Manager voit cette alerte dans son interface

#### Historique & Stats Personnelles
- Historique de ses assignations passées (statut TERMINEE)
  filtrées par keycloakUserId
- Kilomètres parcourus (agrégation sur ses positions GPS historiques)
- Nombre d'alertes remontées

#### Sidebar Conducteur
Mon Véhicule | Ma Localisation | Signaler | Mon Historique

---

## RÈGLES TECHNIQUES IMPÉRATIVES

### 1. Filtrage strict par keycloakUserId (req.user.sub)
# Conducteur
GET /api/conducteurs/me/assignations
→ WHERE conducteur.keycloakUserId = req.user.sub
→ Jamais exposer les assignations des autres conducteurs

# Technicien  
GET /api/interventions/mes-interventions
→ WHERE technicienId = req.user.sub
→ Jamais exposer les interventions des autres techniciens

# Position conducteur
GET /api/positions/mon-vehicule
→ Récupérer d'abord son assignation EN_COURS pour obtenir le vehiculeId
→ Puis GET /api/positions/:vehiculeId
→ Un conducteur ne peut pas interroger la position d'un autre véhicule

### 2. Protection des routes frontend
- Lecture du rôle depuis le JWT décodé (realm_access.roles[0])
- Redirection automatique si mauvais rôle :
  * /admin/* → rôle admin requis, sinon → /dashboard
  * /manager/* → rôle manager requis, sinon → /dashboard
  * /technicien/* → rôle technicien requis, sinon → /dashboard
  * /conducteur/* → rôle utilisateur requis, sinon → /dashboard
- HOC ou ProtectedRoute React qui vérifie le rôle avant d'afficher

### 3. Double écriture Admin (Keycloak + Postgres)
Lors de la création d'un conducteur par l'Admin :
  Étape 1 : POST keycloak:8080/admin/realms/GestionFlotteM1/users
            → récupérer l'id Keycloak retourné
  Étape 2 : POST conductor-service:8082/api/conducteurs
            { ..., keycloakUserId: <id étape 1> }
  Si étape 2 échoue :
            DELETE keycloak:8080/admin/realms/GestionFlotteM1/users/<id>
            → retourner une erreur à l'Admin

Cette logique de double écriture est dans api-gateway (nouveau resolver createUser).


