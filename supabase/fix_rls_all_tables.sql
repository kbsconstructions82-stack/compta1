-- ==========================================
-- Script pour corriger RLS sur TOUTES les tables
-- ==========================================
-- Ce script met à jour les politiques RLS pour permettre l'accès
-- même sans authentification Supabase (mode développement admin/admin)
-- ==========================================

-- Liste des tables concernées
-- tenants, user_profiles, companies, vehicles, employees, missions, 
-- expenses, invoices, trip_rates, daily_activities, driver_activities

-- ==========================================
-- 1. TABLE: VEHICLES (Problème actuel - PRIORITÉ)
-- ==========================================

-- Supprimer l'ancienne politique restrictive
DROP POLICY IF EXISTS "Enable all for auth users" ON vehicles;
DROP POLICY IF EXISTS "Allow all operations" ON vehicles;

-- Créer une politique permissive pour vehicles
-- Cette politique permet l'accès même sans authentification Supabase
CREATE POLICY "Allow all operations" ON vehicles
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==========================================
-- 2. TABLE: COMPANIES
-- ==========================================

DROP POLICY IF EXISTS "Enable all for auth users" ON companies;
CREATE POLICY "Allow all operations" ON companies
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==========================================
-- 3. TABLE: EMPLOYEES
-- ==========================================

DROP POLICY IF EXISTS "Enable all for auth users" ON employees;
CREATE POLICY "Allow all operations" ON employees
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==========================================
-- 4. TABLE: MISSIONS
-- ==========================================

DROP POLICY IF EXISTS "Enable all for auth users" ON missions;
CREATE POLICY "Allow all operations" ON missions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==========================================
-- 5. TABLE: EXPENSES
-- ==========================================

DROP POLICY IF EXISTS "Enable all for auth users" ON expenses;
CREATE POLICY "Allow all operations" ON expenses
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==========================================
-- 6. TABLE: INVOICES
-- ==========================================

DROP POLICY IF EXISTS "Enable all for auth users" ON invoices;
CREATE POLICY "Allow all operations" ON invoices
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==========================================
-- 7. TABLE: TRIP_RATES
-- ==========================================

DROP POLICY IF EXISTS "Enable all for auth users" ON trip_rates;
CREATE POLICY "Allow all operations" ON trip_rates
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==========================================
-- 8. TABLE: DAILY_ACTIVITIES
-- ==========================================

DROP POLICY IF EXISTS "Enable all for auth users" ON daily_activities;
CREATE POLICY "Allow all operations" ON daily_activities
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==========================================
-- 9. TABLE: DRIVER_ACTIVITIES
-- ==========================================

DROP POLICY IF EXISTS "Enable all for auth users" ON driver_activities;
CREATE POLICY "Allow all operations" ON driver_activities
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==========================================
-- 10. TABLE: USER_PROFILES
-- ==========================================

DROP POLICY IF EXISTS "Enable all for auth users" ON user_profiles;
DROP POLICY IF EXISTS "Allow all operations" ON user_profiles;
CREATE POLICY "Allow all operations" ON user_profiles
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==========================================
-- 11. TABLE: TENANTS (pour cohérence)
-- ==========================================
-- Note: Cette table devrait déjà avoir des politiques permissives
-- si vous avez exécuté create_tenants_table.sql
-- Mais on s'assure qu'elle est cohérente avec les autres

DROP POLICY IF EXISTS "Enable all for auth users" ON tenants;
-- Ne supprime pas les politiques créées par create_tenants_table.sql
-- Juste on s'assure qu'il n'y a pas de politique restrictive

-- ==========================================
-- VÉRIFICATION
-- ==========================================

-- Afficher toutes les politiques RLS créées
SELECT 
    tablename as "Table",
    policyname as "Politique",
    cmd as "Opération",
    CASE 
        WHEN qual = '(true)' OR qual IS NULL THEN '✅ Permissif (tout autorisé)'
        ELSE qual
    END as "Condition USING",
    CASE 
        WHEN with_check = '(true)' OR with_check IS NULL THEN '✅ Permissif (tout autorisé)'
        ELSE with_check
    END as "Condition WITH CHECK"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('vehicles', 'companies', 'employees', 'missions', 'expenses', 
                    'invoices', 'trip_rates', 'daily_activities', 'driver_activities',
                    'user_profiles', 'tenants')
ORDER BY tablename, policyname;

-- ==========================================
-- TEST D'INSERTION SUR VEHICLES
-- ==========================================
-- Teste si l'insertion fonctionne maintenant
DO $$
DECLARE
    test_tenant_id UUID;
    test_vehicle_id UUID;
BEGIN
    -- Récupérer le premier tenant disponible
    SELECT id INTO test_tenant_id FROM tenants LIMIT 1;
    
    IF test_tenant_id IS NULL THEN
        RAISE NOTICE '⚠️ Aucun tenant trouvé. Créez d''abord un tenant avec create_tenants_table.sql';
    ELSE
        RAISE NOTICE '✅ Tenant trouvé: %', test_tenant_id;
        
        -- Tester l'insertion (nous allons supprimer après)
        INSERT INTO vehicles (tenant_id, matricule, type, brand, model)
        VALUES (test_tenant_id, 'TEST-' || extract(epoch from now())::text, 'Camion', 'Test', 'Test Model')
        RETURNING id INTO test_vehicle_id;
        
        RAISE NOTICE '✅ TEST INSERTION RÉUSSI! Véhicule créé avec ID: %', test_vehicle_id;
        
        -- Nettoyer: supprimer le véhicule de test
        DELETE FROM vehicles WHERE id = test_vehicle_id;
        RAISE NOTICE '✅ Véhicule de test supprimé';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERREUR LORS DU TEST D''INSERTION: %', SQLERRM;
        RAISE NOTICE 'Vérifiez que les politiques RLS ont été correctement appliquées.';
END $$;

-- ==========================================
-- NOTES
-- ==========================================
-- ⚠️ Ces politiques sont PERMISSIVES (permettent tout à tout le monde)
-- Adapté pour le mode développement (admin/admin)
--
-- Pour la production, vous devrez créer des politiques plus strictes
-- basées sur auth.role() = 'authenticated' ou tenant_id
-- ==========================================
