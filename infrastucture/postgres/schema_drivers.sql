CREATE TABLE conducteur (
    id_conducteur UUID PRIMARY KEY,
    keycloak_user_id VARCHAR(255) NOT NULL UNIQUE,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    numero_permis VARCHAR(50) NOT NULL UNIQUE,
    categorie VARCHAR(10)[] NOT NULL, -- Tableau de catégories (A, B, C...)
    date_validite_permis DATE NOT NULL,
    actif BOOLEAN DEFAULT TRUE
);

CREATE TABLE assignation (
    id_assignation UUID PRIMARY KEY,
    vehicule_id UUID NOT NULL, -- Référence Logique
    conducteur_id UUID NOT NULL REFERENCES conducteur(id_conducteur),
    date_depart TIMESTAMPTZ NOT NULL,
    date_retour TIMESTAMPTZ,
    statut VARCHAR(50) -- ex: 'TERMINE', 'EN_COURS'
);