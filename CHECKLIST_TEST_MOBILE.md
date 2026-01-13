# ✅ Checklist de Test Mobile - MOMO Logistics

## 📱 Tests sur Smartphone Réel

### 🔥 Tests Critiques (À faire EN PREMIER)

#### ✅ Navigation et Scroll
- [ ] Ouvrir l'application sur smartphone
- [ ] Vérifier que la page scroll de haut en bas sans blocage
- [ ] Scroller jusqu'en bas de la page
- [ ] **IMPORTANT** : Vérifier que le bouton de déconnexion est visible dans le header (icône rouge)
- [ ] Tester le scroll dans le Dashboard
- [ ] Tester le scroll dans chaque section (Missions, Factures, etc.)

#### ✅ Bouton Déconnexion
- [ ] Le bouton rouge (LogOut) est-il visible en haut à droite ?
- [ ] Cliquer dessus → Ça déconnecte ?
- [ ] Ouvrir le menu latéral → Y a-t-il aussi un bouton déconnexion ?
- [ ] Le second bouton déconnecte aussi ?

#### ✅ Menu Latéral
- [ ] Cliquer sur l'icône menu (3 barres) → Menu s'ouvre ?
- [ ] Swiper depuis le bord gauche vers la droite → Menu s'ouvre ?
- [ ] Swiper le menu vers la gauche → Menu se ferme ?
- [ ] Cliquer sur le fond noir → Menu se ferme ?
- [ ] Tous les liens du menu fonctionnent ?

#### ✅ Bottom Navigation
- [ ] Les 5 icônes en bas sont visibles ?
- [ ] Chaque icône est assez grande pour cliquer facilement ?
- [ ] Cliquer sur chaque icône change bien de page ?
- [ ] L'icône active est bien mise en évidence (bleu) ?

---

## 🎯 Tests par Section

### 📊 Dashboard
- [ ] Ouvrir le Dashboard
- [ ] Les 4 cartes (statistiques) sont affichées en grille ?
- [ ] Chaque carte est assez grande et lisible ?
- [ ] Cliquer sur une carte → Modal s'ouvre ?
- [ ] Le modal prend tout l'écran ou presque ?
- [ ] Le bouton X pour fermer le modal est assez grand (48px) ?
- [ ] Le modal scroll si le contenu est long ?

### 🚚 Operations (Missions)
- [ ] Ouvrir la section Missions
- [ ] Le tableau est-il visible ?
- [ ] Peut-on scroller le tableau horizontalement ?
- [ ] Les boutons d'action (Ajouter, Modifier, etc.) sont assez grands ?
- [ ] Créer une nouvelle mission → Formulaire lisible ?
- [ ] Les champs de saisie sont assez grands (48px min) ?
- [ ] Le clavier ne cache pas les champs importants ?

### 🧾 Invoicing (Factures)
- [ ] Ouvrir la section Factures
- [ ] Onglet "Facture Mensuelle" accessible ?
- [ ] Le tableau scroll horizontalement ?
- [ ] Bouton "Télécharger PDF" assez grand ?
- [ ] Télécharger un PDF → Le fichier se télécharge correctement ?
- [ ] Vérifier que "Préf.P" affiche bien "ABLL" dans le PDF
- [ ] Créer une nouvelle facture → Tous les champs sont accessibles ?

### 💰 Expenses (Charges)
- [ ] Ouvrir la section Charges
- [ ] Le tableau des dépenses est scrollable ?
- [ ] Ajouter une dépense → Formulaire fonctionne ?
- [ ] Les dropdowns sont assez grands ?

### 👥 RH (Ressources Humaines)
- [ ] Ouvrir la section RH
- [ ] Liste des employés affichée ?
- [ ] Tableau scrollable ?
- [ ] Ajouter un employé → Tous les champs accessibles ?

---

## 🖐️ Tests de Gestures

### Swipe
- [ ] Swipe right depuis le bord gauche → Menu s'ouvre
- [ ] Swipe left sur le menu ouvert → Menu se ferme
- [ ] Swipe depuis n'importe où dans la page → Menu réagit

### Tap
- [ ] Tous les boutons répondent au premier tap (pas besoin de double-tap)
- [ ] Les cartes du Dashboard répondent au tap
- [ ] Les liens dans les tableaux sont cliquables

### Long Press (Optionnel - si implémenté)
- [ ] Long press sur un élément → Action contextuelle ?

---

## 🎨 Tests Visuels

### Lisibilité
- [ ] Tous les textes sont lisibles sans zoomer ?
- [ ] Les polices ne sont pas trop petites ?
- [ ] Les couleurs ont un bon contraste ?
- [ ] Les icônes sont assez grandes ?

### Espacements
- [ ] Les éléments ne sont pas collés les uns aux autres ?
- [ ] Les boutons ont assez d'espace entre eux ?
- [ ] Le contenu ne touche pas les bords de l'écran ?

### Responsive
- [ ] Tester en mode portrait (vertical)
- [ ] Tester en mode paysage (horizontal)
- [ ] Tous les éléments s'adaptent ?

---

## ⚡ Tests de Performance

### Fluidité
- [ ] Le scroll est fluide (60fps) ?
- [ ] Les animations ne lagguent pas ?
- [ ] Les transitions sont douces ?
- [ ] Pas de saccades lors de l'ouverture du menu ?

