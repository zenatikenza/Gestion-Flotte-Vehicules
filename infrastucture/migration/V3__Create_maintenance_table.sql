CREATE TABLE intervention (
    id_intervention UUID PRIMARY KEY,
    vehicule_id UUID NOT NULL, -- Référence logique vers Service Véhicules
    vehicule_immat VARCHAR(20) NOT NULL,
    technicien_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    date_planifiee TIMESTAMPTZ NOT NULL,
    date_realisation TIMESTAMPTZ,
    statut VARCHAR(50),
    cout NUMERIC(10,2)
);