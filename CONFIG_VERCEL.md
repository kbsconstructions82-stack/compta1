# Configuration des Variables d'Environnement sur Vercel

## Problème
L'erreur `An API Key must be set when running in a browser` apparaît car le service Gemini AI n'est pas configuré.

## Solution Rapide
L'application **fonctionne sans Gemini AI**. Les analyses IA sont désactivées automatiquement si la clé n'est pas configurée.

## Configuration Optionnelle de Gemini AI

### 1. Obtenir une clé API Gemini
1. Aller sur [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Créer une nouvelle clé API gratuite
3. Copier la clé

### 2. Configurer sur Vercel
1. Aller dans votre projet sur [Vercel Dashboard](https://vercel.com/dashboard)
2. Cliquer sur **Settings** > **Environment Variables**
3. Ajouter une nouvelle variable :
   - **Name** : `VITE_GEMINI_API_KEY`
   - **Value** : Votre clé API Gemini
   - **Environments** : Sélectionner Production, Preview, Development
4. Cliquer sur **Save**
5. Redéployer l'application

### 3. Redéploiement
```bash
# Rebuild et redéployer
npm run build
vercel --prod
```

Ou simplement faire un push sur votre repo Git si vous avez configuré l'intégration GitHub/GitLab.

## Variables d'Environnement Disponibles

Copiez le fichier `.env.example` en `.env` pour le développement local :

```bash
cp .env.example .env
```

Puis éditez `.env` avec vos vraies valeurs.

### Liste des variables :

- `VITE_GEMINI_API_KEY` : Clé API Gemini (optionnelle)
- `VITE_SUPABASE_URL` : URL de votre projet Supabase (requis)
- `VITE_SUPABASE_ANON_KEY` : Clé anonyme Supabase (requis)

## Vérification

Après configuration, l'application affichera :
- ✅ **Avec Gemini** : Analyses IA intelligentes dans les rapports
- ⚠️ **Sans Gemini** : Message "Analyse IA désactivée" (fonctionnalité normale)

L'application reste pleinement fonctionnelle dans les deux cas !
