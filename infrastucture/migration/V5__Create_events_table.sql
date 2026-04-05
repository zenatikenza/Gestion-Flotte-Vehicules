CREATE TYPE severite_alerte AS ENUM ('INFO', 'WARNING', 'CRITICAL');

CREATE TABLE evenement (
    id_evenement UUID PRIMARY KEY,
    vehicule_id UUID NOT NULL, -- Référence logique vers Service Véhicules
    source_service VARCHAR(50) NOT NULL,
    type_alerte VARCHAR(100) NOT NULL,
    severite severite_alerte DEFAULT 'INFO',
    acquitte BOOLEAN DEFAULT FALSE,
    horodatage TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);