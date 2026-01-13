-- ==========================================
-- Script SIMPLE pour ajouter les colonnes BL à la table missions
-- Version simplifiée sans bloc DO/END
-- ==========================================

-- Ajouter waybill_number si elle n'existe pas
ALTER TABLE public.missions 
ADD COLUMN IF NOT EXISTS waybill_number TEXT;

-- Ajouter waybill_date si elle n'existe pas
ALTER TABLE public.missions 
ADD COLUMN IF NOT EXISTS waybill_date DATE;

-- Ajouter piece_number si elle n'existe pas (Pièce N° pour facture, distincte du BL)
ALTER TABLE public.missions 
ADD COLUMN IF NOT EXISTS piece_number TEXT;

-- Vérifier les colonnes ajoutées
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'missions'
  AND column_name IN ('waybill_number', 'waybill_date', 'piece_number')
ORDER BY column_name;

-- Message de confirmation
SELECT 
    '✅ Colonnes BL et Pièce N° ajoutées avec succès!' as status,
    COUNT(*) as colonnes_ajoutees
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'missions'
  AND column_name IN ('waybill_number', 'waybill_date', 'piece_number');
