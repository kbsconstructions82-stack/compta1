# 🔧 Exemple d'Implémentation : Optimiser un Tableau pour Mobile

## Avant / Après

### ❌ AVANT (Pas optimisé pour mobile)

```tsx
// components/Invoicing.tsx - Ligne 585
<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <div className="overflow-x-auto max-h-[600px]">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 sticky top-0">
                <tr>
                    <th>Trajet</th>
                    <th>Date</th>
                    <th>Montant HT</th>
                    <th>Montant TTC</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {allItems.map((row, i) => (
                    <tr key={i}>
                        <td>{row.trajet}</td>
                        <td>{row.invoiceDate}</td>
                        <td>{row.ht.toFixed(3)}</td>
                        <td>{row.ttc.toFixed(3)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
</div>
```

**Problèmes :**
- 📱 Sur mobile : tableau trop large, difficile à lire
- 👆 Scroll horizontal peu intuitif
- 🤏 Petites colonnes illisibles

---

### ✅ APRÈS (Optimisé avec MobileTableWrapper)

```tsx
// 1. Importer les composants
import { MobileTableWrapper, MobileCard, MobileCardRow } from './MobileTableWrapper';

// 2. Créer la vue "Cartes" pour mobile
const renderMobileCards = () => (
    <>
        {allItems.map((row, i) => (
            <MobileCard key={i}>
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <p className="font-bold text-gray-800">{row.trajet || 'Trajet non défini'}</p>
                        <p className="text-sm text-gray-500">{row.invoiceDate}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500">Pièce</p>
                        <p className="font-mono text-sm">{row.piece_no || '-'}</p>
                    </div>
                </div>
                
                <MobileCardRow label="Préf. P" value={row.pref_p || 'ABLL'} />
                <MobileCardRow label="Devise" value={row.devise || 'TND'} />
                <MobileCardRow 
                    label="Montant HT" 
                    value={<span className="font-bold text-gray-800">{row.ht.toFixed(3)} TND</span>} 
                />
                <MobileCardRow 
                    label="Montant TTC" 
                    value={<span className="font-bold text-indigo-600">{row.ttc.toFixed(3)} TND</span>} 
                />
            </MobileCard>
        ))}
    </>
);

// 3. Wrapper le tableau existant
<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <MobileTableWrapper
        title="Factures du mois"
        mobileCards={renderMobileCards()}
    >
        <div className="overflow-x-auto max-h-[600px]">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
                {/* Tableau inchangé pour desktop */}
                <thead className="bg-gray-50 sticky top-0">
                    <tr>
                        <th>Trajet</th>
                        <th>Date</th>
                        <th>Montant HT</th>
                        <th>Montant TTC</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {allItems.map((row, i) => (
                        <tr key={i}>
                            <td>{row.trajet}</td>
                            <td>{row.invoiceDate}</td>
                            <td>{row.ht.toFixed(3)}</td>
                            <td>{row.ttc.toFixed(3)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </MobileTableWrapper>
</div>
```

**Résultats :**
- ✅ Desktop : Tableau normal (inchangé)
- ✅ Mobile : Toggle entre tableau scrollable et cartes
- ✅ Cartes : Lisibles, grandes, tactiles
- ✅ Expérience optimale sur tous les écrans

---

## 📝 Template Réutilisable

### Pour un tableau simple

```tsx
import { MobileTableWrapper, MobileCard, MobileCardRow } from './MobileTableWrapper';

// Vue cartes mobile
const mobileCards = (
    <>
        {items.map(item => (
            <MobileCard key={item.id}>
                <MobileCardRow label="Champ 1" value={item.field1} />
                <MobileCardRow label="Champ 2" value={item.field2} />
                <MobileCardRow label="Champ 3" value={item.field3} />
            </MobileCard>
        ))}
    </>
);

// Rendu
<MobileTableWrapper title="Mon Tableau" mobileCards={mobileCards}>
    <table>
        {/* Tableau normal */}
    </table>
</MobileTableWrapper>
```

---

### Pour un tableau avec actions (boutons)

```tsx
const mobileCards = (
    <>
        {items.map(item => (
            <MobileCard key={item.id}>
                {/* En-tête de la carte */}
                <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-100">
                    <div>
                        <h4 className="font-bold text-gray-800">{item.name}</h4>
                        <p className="text-sm text-gray-500">{item.date}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                        {item.status}
                    </span>
                </div>

                {/* Champs */}
                <MobileCardRow label="Montant" value={`${item.amount} TND`} />
                <MobileCardRow label="Client" value={item.client} />

                {/* Actions (boutons en bas) */}
                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                    <button 
                        onClick={() => handleEdit(item.id)}
                        className="flex-1 py-3 px-4 bg-indigo-50 text-indigo-600 rounded-lg font-medium min-h-[48px]"
                    >
                        Modifier
                    </button>
                    <button 
                        onClick={() => handleDelete(item.id)}
                        className="flex-1 py-3 px-4 bg-red-50 text-red-600 rounded-lg font-medium min-h-[48px]"
                    >
                        Supprimer
                    </button>
                </div>
            </MobileCard>
        ))}
    </>
);
```

