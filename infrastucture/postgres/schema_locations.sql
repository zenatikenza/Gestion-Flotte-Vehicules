CREATE TABLE position (
    id_position UUID NOT NULL,
    horodatage TIMESTAMPTZ NOT NULL,
    vehicule_id UUID NOT NULL, -- Référence Logique
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    vitesse DOUBLE PRECISION,
    PRIMARY KEY (id_position, horodatage)
);

-- Transformation en hypertable (Spécifique TimescaleDB)
SELECT create_hypertable('position', 'horodatage');