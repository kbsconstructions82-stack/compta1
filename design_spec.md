# Spécifications de l'Application de Comptabilité Transport (MOMO Logistics)

Ce document définit l'architecture fonctionnelle, technique et les règles de gestion pour l'application de comptabilité dédiée aux sociétés de transport routier de marchandises en Tunisie.

## 1. Architecture Fonctionnelle

L'application est structurée en modules interconnectés pour assurer une gestion fluide de l'exploitation vers la comptabilité.

### 🔹 Module Exploitation (TMS)
- **Gestion de Flotte** : Suivi des camions, remorques (Vignettes, Assurances, Visites Techniques).
- **Missions** : Planification des trajets, affectation Chauffeur/Véhicule.
- **Suivi Kilométrique** : Relevé compteurs pour calculs de coûts et entretiens.

### 🔹 Module Facturation & Revenus
- **Devis & Commandes** : Transformation en factures.
- **Facturation** :
  - Taux TVA Transport : **7%** (Régime réel).
  - Timbre Fiscal : **1.000 TND**.
  - Retenue à la Source (RS) : **1%** sur les factures > 1000 TND TTC (Clients État/Sociétés).
- **Recouvrement** : Suivi des paiements et des impayés.

### 🔹 Module Dépenses & Achats
- **Catégorisation** :
  - **Exploitation** : Carburant, Pièces, Entretien (TVA Déductible sous conditions).
  - **Structure** : Loyer, Électricité, Téléphone.
  - **Personnel** : Avances, Primes.
  - **Personnelle (Gérant)** : Dépenses non déductibles (Compte Courant Associé).
- **Règles Fiscales** :
  - TVA Carburant : Récupérable pour les véhicules de transport (Camions).
  - TVA Tourisme : Non récupérable.

### 🔹 Module RH & Paie
- **Fiches Employés** : Suivi administratif (CIN, CNSS, Permis).
- **Calcul Paie** :
  - Salaire de Base + Primes (Rendement/Trajet).
  - **CNSS** : Part Salariale (**9.18%**), Part Patronale (**16.57%** + TFP/Foprolos).
  - **IRPP** : Barème progressif (0% à 35%) avec déductions (Chef de famille, Enfants).

### 🔹 Module Comptabilité & Reporting
- **Tableaux de Bord** : CA Mensuel, Dépenses par Camion, Rentabilité.
- **Déclarations Fiscales** :
  - Déclaration Mensuelle (TVA, RS, TFP, Foprolos).
  - Déclaration CNSS (Trimestrielle).
  - Bilan Annuel (Compte de Résultat).

---

## 2. Schéma de Base de Données (PostgreSQL)

Le schéma relationnel garantit l'intégrité des données (voir fichier `database.sql` pour le script complet).

### Entités Principales
- `companies` : Tenants, Clients, Fournisseurs.
- `vehicles` : Parc roulant avec alertes dates d'expiration.
- `employees` : Chauffeurs et staff.
- `missions` : Opérations de transport.
- `invoices` : Factures ventes (Lien avec Clients).
- `expenses` : Factures achats (Lien avec Véhicules/Chauffeurs).
- `payrolls` : Bulletins de paie mensuels.

---

## 3. Logique de Calcul & Règles Fiscales (Tunisie 2025)

### A. TVA (Taxe sur la Valeur Ajoutée)
- **Taux Transport** : 7% sur le CA HT.
- **Déductibilité** :
  - TVA sur Achats (Pièces, Carburant Camions) : 100% Déductible.
  - TVA sur Achats (Tourisme, Cadeaux) : Non Déductible (Charge).
- **Formule** : `TVA à Payer = (TVA Collectée - TVA Déductible - Crédit Reporté)`.

### B. Retenue à la Source (RS)
- **Taux** : 1% sur le montant TTC des factures > 1000 TND.
- **Mécanisme** : Le client paie le Net (TTC - RS) et délivre un certificat de retenue.
- **Comptabilisation** : Crédit d'impôt imputable sur l'IS/IRPP.

### C. Charges Sociales (CNSS)
- **Assiette** : Salaire Brut (Base + Primes + Avantages).
- **Taux** :
  - Employé : 9.18% (Retenu sur salaire).
  - Employeur : 16.57% (CNSS) + 0.5% (Accident) + 1% (TFP) + 1% (Foprolos) = ~19-20%.

---

## 4. Bonnes Pratiques Comptables (Transport Routier)

### 1. Séparation des Patrimoines
- **Impératif** : Ne pas mélanger les dépenses personnelles du gérant avec celles de l'entreprise.
- **Solution** : Utiliser la catégorie `PERSONAL` pour toute dépense privée payée par la société (passée en Compte Courant Associé, non déductible).

### 2. Suivi Analytique par Véhicule
- Affecter chaque dépense (Carburant, Pneu) à un véhicule spécifique (`vehicle_id`).
- Permet de calculer le **Coût de Revient Kilométrique (CRK)** et d'identifier les véhicules non rentables.

### 3. Gestion du Cash (Espèces)
- La loi de finances limite les paiements en espèces > 5000 TND.
- **Recommandation** : Privilégier Chèques/Virements pour la traçabilité et la déductibilité fiscale.

### 4. Justificatifs
- Chaque dépense doit être justifiée par une facture conforme (Matricule Fiscal, Date, Montant HT/TVA).
- Les "Bons" manuscrits ne sont pas déductibles fiscalement.

### 5. Prévention Fiscale
- Vérifier systématiquement l'attestation de non-retenue des clients exonérés.
- Suivre les échéances Vignettes et Assurances pour éviter les amendes.
