-- Création des types pour qualifier les alertes
CREATE TYPE severite_alerte AS ENUM ('INFO', 'WARNING', 'CRITICAL');
CREATE TYPE type_alerte AS ENUM ('PANNE_MOTEUR', 'SURVITESSE', 'SORTIE_ZONE', 'MAINTENANCE_PROCHE', 'ASSIGNATION');

CREATE TABLE evenement (
    id_evenement UUID PRIMARY KEY,
    vehicule_id UUID NOT NULL, -- Référence Logique vers le service Véhicules
    source_service VARCHAR(50) NOT NULL, -- ex: 'SERVICE_LOCALISATION', 'SERVICE_MAINTENANCE'
    type_alerte type_alerte NOT NULL,
    severite severite_alerte DEFAULT 'INFO',
    message TEXT, -- Description détaillée de l'événement
    acquitte BOOLEAN DEFAULT FALSE, -- Pour savoir si l'utilisateur a vu l'alerte
    horodatage TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index pour accélérer la recherche par véhicule ou par sévérité
CREATE INDEX idx_evenement_vehicule ON evenement(vehicule_id);
CREATE INDEX idx_evenement_severite ON evenement(severite);