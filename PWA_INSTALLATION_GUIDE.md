# 📱 Guide d'Installation PWA - MOMO Logistics

## ✅ Ce qui est déjà configuré

Votre application est maintenant une **PWA (Progressive Web App)** complète avec :

✔️ **Manifest.json** - Configuration de l'app (nom, icônes, couleurs)
✔️ **Service Worker** - Cache pour fonctionnement offline
✔️ **Meta tags** - Optimisation mobile et iOS
✔️ **Prompt d'installation** - Popup automatique
✔️ **Mode Offline** - Accès sans connexion internet
✔️ **Base de données locale** - IndexedDB (Dexie)
✔️ **Synchronisation** - Queue de sync avec Supabase

---

## 📋 Ce qu'il reste à faire

### 1. **Créer les icônes** (Obligatoire)

Les fichiers d'icônes doivent être placés dans `/public/assets/` :
- `icon-192.png` (192x192 pixels)
- `icon-512.png` (512x512 pixels)

**Guide détaillé :** Voir `ICON_CREATION_GUIDE.md`

**Solution rapide :**
```bash
# Option 1 : Via PWA Asset Generator
npm install -g pwa-asset-generator
pwa-asset-generator votre-logo.png public/assets/ --background "#1e40af"

# Option 2 : Manuellement via Canva/Figma
# Créez un design 512x512 avec votre logo
# Exportez en PNG et placez dans public/assets/
```

---

### 2. **Tester en local**

```bash
# Lancer l'application
npm run dev

# Ouvrir dans Chrome/Edge
http://localhost:3000
```

**Vérifier la PWA :**
1. Ouvrez DevTools (F12)
2. Onglet "Application"
3. Section "Manifest" → Vérifiez les icônes
4. Section "Service Workers" → Doit être "activated"

---

### 3. **Déployer sur un serveur HTTPS**

Les PWA nécessitent **HTTPS** pour fonctionner (sauf localhost).

#### Option A : Vercel (Recommandé - Gratuit)
```bash
# Installer Vercel CLI
npm install -g vercel

# Déployer
vercel

# Suivre les instructions
```

#### Option B : Netlify
```bash
# Installer Netlify CLI
npm install -g netlify-cli

# Déployer
netlify deploy --prod

# Ou via interface web: drag & drop du dossier dist/
```

#### Option C : Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

---

## 📱 Installation sur différents appareils

### Android (Chrome/Edge)

1. Ouvrez l'app dans Chrome/Edge
2. Un bandeau "Installer l'application" apparaît en bas
3. Cliquez sur **"Installer"**
4. L'icône apparaît sur l'écran d'accueil

**OU manuellement :**
1. Menu ⋮ (3 points) → "Installer l'application"
2. Confirmer l'installation

---

### iOS (Safari)

1. Ouvrez l'app dans Safari
2. Appuyez sur le bouton **Partager** ⎙ (en bas)
3. Descendez et sélectionnez **"Sur l'écran d'accueil"**
4. Donnez un nom → **"Ajouter"**

**Note :** iOS ne supporte pas les prompts automatiques, l'utilisateur doit le faire manuellement.

---

### Windows (Chrome/Edge)

1. Ouvrez l'app dans Chrome/Edge
2. Icône d'installation apparaît dans la barre d'adresse (+)
3. Cliquez dessus → **"Installer"**
4. L'app s'ouvre dans une fenêtre séparée

---

### macOS (Chrome/Safari)

Même processus que Windows/iOS selon le navigateur.

---

## 🔧 Fonctionnalités PWA activées

### ✅ Mode Offline
- Cache des ressources statiques
- IndexedDB pour les données
- Synchronisation automatique au retour en ligne

### ✅ Notifications (Optionnel)
Pour activer les notifications push, ajoutez :
```javascript
// Dans service-worker.js
self.addEventListener('push', (event) => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/assets/icon-192.png'
  });
});
```

### ✅ Badge d'application (Optionnel)
Afficher un compteur sur l'icône :
```javascript
// Dans votre code
if ('setAppBadge' in navigator) {
  navigator.setAppBadge(5); // Affiche "5"
}
```

---

## 🐛 Résolution de problèmes

### L'installation ne fonctionne pas

**Vérifications :**
1. ✅ Application servie en HTTPS (ou localhost)
2. ✅ Manifest.json valide
3. ✅ Service Worker enregistré
4. ✅ Icônes PNG existantes (192 et 512)
5. ✅ start_url accessible

**Debug :**
```javascript
// Console du navigateur
navigator.serviceWorker.getRegistrations().then(regs => console.log(regs));
```

### Service Worker ne se met pas à jour

```javascript
// Forcer la mise à jour
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.update());
});

// Puis recharger
window.location.reload();
```

### Icônes ne s'affichent pas

1. Vérifiez que les fichiers PNG existent
2. Vérifiez les chemins dans manifest.json
3. Effacez le cache (Ctrl+Shift+R)
4. Réenregistrez le Service Worker

---

## 📊 Test de compatibilité PWA

### Lighthouse Audit
1. DevTools (F12) → Onglet "Lighthouse"
2. Catégorie : "Progressive Web App"
3. Cliquer sur "Analyze page load"
4. Vérifier le score (doit être > 90)

### PWA Checklist
- [x] Manifest avec name, icons, start_url
- [x] Service Worker enregistré
- [x] HTTPS (ou localhost)
- [x] Responsive design
- [x] Meta viewport
- [x] Mode offline fonctionnel
- [ ] Icônes créées (À FAIRE)
- [ ] Déployé sur HTTPS (À FAIRE)

---

## 🚀 Prochaines étapes

1. **Créer les icônes** → Voir ICON_CREATION_GUIDE.md
2. **Déployer sur Vercel/Netlify** → Obtenir une URL HTTPS
3. **Tester l'installation** sur smartphone
4. **Partager le lien** avec vos utilisateurs

---

## 📱 URL de Test (Après déploiement)

Votre app sera disponible à :
- Vercel : `https://votre-app.vercel.app`
- Netlify : `https://votre-app.netlify.app`

Les utilisateurs pourront l'installer directement depuis cette URL.

---

## 💡 Conseils

- Testez sur plusieurs appareils (Android, iOS, Desktop)
- Vérifiez le mode offline régulièrement
- Surveillez la console pour les erreurs de SW
- Utilisez Chrome DevTools pour simuler mobile
- Gardez les icônes simples et reconnaissables

---

## ✅ Résumé : Pour rendre l'app installable

1. ✔️ **Configuré** : Manifest, Service Worker, Meta tags
2. 🔜 **À FAIRE** : Créer les 2 icônes PNG (192 et 512)
3. 🔜 **À FAIRE** : Déployer sur HTTPS (Vercel/Netlify)
4. 🎉 **Terminé** : L'app sera installable !

**Temps estimé : 15-30 minutes**