---

### Pour un tableau avec indicateurs visuels

```tsx
const mobileCards = (
    <>
        {vehicles.map(vehicle => (
            <MobileCard key={vehicle.id}>
                {/* En-tête avec icône/image */}
                <div className="flex items-center gap-4 mb-3 pb-3 border-b border-gray-100">
                    <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <Truck size={32} className="text-indigo-600" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-gray-800">{vehicle.license_plate}</h4>
                        <p className="text-sm text-gray-500">{vehicle.brand} {vehicle.model}</p>
                    </div>
                </div>

                {/* Informations */}
                <MobileCardRow 
                    label="Kilométrage" 
                    value={<span className="font-mono">{vehicle.mileage.toLocaleString()} km</span>} 
                />
                <MobileCardRow 
                    label="Dernier entretien" 
                    value={new Date(vehicle.last_maintenance).toLocaleDateString('fr-FR')} 
                />
                
                {/* Jauge visuelle */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">État général</span>
                        <span className="text-sm font-bold text-green-600">85%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                </div>
            </MobileCard>
        ))}
    </>
);
```

---

## 🎨 Composants Stylisés Réutilisables

### Badge de statut

```tsx
const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
        paid: 'bg-green-100 text-green-700',
        pending: 'bg-yellow-100 text-yellow-700',
        draft: 'bg-gray-100 text-gray-700',
        cancelled: 'bg-red-100 text-red-700',
    };

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[status] || colors.draft}`}>
            {status}
        </span>
    );
};

// Utilisation dans MobileCard
<MobileCard>
    <div className="flex justify-between items-center mb-3">
        <h4 className="font-bold">Facture #123</h4>
        <StatusBadge status="paid" />
    </div>
    {/* ... */}
</MobileCard>
```

### Bouton d'action mobile-friendly

```tsx
const MobileActionButton = ({ 
    label, 
    onClick, 
    variant = 'primary',
    icon: Icon 
}: any) => {
    const variants = {
        primary: 'bg-indigo-600 text-white',
        secondary: 'bg-gray-100 text-gray-700',
        danger: 'bg-red-50 text-red-600',
        success: 'bg-green-50 text-green-600',
    };

    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium min-h-[48px] transition-all active:scale-95 ${variants[variant]}`}
        >
            {Icon && <Icon size={20} />}
            <span>{label}</span>
        </button>
    );
};

// Utilisation
<MobileCard>
    {/* ... */}
    <div className="flex gap-2 mt-4">
        <MobileActionButton 
            label="Modifier" 
            icon={Edit2}
            variant="primary" 
            onClick={() => {}}
        />
        <MobileActionButton 
            label="Supprimer" 
            icon={Trash2}
            variant="danger" 
            onClick={() => {}}
        />
    </div>
</MobileCard>
```

---

## 📍 Composants à Optimiser en Priorité

### 1. Operations.tsx (Missions)
**Ligne ~150-300** : Tableau des missions
```tsx
// AVANT
<table>
    <thead>
        <tr><th>Mission</th><th>Client</th><th>Statut</th></tr>
    </thead>
    ...
</table>

// APRÈS
<MobileTableWrapper mobileCards={renderMissionCards()}>
    <table>...</table>
</MobileTableWrapper>
```

### 2. Expenses.tsx (Charges)
**Ligne ~100-200** : Tableau des dépenses
```tsx
<MobileTableWrapper 
    title="Dépenses"
    mobileCards={renderExpenseCards()}
>
    <table>...</table>
</MobileTableWrapper>
```

### 3. Payroll.tsx (Paie)
**Ligne ~200-400** : Tableau des employés
```tsx
<MobileTableWrapper 
    title="Employés"
    mobileCards={renderEmployeeCards()}
>
    <table>...</table>
</MobileTableWrapper>
```

### 4. Fleet.tsx (Flotte)
**Ligne ~100-300** : Tableau des véhicules
```tsx
<MobileTableWrapper 
    title="Véhicules"
    mobileCards={renderVehicleCards()}
>
    <table>...</table>
</MobileTableWrapper>
```

---

## ✅ Checklist par Composant

Pour chaque composant à optimiser :

- [ ] Importer `MobileTableWrapper`, `MobileCard`, `MobileCardRow`
- [ ] Créer la fonction `renderMobileCards()` avec MobileCard
- [ ] Wrapper le `<table>` existant
- [ ] Tester sur mobile (toggle entre vues)
- [ ] Vérifier que les boutons font 48px min
- [ ] Ajouter des status badges si pertinent
- [ ] S'assurer que les cartes sont tactiles

---

**🚀 Vous avez maintenant tout pour optimiser l'ensemble de l'application pour mobile !**
