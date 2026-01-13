-- ==========================================
-- Script complet de création de la table TENANTS
-- avec configuration RLS (Row Level Security)
-- ==========================================
-- Ce script recrée la table tenants depuis zéro avec une configuration
-- RLS appropriée qui fonctionne avec le mode développement (admin/admin)
-- et le mode production (authentification Supabase)
-- ==========================================

-- 0. Créer l'extension UUID si elle n'existe pas déjà (nécessaire pour uuid_generate_v4())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Supprimer la table si elle existe déjà (avec toutes ses dépendances)
DROP TABLE IF EXISTS tenants CASCADE;

-- 2. Créer la table tenants
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Activer RLS (Row Level Security)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- 4. Supprimer toutes les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Enable all for auth users" ON tenants;
DROP POLICY IF EXISTS "Allow service role and anon" ON tenants;
DROP POLICY IF EXISTS "Allow public read" ON tenants;
DROP POLICY IF EXISTS "Allow public insert" ON tenants;
DROP POLICY IF EXISTS "Allow all operations" ON tenants;

-- 5. Créer des politiques RLS permissives pour le mode développement
-- Ces politiques permettent l'accès même sans authentification Supabase
-- (utile pour le mode développement avec admin/admin)

-- Politique 1: Permettre la lecture à tous (authentifiés ou non)
CREATE POLICY "Allow public read" ON tenants
    FOR SELECT
    USING (true); -- Permet la lecture à tout le monde

-- Politique 2: Permettre l'insertion à tous (authentifiés ou non)
-- Ceci permet de créer des tenants même sans authentification Supabase
CREATE POLICY "Allow public insert" ON tenants
    FOR INSERT
    WITH CHECK (true); -- Permet l'insertion à tout le monde

-- Politique 3: Permettre la mise à jour à tous
CREATE POLICY "Allow public update" ON tenants
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Politique 4: Permettre la suppression à tous
CREATE POLICY "Allow public delete" ON tenants
    FOR DELETE
    USING (true);

-- 6. Alternative: Une seule politique pour TOUT autoriser (plus simple)
-- Si les 4 politiques ci-dessus ne fonctionnent pas, utilisez cette alternative:
-- Décommentez le bloc ci-dessous et commentez les 4 politiques au-dessus
/*
-- Supprimer les 4 politiques individuelles
DROP POLICY IF EXISTS "Allow public read" ON tenants;
DROP POLICY IF EXISTS "Allow public insert" ON tenants;
DROP POLICY IF EXISTS "Allow public update" ON tenants;
DROP POLICY IF EXISTS "Allow public delete" ON tenants;

-- Créer une politique unique pour tout
CREATE POLICY "Allow all operations" ON tenants
    FOR ALL
    USING (true)
    WITH CHECK (true);
*/

-- 7. Créer un tenant par défaut
INSERT INTO tenants (name, created_at)
VALUES ('Tenant Principal', NOW());

-- 8. Vérifier que tout fonctionne
SELECT 
    id, 
    name, 
    created_at,
    '✅ Table créée avec succès!' as status
FROM tenants;

-- ==========================================
-- VÉRIFICATIONS
-- ==========================================
-- Pour vérifier que RLS est bien activé:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'tenants';
-- Doit retourner: rowsecurity = true

-- Pour voir toutes les politiques sur la table tenants:
-- SELECT * FROM pg_policies WHERE tablename = 'tenants';

-- ==========================================
-- NOTES IMPORTANTES
-- ==========================================
-- ⚠️ Ces politiques RLS sont PERMISSIVES (permettent tout à tout le monde)
-- C'est adapté pour:
--   - Mode développement
--   - Applications internes
--   - Quand vous gérez la sécurité au niveau applicatif
--
-- Pour une sécurité plus stricte en production, modifiez les politiques pour:
--   1. Restreindre l'insertion aux utilisateurs authentifiés:
--      USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
--   2. Restreindre la lecture aux utilisateurs authentifiés
--   3. Utiliser des politiques basées sur tenant_id pour l'isolation multi-tenant
--
-- ==========================================
