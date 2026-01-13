# Création rapide d'icônes PWA

## Option 1 : Créer via un site web (Recommandé)
Allez sur https://www.pwabuilder.com/imageGenerator et uploadez votre logo.

## Option 2 : Utiliser un script Node.js
```bash
npm install -g pwa-asset-generator
pwa-asset-generator logo-source.png public/assets/ --background "#1e40af"
```

## Option 3 : Création manuelle avec SVG → PNG

Créez un fichier SVG simple avec ce contenu et convertissez-le en PNG :

```svg
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#1e40af" rx="80"/>
  <text x="50%" y="45%" text-anchor="middle" font-family="Arial, sans-serif" font-size="180" font-weight="bold" fill="white">MOMO</text>
  <text x="50%" y="65%" text-anchor="middle" font-family="Arial, sans-serif" font-size="60" fill="#93c5fd">Logistics</text>
  <path d="M 150 320 L 200 360 L 350 360 L 400 320 L 380 280 L 170 280 Z" fill="white" opacity="0.9"/>
  <rect x="210" y="290" width="90" height="50" fill="#1e40af" rx="5"/>
</svg>
```

Convertissez ce SVG en PNG :
- 512x512 → `icon-512.png`
- 192x192 → `icon-192.png`

## Option 4 : Utiliser un placeholder temporaire

Si vous n'avez pas de logo maintenant, utilisez des icônes placeholder :

### Via RealFaviconGenerator
1. Allez sur https://realfavicongenerator.net/
2. Uploadez n'importe quelle image
3. Téléchargez le pack d'icônes
4. Renommez les fichiers nécessaires

### Via Canva
1. Créez un nouveau design 512x512
2. Ajoutez texte "MOMO" + icône camion
3. Téléchargez en PNG
4. Redimensionnez pour créer 192x192

## Placeholders temporaires (Texte seulement)
En attendant vos vraies icônes, vous pouvez créer des icônes simples avec du texte.

### Conversion en ligne gratuite :
- https://cloudconvert.com/svg-to-png (SVG → PNG)
- https://www.iloveimg.com/resize-image (Redimensionner)

## Emplacement final
```
public/
  assets/
    icon-192.png   ← 192x192 pixels
    icon-512.png   ← 512x512 pixels
```

## Test
Après avoir créé les icônes :
1. Rechargez l'application
2. Ouvrez les DevTools (F12)
3. Onglet "Application" → "Manifest"
4. Vérifiez que les icônes s'affichent
