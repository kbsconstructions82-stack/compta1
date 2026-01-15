-- =====================================================
-- TABLE: TRACKING (Géolocalisation en temps réel)
-- =====================================================
-- Stocke les positions GPS des véhicules/chauffeurs
-- pour le suivi en temps réel sur carte OpenStreetMap

CREATE TABLE IF NOT EXISTS tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    driver_id UUID NOT NULL, -- ID du chauffeur/employé
    vehicle_id UUID, -- ID du véhicule (optionnel)
    latitude DECIMAL(10, 8) NOT NULL, -- Ex: 35.6762
    longitude DECIMAL(11, 8) NOT NULL, -- Ex: 10.0965
    accuracy DECIMAL(10, 2), -- Précision en mètres
    speed DECIMAL(10, 2), -- Vitesse en km/h (optionnel)
    heading DECIMAL(5, 2), -- Direction/cap en degrés (0-360)
    altitude DECIMAL(10, 2), -- Altitude en mètres (optionnel)
    timestamp TIMESTAMP DEFAULT NOW(), -- Horodatage de la position
    battery_level INTEGER, -- Niveau de batterie du téléphone (0-100)
    is_moving BOOLEAN DEFAULT true, -- Le véhicule est-il en mouvement ?
    
    -- Indexes pour optimiser les requêtes
    CONSTRAINT fk_driver FOREIGN KEY (driver_id) REFERENCES employees(id) ON DELETE CASCADE,
    CONSTRAINT fk_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
);

-- Index pour recherches rapides par chauffeur
CREATE INDEX IF NOT EXISTS idx_tracking_driver ON tracking(driver_id, timestamp DESC);

-- Index pour recherches rapides par véhicule
CREATE INDEX IF NOT EXISTS idx_tracking_vehicle ON tracking(vehicle_id, timestamp DESC);

-- Index pour recherches par tenant
CREATE INDEX IF NOT EXISTS idx_tracking_tenant ON tracking(tenant_id, timestamp DESC);

-- Index géospatial pour requêtes par proximité (optionnel, nécessite PostGIS)
-- CREATE INDEX IF NOT EXISTS idx_tracking_location ON tracking USING GIST (ll_to_earth(latitude, longitude));

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE tracking ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs voient uniquement les données de leur tenant
CREATE POLICY tenant_isolation_tracking ON tracking
    FOR ALL
    USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- =====================================================
-- FONCTION: NETTOYER LES ANCIENNES POSITIONS
-- =====================================================
-- Supprime automatiquement les positions de plus de 7 jours
-- pour éviter l'accumulation de données inutiles

CREATE OR REPLACE FUNCTION cleanup_old_tracking()
RETURNS void AS $$
BEGIN
    DELETE FROM tracking
    WHERE timestamp < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Planifier l'exécution quotidienne (à configurer manuellement dans Supabase)
-- SELECT cron.schedule('cleanup-tracking', '0 2 * * *', 'SELECT cleanup_old_tracking()');

-- =====================================================
-- VUE: DERNIÈRES POSITIONS
-- =====================================================
-- Affiche uniquement la position la plus récente par chauffeur

CREATE OR REPLACE VIEW latest_positions AS
SELECT DISTINCT ON (driver_id)
    t.id,
    t.tenant_id,
    t.driver_id,
    t.vehicle_id,
    t.latitude,
    t.longitude,
    t.accuracy,
    t.speed,
    t.heading,
    t.altitude,
    t.timestamp,
    t.battery_level,
    t.is_moving,
    e.full_name AS driver_name,
    v.matricule AS vehicle_matricule
FROM tracking t
LEFT JOIN employees e ON t.driver_id = e.id
LEFT JOIN vehicles v ON t.vehicle_id = v.id
ORDER BY t.driver_id, t.timestamp DESC;

-- =====================================================
-- COMMENTAIRES
-- =====================================================
COMMENT ON TABLE tracking IS 'Stockage des positions GPS en temps réel pour le suivi des véhicules et chauffeurs';
COMMENT ON COLUMN tracking.latitude IS 'Latitude en degrés décimaux (-90 à 90)';
COMMENT ON COLUMN tracking.longitude IS 'Longitude en degrés décimaux (-180 à 180)';
COMMENT ON COLUMN tracking.accuracy IS 'Précision de la position en mètres (plus petit = plus précis)';
COMMENT ON COLUMN tracking.speed IS 'Vitesse instantanée en km/h';
COMMENT ON COLUMN tracking.heading IS 'Direction du déplacement en degrés (0=Nord, 90=Est, 180=Sud, 270=Ouest)';
