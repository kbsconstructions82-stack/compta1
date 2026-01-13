-- Architecture de Base de Données Unifiée - Transport Tunisie
-- Version: 2.0.0
-- Date: 2025-01-08

-- ==========================================
-- 1. TABLES PRINCIPALES (ENTITÉS)
-- ==========================================

-- Table: Clients (Sociétés clientes)
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    code_client VARCHAR(50) UNIQUE NOT NULL,
    raison_sociale VARCHAR(255) NOT NULL,
    matricule_fiscale VARCHAR(50) UNIQUE NOT NULL, -- MF
    adresse TEXT,
    ville VARCHAR(100),
    contact_nom VARCHAR(100),
    contact_email VARCHAR(255),
    contact_tel VARCHAR(50),
    conditions_paiement INT DEFAULT 30, -- Jours
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: Camions (Flotte)
CREATE TABLE camions (
    id SERIAL PRIMARY KEY,
    immatriculation VARCHAR(20) UNIQUE NOT NULL, -- 123 TU 4567
    marque VARCHAR(50),
    modele VARCHAR(50),
    date_achat DATE,
    date_mise_circulation DATE,
    charge_utile NUMERIC(10,2), -- Tonnes
    statut VARCHAR(20) DEFAULT 'ACTIF', -- ACTIF, MAINTENANCE, VENDU
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: Chauffeurs
CREATE TABLE chauffeurs (
    id SERIAL PRIMARY KEY,
    cin VARCHAR(20) UNIQUE NOT NULL,
    nom_complet VARCHAR(150) NOT NULL,
    date_naissance DATE,
    num_permis VARCHAR(50),
    type_permis VARCHAR(20),
    cnss_matricule VARCHAR(50),
    salaire_base NUMERIC(12,3),
    statut VARCHAR(20) DEFAULT 'ACTIF',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. TABLES OPÉRATIONNELLES
-- ==========================================

-- Table: Missions (Trajets)
CREATE TABLE missions (
    id SERIAL PRIMARY KEY,
    reference VARCHAR(50) UNIQUE NOT NULL, -- MIS-2025-001
    date_debut TIMESTAMP NOT NULL,
    date_fin TIMESTAMP,
    id_camion INT REFERENCES camions(id),
    id_chauffeur INT REFERENCES chauffeurs(id),
    id_client INT REFERENCES clients(id),
    lieu_depart VARCHAR(100),
    lieu_arrivee VARCHAR(100),
    distance_km NUMERIC(10,2),
    statut VARCHAR(20) CHECK (statut IN ('PLANIFIEE', 'EN_COURS', 'LIVREE', 'INCOMPLETE', 'ANNULEE')),
    marchandise VARCHAR(255),
    poids_kg NUMERIC(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. TABLES TRANSACTIONNELLES (FACTURATION & DÉPENSES)
-- ==========================================

-- Table: Factures (Ventes)
CREATE TABLE factures (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(50) UNIQUE NOT NULL, -- FAC-2025-001
    date_emission DATE NOT NULL,
    date_echeance DATE,
    id_client INT NOT NULL REFERENCES clients(id),
    id_mission INT REFERENCES missions(id), -- Lien optionnel (1 facture peut grouper plusieurs missions)
    montant_ht NUMERIC(12,3) NOT NULL,
    taux_tva NUMERIC(5,2) DEFAULT 7.00, -- 7% Transport
    montant_tva NUMERIC(12,3) NOT NULL,
    timbre_fiscal NUMERIC(12,3) DEFAULT 1.000,
    montant_ttc NUMERIC(12,3) NOT NULL,
    retenue_source NUMERIC(12,3) DEFAULT 0, -- RS 1%
    statut VARCHAR(20) DEFAULT 'BROUILLON', -- BROUILLON, VALIDEE, PAYEE, RETARD, ANNULEE
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: Dépenses (Achats)
CREATE TABLE depenses (
    id SERIAL PRIMARY KEY,
    reference VARCHAR(50), -- Numéro facture fournisseur
    date_depense DATE NOT NULL,
    categorie VARCHAR(50) NOT NULL, -- CARBURANT, ENTRETIEN, PEAGE, SALAIRE, LOYER, DIVERS
    description TEXT,
    id_camion INT REFERENCES camions(id), -- Allocation analytique
    id_chauffeur INT REFERENCES chauffeurs(id),
    fournisseur VARCHAR(100),
    matricule_fiscale_fournisseur VARCHAR(50),
    montant_ht NUMERIC(12,3) NOT NULL,
    taux_tva NUMERIC(5,2),
    montant_tva NUMERIC(12,3),
    montant_ttc NUMERIC(12,3) NOT NULL,
    est_deductible BOOLEAN DEFAULT TRUE,
    mode_paiement VARCHAR(50), -- ESPECES, CHEQUE, VIREMENT
    statut VARCHAR(20) DEFAULT 'COMPTABILISEE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. TABLES FINANCIÈRES (MOTEUR CENTRAL)
-- ==========================================

-- Table: Transactions (Ledger Central)
-- Cette table centralise tous les mouvements financiers pour le cash-flow
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    date_transaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(20) CHECK (type IN ('RECETTE', 'DEPENSE')),
    montant NUMERIC(12,3) NOT NULL,
    devise VARCHAR(3) DEFAULT 'TND',
    reference_type VARCHAR(50), -- FACTURE, DEPENSE, SALAIRE, CAPITAL
    reference_id INT, -- ID de la facture ou dépense
    categorie_financiere VARCHAR(50), -- EXPLOITATION, INVESTISSEMENT, FINANCEMENT
    description TEXT,
    solde_apres NUMERIC(12,3), -- Snapshot du solde trésorerie
    id_camion INT REFERENCES camions(id) -- Pour calcul rentabilité par camion
);

-- Table: Journal TVA (TVA Engine)
CREATE TABLE journal_tva (
    id SERIAL PRIMARY KEY,
    date_ecriture DATE NOT NULL,
    periode VARCHAR(7), -- '2025-01'
    type_operation VARCHAR(20) CHECK (type_operation IN ('COLLECTEE', 'DEDUCTIBLE')),
    base_ht NUMERIC(12,3),
    taux NUMERIC(5,2),
    montant_tva NUMERIC(12,3),
    reference_source VARCHAR(100), -- Lien vers facture/dépense
    est_declaree BOOLEAN DEFAULT FALSE,
    date_declaration DATE
);

-- ==========================================
-- 5. INDEX & PERFORMANCE
-- ==========================================

CREATE INDEX idx_missions_statut ON missions(statut);
CREATE INDEX idx_factures_client ON factures(id_client);
CREATE INDEX idx_factures_statut ON factures(statut);
CREATE INDEX idx_depenses_camion ON depenses(id_camion);
CREATE INDEX idx_transactions_date ON transactions(date_transaction);
CREATE INDEX idx_journal_tva_periode ON journal_tva(periode);
