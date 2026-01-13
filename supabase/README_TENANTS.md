# Guide de Configuration de la Table TENANTS

## 🎯 Problème résolu

Ce guide résout le problème d'erreur lors de l'ajout de véhicules :
- ❌ `invalid input syntax for type uuid: "T001"`
- ❌ `Erreur tenant: problème de sécurité RLS`

## 📋 Solution : Script de Création Complète

### Fichiers disponibles

1. **`create_tenants_table.sql`** - Script principal (À EXÉCUTER)
   - Recrée la table `tenants` depuis zéro
   - Configure RLS avec des politiques permissives
   - Crée un tenant par défaut "Tenant Principal"

2. **`verify_tenants_setup.sql`** - Script de vérification (Optionnel)
   - Vérifie que la table est bien configurée
   - Teste les insertions
   - Affiche les politiques RLS

## 🚀 Instructions Rapides

### Étape 1 : Exécuter le script principal

1. Ouvrez **Supabase Dashboard**
2. Allez dans **SQL Editor**
3. Ouvrez le fichier `supabase/create_tenants_table.sql`
4. Copiez tout le contenu
5. Collez dans l'éditeur SQL de Supabase
6. Cliquez sur **Run** (ou Ctrl+Enter)

**Résultat attendu :**
```
id                                    | name              | created_at              | status
--------------------------------------|-------------------|-------------------------|-------------------
[UUID généré]                         | Tenant Principal  | 2025-01-XX XX:XX:XX     | ✅ Table créée avec succès!
```

### Étape 2 : Vérifier (Optionnel)

1. Dans le même SQL Editor
2. Ouvrez `supabase/verify_tenants_setup.sql`
3. Exécutez le script
4. Vérifiez que tout est ✅

### Étape 3 : Tester dans l'application

1. Retournez dans l'application
2. Allez dans **Parc Roulant**
3. Cliquez sur **Nouveau Véhicule**
4. Remplissez le formulaire
5. Enregistrez

**Ça devrait fonctionner ! ✅**

## 🔍 Détails Techniques

### Structure de la table

```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Politiques RLS créées

Le script crée **4 politiques permissives** :
1. `Allow public read` - Lecture pour tous
2. `Allow public insert` - Insertion pour tous
3. `Allow public update` - Mise à jour pour tous
4. `Allow public delete` - Suppression pour tous

Ces politiques fonctionnent **même sans authentification Supabase** (mode `admin/admin`).

### Alternative : Politique unique

Si les 4 politiques ne fonctionnent pas, le script contient une alternative (commentée) :
- Une seule politique `Allow all operations` pour tout autoriser

## ⚠️ Notes de Sécurité

Les politiques RLS créées sont **PERMISSIVES** (permettent tout à tout le monde).

**Adapté pour :**
- ✅ Mode développement (`admin/admin`)
- ✅ Applications internes
- ✅ Tests

**Pour la production :** Vous devrez modifier les politiques pour restreindre l'accès aux utilisateurs authentifiés uniquement.

## 🐛 Dépannage

### Si le script ne fonctionne pas :

1. **Vérifiez que vous êtes dans SQL Editor (pas Table Editor)**
2. **Vérifiez que vous avez les permissions admin**
3. **Essayez d'exécuter section par section** au lieu de tout d'un coup

### Si l'insertion échoue toujours :

1. Vérifiez que RLS est activé :
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'tenants';
   ```

2. Vérifiez les politiques :
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'tenants';
   ```

3. Testez manuellement :
   ```sql
   INSERT INTO tenants (name) VALUES ('Test');
   SELECT * FROM tenants;
   ```

## 📞 Support

Si vous rencontrez toujours des problèmes après avoir exécuté le script :
1. Vérifiez les logs dans la console du navigateur (F12)
2. Vérifiez les logs Supabase (Dashboard → Logs)
3. Exécutez `verify_tenants_setup.sql` pour diagnostiquer
