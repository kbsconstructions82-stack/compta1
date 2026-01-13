-- ==========================================
-- Script pour corriger le problème RLS avec les tenants
-- ==========================================
-- Ce script résout le problème de sécurité RLS qui empêche la création de tenants.
-- À exécuter dans Supabase SQL Editor (en tant qu'administrateur/service_role)
-- ==========================================

-- Méthode 1: Désactiver temporairement RLS, créer le tenant, puis réactiver RLS
-- (Recommandé pour une solution rapide)

-- Étape 1: Désactiver RLS temporairement
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;

-- Étape 2: Créer le tenant par défaut s'il n'existe pas
INSERT INTO tenants (name)
SELECT 'Tenant Principal'
WHERE NOT EXISTS (SELECT 1 FROM tenants);

-- Étape 3: Réactiver RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Étape 4: Vérifier que le tenant a été créé
SELECT id, name, created_at FROM tenants;

-- ==========================================
-- Méthode 2: Créer une politique plus permissive
-- (Alternative si vous voulez garder RLS activé)
-- ==========================================

-- Supprimer l'ancienne politique si elle existe
DROP POLICY IF EXISTS "Enable all for auth users" ON tenants;
DROP POLICY IF EXISTS "Allow service role" ON tenants;
DROP POLICY IF EXISTS "Allow anon for tenants" ON tenants;

-- Créer une politique qui permet l'accès même sans authentification Supabase
-- (Utile pour le mode développement avec admin/admin)
CREATE POLICY "Allow service role and anon" ON tenants
    FOR ALL
    USING (
        auth.role() = 'authenticated' OR 
        auth.role() = 'service_role' OR
        auth.role() = 'anon'
    )
    WITH CHECK (
        auth.role() = 'authenticated' OR 
        auth.role() = 'service_role' OR
        auth.role() = 'anon'
    );

-- Créer le tenant si nécessaire (maintenant que RLS permet l'insertion)
INSERT INTO tenants (name)
SELECT 'Tenant Principal'
WHERE NOT EXISTS (SELECT 1 FROM tenants);

-- ==========================================
-- Méthode 3: Utiliser service_role (si vous avez accès)
-- ==========================================
-- Si vous utilisez le client Supabase avec service_role key,
-- vous pouvez créer le tenant directement sans problème de RLS.
-- Le service_role bypass RLS automatiquement.
