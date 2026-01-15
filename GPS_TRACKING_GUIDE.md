# 📍 Système de Suivi GPS en Temps Réel

## ✅ Installation Complète

Ce guide décrit comment activer le système de géolocalisation en temps réel avec OpenStreetMap (100% gratuit).

---

## 🛠️ Étape 1 : Installer les Dépendances

```bash
npm install react-leaflet leaflet
npm install -D @types/leaflet
```

---

## 🗄️ Étape 2 : Créer la Table dans Supabase

1. Allez dans **Supabase Dashboard** → SQL Editor
2. Exécutez le fichier : `supabase/create_tracking_table.sql`

Cela créera :
- ✅ Table `tracking` pour stocker les positions GPS
- ✅ Vue `latest_positions` pour afficher les positions les plus récentes
- ✅ Indexes pour optimiser les recherches
- ✅ Row Level Security (RLS) pour isoler par tenant
- ✅ Fonction de nettoyage automatique (positions > 7 jours)

---

## 🗺️ Étape 3 : Intégrer la Carte OpenStreetMap (Optionnel)

Si vous voulez afficher la carte interactive, remplacez le placeholder dans `components/Tracking.tsx` :

### Code à ajouter :

```tsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix pour les icônes par défaut de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Dans le composant Tracking, remplacer le placeholder par :
<MapContainer
  center={[35.6762, 10.0965]} // Kairouan, Tunisie
  zoom={13}
  style={{ height: '600px', width: '100%' }}
>
  <TileLayer
    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  />
  
  {positions.map((pos) => (
    <Marker key={pos.id} position={[pos.latitude, pos.longitude]}>
      <Popup>
        <div className="p-2">
          <p className="font-bold">{pos.driver_name}</p>
          {pos.vehicle_matricule && <p className="text-sm">{pos.vehicle_matricule}</p>}
          <p className="text-xs text-gray-600">{formatTimestamp(pos.timestamp || '')}</p>
          {pos.speed && <p className="text-xs">🚗 {pos.speed.toFixed(0)} km/h</p>}
        </div>
      </Popup>
    </Marker>
  ))}
</MapContainer>
```

---

## 📱 Étape 4 : Activer le GPS sur Mobile

### Pour les Chauffeurs :
1. Connectez-vous avec vos identifiants chauffeur
2. Allez dans **Suivi GPS**
3. Cliquez sur **"Activer Mon GPS"**
4. Autorisez l'accès à la localisation dans le navigateur

### Autorisations Requises :
- ✅ Localisation (obligatoire)
- ✅ En arrière-plan (recommandé pour suivi continu)

---

## 🔐 Permissions & Sécurité

### Supabase RLS
Les politiques de sécurité garantissent que :
- ✅ Chaque tenant voit uniquement ses données
- ✅ Les chauffeurs ne peuvent envoyer QUE leur position
- ✅ Les admins voient toutes les positions de leur entreprise

### HTTPS Obligatoire
L'API Geolocation nécessite HTTPS (sauf localhost).
Déployez sur Vercel/Netlify pour avoir HTTPS automatiquement.

---

## 📊 Fonctionnalités Disponibles

### Pour les Admins :
- ✅ Voir toutes les positions en temps réel
- ✅ Carte interactive avec marqueurs
- ✅ Tableau détaillé avec vitesse, batterie, précision
- ✅ Mise à jour automatique toutes les 10 secondes
- ✅ Lien direct vers OpenStreetMap pour chaque position

### Pour les Chauffeurs :
- ✅ Activer/Désactiver le GPS facilement
- ✅ Partage automatique de position toutes les 30 secondes
- ✅ Envoi de vitesse, cap, altitude, niveau de batterie
- ✅ Fonctionne en arrière-plan (selon le navigateur)

---

## ⚡ Optimisations

### 1. Fréquence de Mise à Jour
Par défaut : position envoyée toutes les 30 secondes.
Modifier dans `useGPSTracking` :

```typescript
watchId = navigator.geolocation.watchPosition(
  callback,
  errorCallback,
  {
    enableHighAccuracy: true, // Précision GPS élevée
    timeout: 10000,           // Timeout après 10s
    maximumAge: 30000,        // Cache position max 30s
  }
);
```

### 2. Nettoyage Automatique
Les positions de plus de 7 jours sont supprimées automatiquement.
Pour changer la durée, modifiez dans le SQL :

```sql
WHERE timestamp < NOW() - INTERVAL '30 days'; -- Garder 30 jours
```

### 3. Mode Économie de Batterie
Pour prolonger la batterie sur mobile :
- Augmenter `maximumAge` à 60000 (1 minute)
- Désactiver `enableHighAccuracy` (moins précis mais moins gourmand)

---

## 🚀 100% Gratuit !

| Composant | Service | Coût |
|-----------|---------|------|
| Carte | OpenStreetMap | ✅ Gratuit |
| Stockage GPS | Supabase (Free Tier) | ✅ Gratuit (500 MB) |
| API Geolocation | HTML5 Navigateur | ✅ Gratuit |
| Tiles | OSM Community | ✅ Gratuit (illimité) |

**Pas de clé API Google Maps nécessaire !**

---

## 🐛 Dépannage

### GPS ne fonctionne pas ?
1. Vérifier que le site est en **HTTPS** (ou localhost)
2. Autoriser la localisation dans le navigateur
3. Activer le GPS sur le téléphone
4. Vérifier la console pour les erreurs

### Positions ne s'affichent pas ?
1. Vérifier que la table `tracking` existe dans Supabase
2. Exécuter le script SQL fourni
3. Vérifier les politiques RLS
4. Regarder les logs Supabase pour les erreurs

### Carte ne charge pas ?
1. Installer `react-leaflet` et `leaflet`
2. Importer les CSS : `import 'leaflet/dist/leaflet.css'`
3. Vérifier la connexion internet

---

## 📚 Ressources

- [Leaflet Documentation](https://leafletjs.com/)
- [React Leaflet](https://react-leaflet.js.org/)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)

---

## ✨ Prochaines Améliorations

- [ ] Tracer l'historique de trajet
- [ ] Alertes géofencing (zone interdite)
- [ ] Estimation temps d'arrivée
- [ ] Replay de trajet
- [ ] Heatmap des zones fréquentées

---

**Système 100% fonctionnel et gratuit pour un suivi GPS professionnel !** 🎉