### Chargement
- [ ] Les pages se chargent rapidement ?
- [ ] Les images se chargent sans bloquer l'interface ?
- [ ] Pas de "flash" ou de contenu qui saute ?

---

## 🔧 Tests Fonctionnels Avancés

### Formulaires
- [ ] Focus sur un input → Le clavier s'affiche correctement ?
- [ ] Le clavier ne cache pas le champ en cours de saisie ?
- [ ] Changer de champ → Focus passe correctement ?
- [ ] Inputs avec `font-size: 16px` → Pas de zoom automatique sur iOS ?

### Modals/Dialogs
- [ ] Ouvrir un modal → Prend bien toute la hauteur sur mobile ?
- [ ] Le fond (backdrop) est semi-transparent ?
- [ ] Cliquer sur le backdrop → Modal se ferme ?
- [ ] Bouton X assez grand pour fermer facilement ?
- [ ] Scroll dans le modal fonctionne ?

### Tableaux
- [ ] Scroll horizontal fonctionne ?
- [ ] Indicateur de scroll visible (flèche →) ?
- [ ] Si toggle disponible → Basculer entre tableau et cartes ?
- [ ] Vue cartes : Cartes empilées et lisibles ?
- [ ] Vue cartes : Actions (boutons) accessibles ?

---

## 🌐 Tests Réseau

### Mode Hors Ligne (PWA)
- [ ] Mettre le téléphone en mode avion
- [ ] L'app affiche-t-elle un message ?
- [ ] Les données en cache sont-elles accessibles ?
- [ ] Revenir en ligne → Synchronisation automatique ?

### Connexion Lente
- [ ] Simuler une connexion 3G lente
- [ ] L'app reste utilisable ?
- [ ] Indicateurs de chargement visibles ?

---

## 📊 Tests sur Différents Appareils

### iPhone
- [ ] iPhone SE (petit écran 4.7")
- [ ] iPhone 12/13/14 (standard 6.1")
- [ ] iPhone Pro Max (grand 6.7")
- [ ] Vérifier les safe areas (encoche/notch)

### Android
- [ ] Samsung Galaxy S (6.2")
- [ ] Google Pixel (6.0")
- [ ] Xiaomi/OnePlus (divers)
- [ ] Vérifier les barres de navigation système

### Tablette (Optionnel)
- [ ] iPad (10.2")
- [ ] iPad Pro (12.9")
- [ ] L'interface reste optimisée ?
- [ ] Pas d'éléments trop étirés ?

---

## 🐛 Tests de Régression

### Après chaque modification
- [ ] Le bouton déconnexion est toujours accessible ?
- [ ] Le scroll fonctionne toujours partout ?
- [ ] Le menu s'ouvre et se ferme correctement ?
- [ ] Les tableaux sont toujours scrollables ?
- [ ] Les animations restent fluides ?

---

## 📝 Rapport de Test

### Template de rapport

```markdown
## Test Mobile - [Date]

**Appareil testé :** [iPhone 14 / Samsung Galaxy S21 / etc.]  
**OS Version :** [iOS 17.2 / Android 13]  
**Navigateur :** [Safari / Chrome]

### ✅ Fonctionnalités OK
- Scroll fonctionne partout
- Bouton déconnexion accessible
- Menu latéral avec swipe OK
- Bottom navigation OK
- Dashboard responsive

### ❌ Problèmes Rencontrés
1. [Décrire le problème]
   - **Sévérité :** Critique / Majeur / Mineur
   - **Étapes pour reproduire :** ...
   - **Comportement attendu :** ...
   - **Comportement observé :** ...

2. [Autre problème]
   - ...

### 💡 Suggestions d'Amélioration
- [Suggestion 1]
- [Suggestion 2]

### 📸 Screenshots
[Ajouter des captures d'écran si nécessaire]
```

---

## 🎯 Critères de Succès

L'application est considérée comme **optimisée pour mobile** si :

- ✅ **100% des éléments sont accessibles sans scroll horizontal non voulu**
- ✅ **Tous les boutons/liens font minimum 48x48px**
- ✅ **Le bouton de déconnexion est TOUJOURS visible**
- ✅ **Le scroll fonctionne partout sans blocage**
- ✅ **Les gestures (swipe) fonctionnent correctement**
- ✅ **Les tableaux sont lisibles (scroll horizontal ou cartes)**
- ✅ **Les animations sont fluides (60fps)**
- ✅ **Aucun zoom involontaire sur les inputs**
- ✅ **L'interface reste utilisable en mode portrait et paysage**

---

## 🚀 Commandes de Test

### Tester en local sur réseau local
```bash
# 1. Build l'application
npm run build

# 2. Preview
npm run preview -- --host

# 3. Accéder depuis le smartphone
# Trouver l'IP de votre PC (exemple: 192.168.1.100)
# Ouvrir sur le smartphone: http://192.168.1.100:4173
```

### Test avec ngrok (accès externe)
```bash
# 1. Installer ngrok
npm install -g ngrok

# 2. Lancer le serveur local
npm run dev

# 3. Créer un tunnel
ngrok http 5173

# 4. Utiliser l'URL fournie (https://xxx.ngrok.io)
```

---

**📱 Bonne chance pour les tests !**  
**🐛 N'hésitez pas à noter tous les problèmes rencontrés pour les corriger.**
