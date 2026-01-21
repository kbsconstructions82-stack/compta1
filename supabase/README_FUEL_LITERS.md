# Migration de la base de données - Ajout du champ fuel_liters

## Description
Cette migration ajoute une colonne `fuel_liters` à la table `expenses` pour permettre le suivi de la quantité de carburant en litres lors des dépenses de carburant.

## Fichier de migration
`supabase/add_fuel_liters_column.sql`

## Comment appliquer cette migration

### Option 1 : Via l'interface Supabase
1. Connectez-vous à votre projet Supabase sur https://app.supabase.com
2. Allez dans l'onglet **SQL Editor**
3. Créez une nouvelle requête
4. Copiez-collez le contenu du fichier `supabase/add_fuel_liters_column.sql`
5. Cliquez sur **Run** pour exécuter la migration

### Option 2 : Via Supabase CLI
```bash
# Si vous avez configuré Supabase CLI localement
supabase db push
```

### Option 3 : Exécuter manuellement le SQL
```sql
-- Ajouter la colonne fuel_liters
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS fuel_liters NUMERIC DEFAULT NULL;

-- Ajouter un commentaire pour documentation
COMMENT ON COLUMN expenses.fuel_liters IS 'Quantité de carburant en litres (pour les dépenses de catégorie FUEL uniquement)';
```

## Vérification
Après avoir appliqué la migration, vérifiez que la colonne a été ajoutée :

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'expenses' AND column_name = 'fuel_liters';
```

## Impact sur l'application
- Le champ `fuel_liters` est désormais disponible dans le type `Expense`
- Le formulaire de déclaration de dépense affiche un champ "Quantité de Carburant" uniquement pour les dépenses de catégorie FUEL
- La colonne "Litres" s'affiche dans le tableau des dépenses (admin)
- Le champ est optionnel et peut rester vide

## Compatibilité
Cette migration est **rétrocompatible** :
- Les dépenses existantes auront `fuel_liters = NULL`
- Aucune donnée n'est perdue
- L'application continue de fonctionner normalement avec ou sans cette valeur
