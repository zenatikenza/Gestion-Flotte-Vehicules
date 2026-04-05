-- Création des types énumérés
CREATE TYPE statut_vehicule AS ENUM ('DISPONIBLE', 'RESERVÉ', 'EN_MISSION', 'MAINTENANCE');

CREATE TABLE vehicule (
    id_vehicule UUID PRIMARY KEY,
    immatriculation VARCHAR(20) NOT NULL UNIQUE,
    marque VARCHAR(100) NOT NULL,
    modele VARCHAR(100) NOT NULL,
    annee SMALLINT,
    statut statut_vehicule DEFAULT 'DISPONIBLE',
    kilometrage INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);