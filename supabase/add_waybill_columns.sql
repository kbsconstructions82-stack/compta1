-- ==========================================
-- Script pour ajouter les colonnes waybill_number et waybill_date à la table missions
-- Ce script peut être exécuté si la table missions existe déjà
-- ==========================================
-- INSTRUCTIONS:
-- 1. Ouvrez Supabase Dashboard → SQL Editor
-- 2. Collez ce script
-- 3. Cliquez sur "Run" ou appuyez sur Ctrl+Enter
-- 4. Vérifiez les messages de notification pour confirmer l'ajout
-- ==========================================

-- 1. Ajouter la colonne waybill_number (TEXT) si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
          AND table_name = 'missions' 
          AND column_name = 'waybill_number'
    ) THEN
        ALTER TABLE public.missions ADD COLUMN waybill_number TEXT;
        RAISE NOTICE '✅ Colonne waybill_number ajoutée à la table missions';
    ELSE
        RAISE NOTICE '⚠️ Colonne waybill_number existe déjà - aucune action nécessaire';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Erreur lors de l''ajout de waybill_number: %', SQLERRM;
END $$;

-- 2. Ajouter la colonne waybill_date (DATE) si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
          AND table_name = 'missions' 
          AND column_name = 'waybill_date'
    ) THEN
        ALTER TABLE public.missions ADD COLUMN waybill_date DATE;
        RAISE NOTICE '✅ Colonne waybill_date ajoutée à la table missions';
    ELSE
        RAISE NOTICE '⚠️ Colonne waybill_date existe déjà - aucune action nécessaire';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Erreur lors de l''ajout de waybill_date: %', SQLERRM;
END $$;

-- 3. Rafraîchir le cache du schéma Supabase (optionnel mais recommandé)
-- Cette commande peut aider à résoudre les problèmes de cache
NOTIFY pgrst, 'reload schema';

-- 4. Vérifier que les colonnes ont été ajoutées
SELECT 
    column_name as "Nom Colonne",
    data_type as "Type Données",
    is_nullable as "Nullable",
    CASE 
        WHEN column_name = 'waybill_number' THEN '✅ Numéro de BL (Bon de Livraison)'
        WHEN column_name = 'waybill_date' THEN '✅ Date de BL (Bon de Livraison)'
        ELSE column_name
    END as "Description"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'missions'
  AND column_name IN ('waybill_number', 'waybill_date')
ORDER BY column_name;

-- 5. Message de confirmation
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
          AND table_name = 'missions' 
          AND column_name IN ('waybill_number', 'waybill_date')
    ) THEN
        RAISE NOTICE '';
        RAISE NOTICE '═══════════════════════════════════════════════════════';
        RAISE NOTICE '✅ SUCCÈS: Les colonnes BL ont été ajoutées avec succès!';
        RAISE NOTICE '═══════════════════════════════════════════════════════';
        RAISE NOTICE '';
        RAISE NOTICE 'Vous pouvez maintenant:';
        RAISE NOTICE '  1. Retourner à l''application';
        RAISE NOTICE '  2. Planifier une nouvelle mission';
        RAISE NOTICE '  3. Remplir le numéro et la date de BL';
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠️ ATTENTION: Les colonnes n''ont pas été créées.';
        RAISE NOTICE 'Vérifiez les erreurs ci-dessus et réessayez.';
        RAISE NOTICE '';
    END IF;
END $$;
