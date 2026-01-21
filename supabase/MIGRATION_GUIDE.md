# 🔧 Guide d'application de la migration SQL

## Problème résolu
L'erreur `Could not find the 'vehicle_matricule' column of 'expenses'` a été corrigée. Le code utilise maintenant correctement `vehicle_id` au lieu de `vehicle_matricule`.

## Étapes pour appliquer la migration

### 1. Se connecter à Supabase
Allez sur https://app.supabase.com et ouvrez votre projet.

### 2. Ouvrir le SQL Editor
Dans le menu de gauche, cliquez sur **SQL Editor**.

### 3. Exécuter la migration
Copiez et collez ce code SQL, puis cliquez sur **Run** :

```sql
-- Migration: Add fuel_liters column to expenses table
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS fuel_liters NUMERIC DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN expenses.fuel_liters IS 'Quantité de carburant en litres (pour les dépenses de catégorie FUEL uniquement)';
```

### 4. Vérifier que la migration a réussi
Exécutez cette requête pour vérifier :

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'expenses' AND column_name = 'fuel_liters';
```

Vous devriez voir :
```
column_name  | data_type | is_nullable
-------------|-----------|------------
fuel_liters  | numeric   | YES
```

### 5. Rafraîchir l'application
Une fois la migration appliquée :
1. Rafraîchissez votre navigateur (F5)
2. Testez la création d'une dépense de carburant
3. Le champ "Quantité de Carburant (Litres)" devrait maintenant fonctionner

## ✅ Changements appliqués dans le code

- ✅ Correction de `vehicle_matricule` → `vehicle_id` dans DriverProfile.tsx
- ✅ Ajout du champ `fuel_liters` dans le type `Expense`
- ✅ Affichage de la colonne "Litres" dans le tableau des dépenses
- ✅ Formulaire avec champ conditionnel pour les dépenses de carburant
- ✅ Mise à jour du schéma SQL dans RESET_DB.sql

L'application est maintenant prête à utiliser le suivi des litres de carburant !
