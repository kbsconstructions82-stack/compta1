# ✅ Checklist Installation Mobile

## 📋 Avant de commencer

- [ ] Node.js installé
- [ ] Application lancée avec `npm run dev`
- [ ] Application fonctionne sur http://localhost:3000

---

## 🎨 ÉTAPE 1 : Créer les Icônes

### Option A : Générateur automatique (RECOMMANDÉ)
- [ ] Ouvrir `icon-generator.html` dans Chrome
- [ ] Télécharger `icon-192.png`
- [ ] Télécharger `icon-512.png`
- [ ] Placer les 2 fichiers dans `public/assets/`

### Option B : Canva
- [ ] Créer un design 512x512 sur Canva
- [ ] Ajouter "MOMO" + arrière-plan bleu
- [ ] Télécharger en PNG
- [ ] Redimensionner pour créer 192x192
- [ ] Placer dans `public/assets/`

### Vérification
```bash
# Les fichiers doivent exister :
public/assets/icon-192.png ✓
public/assets/icon-512.png ✓
```

---

## 🌐 ÉTAPE 2 : Déployer

### Option A : Vercel (RECOMMANDÉ)
```bash
npm install -g vercel
npm run build
vercel
```
- [ ] Installer Vercel CLI
- [ ] Builder l'application
- [ ] Déployer
- [ ] Noter l'URL reçue : `https://________.vercel.app`

### Option B : Netlify
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod
```
- [ ] Installer Netlify CLI
- [ ] Builder l'application
- [ ] Déployer
- [ ] Noter l'URL reçue : `https://________.netlify.app`

---

## 🧪 ÉTAPE 3 : Tester

### Test Chrome Desktop
- [ ] Ouvrir l'URL en HTTPS
- [ ] F12 → Application → Manifest (icônes visibles ?)
- [ ] Service Workers (activé ?)
- [ ] Lighthouse → PWA (score > 90 ?)

### Test Android
- [ ] Ouvrir l'URL dans Chrome
- [ ] Voir le popup "Installer l'application"
- [ ] Cliquer "Installer"
- [ ] Vérifier l'icône sur l'écran d'accueil
- [ ] Ouvrir l'app
- [ ] Tester mode avion (offline)

### Test iPhone
- [ ] Ouvrir l'URL dans Safari
- [ ] Bouton Partager ⎙
- [ ] "Sur l'écran d'accueil"
- [ ] "Ajouter"
- [ ] Vérifier l'icône
- [ ] Ouvrir l'app
- [ ] Tester mode avion

---

## ✅ Vérifications Finales

### Fonctionnalités
- [ ] L'app s'ouvre en plein écran (sans barre d'adresse)
- [ ] Le logo/icône est correct
- [ ] L'app fonctionne offline
- [ ] Les données se synchronisent
- [ ] Tous les modules sont accessibles

### Performance
- [ ] Temps de chargement < 3 secondes
- [ ] Pas d'erreurs dans la console
- [ ] Scroll fluide
- [ ] Boutons réactifs

---

## 🎉 TERMINÉ !

Si toutes les cases sont cochées, votre application est :
- ✅ Installable sur smartphone
- ✅ Fonctionnelle offline
- ✅ Synchronisée en temps réel
- ✅ Professionnelle et rapide

---

## 📱 Partager avec les Utilisateurs

Envoyez-leur simplement l'URL :
```
https://votre-app.vercel.app
```

Instructions pour eux :
1. Ouvrir le lien
2. Installer quand proposé (Android) ou via menu Partager (iOS)
3. Utiliser l'app depuis l'écran d'accueil

---

## 🆘 En Cas de Problème

### Les icônes ne s'affichent pas
```bash
# Vérifier les chemins
ls public/assets/icon-*.png

# Effacer le cache
Ctrl+Shift+R dans le navigateur
```

### Service Worker ne fonctionne pas
```javascript
// Console navigateur
navigator.serviceWorker.getRegistrations()
  .then(regs => console.log(regs));
```

### L'installation ne se propose pas
- Vérifier HTTPS (obligatoire)
- Vérifier manifest.json valide
- Vérifier Service Worker enregistré
- Vérifier icônes existantes

---

## 📚 Ressources

- `PWA_INSTALLATION_GUIDE.md` - Guide complet
- `ICON_CREATION_GUIDE.md` - Aide icônes
- `icon-generator.html` - Générateur
- Chrome DevTools - Debug PWA

---

**Bonne installation ! 🚀**
