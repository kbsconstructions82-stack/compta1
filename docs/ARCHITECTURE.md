# Architecture Technique - Transport Compta Tunisie
**Version 2.2.0**

## 1. Vue d'ensemble
L'application est une solution de gestion comptable et financière dédiée aux sociétés de transport routier en Tunisie. Elle est conçue comme une Single Page Application (SPA) React qui intègre un moteur comptable complet en local (Client-Side) pour une réactivité maximale.

### Piliers de l'Architecture
1.  **Interface Utilisateur (React)** : Composants métier (Facturation, Dépenses, Flotte).
2.  **State Management (Context API)** : Centralisation des données via `DatabaseContext`.
3.  **Business Logic Layer (Services)** : Moteurs découplés de l'UI (`CoreAccounting`, `TVAEngine`).
4.  **Fiscal Layer** : Mappage automatique vers les formulaires fiscaux tunisiens.

---

## 2. Structure du Projet

```bash
/src
├── components/          # Composants React (Vues)
│   ├── Accounting.tsx   # Tableau de bord financier & fiscal
│   ├── Invoicing.tsx    # Module Facturation (Flux direct)
│   ├── Expenses.tsx     # Module Dépenses & Analytique
│   └── ...
├── contexts/
│   └── DatabaseContext.tsx # Pont entre React et les Singletons
├── services/            # Logique Métier (Indépendant de React)
│   ├── CoreAccounting.ts   # Grand Livre (Ledger)
│   ├── TVAEngine.ts        # Moteur Fiscal (Règles TVA TN)
│   ├── accountingEngine.ts # Générateur d'écritures
│   └── fiscalMappingService.ts # Déclarations (TVA, RS, CNSS)
├── types/               # Définitions TypeScript partagées
└── utils/               # Helpers (Calculs taxes, formatage)
```

---

## 3. Modèle de Données & Flux

### 3.1 Moteur Financier (`CoreAccounting`)
Le cœur du système est un registre de transactions immuable.
*   **Structure Transaction** : `{ id, date, type (RECETTE|DEPENSE), amount, category, reference }`
*   **Rôle** : Calcul du solde de trésorerie et du résultat net en temps réel.
*   **Synchronisation** :
    *   `Invoicing.tsx` -> Valide Facture -> Appelle `CoreAccounting.recordTransaction()`
    *   `Expenses.tsx` -> Crée Dépense -> Appelle `CoreAccounting.recordTransaction()`

### 3.2 Moteur Fiscal (`TVAEngine`)
Spécialisé dans la collecte et le calcul de la TVA tunisienne.
*   **Journal TVA** : Enregistre chaque opération avec sa base HT, son taux et le montant TVA.
*   **Règles Métier** :
    *   TVA Transport : 7%
    *   TVA Standard : 19%
    *   TVA Export : 0%
*   **Sortie** : Déclaration Mensuelle (Net à Payer ou Crédit à Reporter).

### 3.3 Synchronisation UI (`DatabaseContext`)
Pour garantir que l'interface reflète toujours l'état des moteurs :
1.  Les composants appellent les méthodes des singletons (ex: `logOperation`).
2.  Ils appellent ensuite `refreshData()` exposé par le Context.
3.  Le Context met à jour ses états locaux (`transactions`, `tvaJournal`).
4.  React redessine les vues concernées (Tableaux de bord, Journaux).

---

## 4. Workflows Métier

### 4.1 Facturation (Flux Simplifié v2.1)
*   **Saisie** : L'utilisateur remplit le formulaire (Client, Lignes, Taux TVA).
    *   **Nouvelles Colonnes (v2.2)** : Trajet (Ville départ/arrivée), Pièce N°, Préf.P (Fixe ABLL), Devise.
*   **Validation** : Au clic sur "Enregistrer", la facture est **automatiquement validée**.
    *   Génération ID unique (`FAC-YYYY-XXX`).
    *   Verrouillage des modifications.
    *   Écriture immédiate dans le `Journal TVA (Collectée)`.
*   **Paiement** : L'encaissement génère une écriture dans le `Grand Livre (Recette)`.

### 4.2 Dépenses & Analytique
*   **Saisie** : Dépense qualifiée par Véhicule (Analytique) et Catégorie (Comptable).
*   **Traitement** :
    *   Si payée : Écriture `Grand Livre (Dépense)`.
    *   Si déductible : Écriture `Journal TVA (Déductible)`.
*   **Analytique** : Le tableau de bord Flotte agrège ces données pour calculer le Coût par Km (CPK).

### 4.3 Déclarations Fiscales
Le module `Accounting.tsx` utilise `fiscalMappingService` pour transformer les données brutes en formulaires officiels :
*   **Déclaration Mensuelle** : Agrégation TVA Collectée vs Déductible + Retenue à la Source.
*   **États Annexes** : Génération des listes Clients (930) et Fournisseurs (940) pour la liasse fiscale.

---

## 5. Sécurité et Données
*   **Persistance** : Actuellement en `localStorage` (Simulation BDD). Prêt pour migration PostgreSQL.
*   **Intégrité** : Les transactions validées ne sont pas modifiables (Principe d'immutabilité comptable).
*   **Migration** : Un script de migration automatique convertit les anciennes factures "Brouillon" au démarrage pour assurer la continuité de service.

---

## 6. Prochaines Étapes
1.  **Backend** : Migrer la persistance vers Node.js/PostgreSQL.
2.  **Multi-User** : Ajouter l'authentification et les rôles (Admin, Comptable, Saisie).
3.  **Export** : Générer les fichiers XML pour la télé-déclaration (Système "Tasrih").
