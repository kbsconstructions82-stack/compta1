-- ==========================================
-- Script de vérification de la configuration TENANTS
-- ==========================================
-- Ce script vérifie que la table tenants est correctement configurée
-- avec RLS activé et les bonnes politiques
-- ==========================================

-- 1. Vérifier que la table existe
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants')
        THEN '✅ Table "tenants" existe'
        ELSE '❌ Table "tenants" N''EXISTE PAS'
    END as table_status;

-- 2. Vérifier la structure de la table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'tenants'
ORDER BY ordinal_position;

-- 3. Vérifier que RLS est activé
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS ACTIVÉ'
        ELSE '❌ RLS DÉSACTIVÉ'
    END as rls_status
FROM pg_tables
WHERE tablename = 'tenants';

-- 4. Vérifier les politiques RLS existantes
SELECT 
    policyname as "Nom de la politique",
    cmd as "Opération",
    qual as "Condition USING",
    with_check as "Condition WITH CHECK"
FROM pg_policies
WHERE tablename = 'tenants';

-- 5. Lister tous les tenants existants
SELECT 
    id,
    name,
    created_at,
    '✅ Tenant trouvé' as status
FROM tenants
ORDER BY created_at;

-- 6. Tester l'insertion (devrait fonctionner avec les politiques permissives)
DO $$
DECLARE
    test_id UUID;
BEGIN
    INSERT INTO tenants (name)
    VALUES ('Test Tenant ' || extract(epoch from now())::text)
    RETURNING id INTO test_id;
    
    RAISE NOTICE '✅ TEST INSERTION RÉUSSI: Tenant créé avec ID %', test_id;
    
    -- Nettoyer: supprimer le tenant de test
    DELETE FROM tenants WHERE id = test_id;
    RAISE NOTICE '✅ Tenant de test supprimé';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERREUR LORS DU TEST D''INSERTION: %', SQLERRM;
END $$;

-- 7. Résumé final
SELECT 
    '═══════════════════════════════════════' as separator,
    (SELECT COUNT(*) FROM tenants)::text || ' tenant(s) trouvé(s)' as summary,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'tenants' 
            AND cmd = 'INSERT'
        ) THEN '✅ Politique INSERT existe'
        ELSE '❌ Politique INSERT manquante'
    END as insert_policy,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'tenants' 
            AND cmd = 'SELECT'
        ) THEN '✅ Politique SELECT existe'
        ELSE '❌ Politique SELECT manquante'
    END as select_policy;
