-- Migration: Add fuel_liters column to expenses table
-- Date: 2026-01-21
-- Description: Add column to track fuel quantity in liters for fuel expenses

-- Add the column (nullable to not break existing data)
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS fuel_liters NUMERIC DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN expenses.fuel_liters IS 'Quantité de carburant en litres (pour les dépenses de catégorie FUEL uniquement)';
