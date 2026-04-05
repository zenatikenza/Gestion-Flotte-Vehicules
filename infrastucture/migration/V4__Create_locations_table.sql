-- 1. Création de la table standard
CREATE TABLE position (
    id_position UUID NOT NULL,
    horodatage TIMESTAMPTZ NOT NULL,
    vehicule_id UUID NOT NULL, -- Référence logique vers Service Véhicules
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    vitesse DOUBLE PRECISION,
    PRIMARY KEY (id_position, horodatage)
);

-- 2. Transformation en Hypertable
SELECT create_hypertable('position', 'horodatage');

