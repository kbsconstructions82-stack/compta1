-- ============================================================
-- SCRIPT DE CORRECTION COMPLÈTE DU SCHÉMA SUPABASE
-- À exécuter dans le SQL Editor de Supabase (remplace tout)
-- ============================================================

-- Supprimer les tables existantes et les recréer correctement
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS missions CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS driver_activities CASCADE;
DROP TABLE IF EXISTS trip_rates CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tenants
CREATE TABLE tenants (
  id text PRIMARY KEY,
  name text NOT NULL,
  matricule_fiscale text,
  plan text DEFAULT 'Découverte',
  max_users integer DEFAULT 5,
  max_vehicles integer DEFAULT 10,
  storage_limit_gb integer DEFAULT 5,
  current_users integer DEFAULT 0,
  current_vehicles integer DEFAULT 0,
  storage_used_gb integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  next_billing_date timestamptz
);
INSERT INTO tenants (id, name, plan) VALUES ('T001', 'Default Tenant', 'Découverte');

-- 2. Companies (clients et fournisseurs)
-- Colonnes envoyées par useClients: id, tenant_id, is_client, name, matricule_fiscale, address, is_supplier, contact_email, contact_phone, created_at, updated_at
-- Colonnes envoyées par Operations.tsx: id, name, tenant_id, is_client, is_supplier, created_at
CREATE TABLE companies (
  id text PRIMARY KEY,
  tenant_id text NOT NULL DEFAULT 'T001',
  name text NOT NULL,
  matricule_fiscale text DEFAULT '',
  registre_commerce text,
  address text DEFAULT '',
  is_client boolean DEFAULT false,
  is_supplier boolean DEFAULT false,
  tva_assujetti boolean DEFAULT true,
  contact_email text DEFAULT '',
  contact_phone text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Vehicles
-- Colonnes envoyées par useVehicles: spread du type Vehicle + tenant_id, created_at, updated_at
-- Vehicle: id, tenant_id, matricule, type, brand, model, chassis_number, purchase_date, purchase_price,
--          owner_id, insurance_expiry, vignette_expiry, technical_visit_expiry, extinguisher_expiry,
--          tacho_calibration_expiry, mileage, image_url, driver_name, created_at
CREATE TABLE vehicles (
  id text PRIMARY KEY,
  tenant_id text NOT NULL DEFAULT 'T001',
  matricule text NOT NULL,
  type text,
  brand text,
  model text,
  chassis_number text,
  purchase_date date,
  purchase_price numeric,
  owner_id text,
  insurance_expiry date,
  vignette_expiry date,
  technical_visit_expiry date,
  extinguisher_expiry date,
  tacho_calibration_expiry date,
  mileage integer,
  image_url text,
  driver_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Employees (drivers)
-- Colonnes envoyées par useEmployees mapToDB: id, full_name, role, base_salary, marital_status,
--          children_count, cnss_number, phone, email, username, password, vehicle_matricule,
--          tenant_id, cin, created_at, updated_at
CREATE TABLE employees (
  id text PRIMARY KEY,
  tenant_id text NOT NULL DEFAULT 'T001',
  company_id text,
  cin text,
  cnss_number text,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'Chauffeur',
  license_number text,
  license_expiry date,
  base_salary numeric,
  marital_status text,
  children_count integer DEFAULT 0,
  phone text,
  email text,
  vehicle_matricule text,
  username text,
  password text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Missions
-- Colonnes envoyées par useMissions mapMissionToDB: id, mission_number, status, departure, destination,
--          start_date, vehicle_id, driver_id, client_name, cargo_description, distance_km, price_ht,
--          tenant_id, waybill_number, waybill_date, piece_number, created_at, updated_at
CREATE TABLE missions (
  id text PRIMARY KEY,
  tenant_id text NOT NULL DEFAULT 'T001',
  mission_number text,
  status text NOT NULL DEFAULT 'Planifiée',
  departure text,
  destination text,
  start_date timestamptz,
  end_date timestamptz,
  vehicle_id text,
  driver_id text,
  client_id text,
  client_name text,
  cargo_description text,
  distance_km numeric,
  price_ht numeric,
  agreed_price_ttc numeric,
  cargo_weight_tonnes numeric,
  waybill_number text,
  waybill_date date,
  piece_number text,
  invoice_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. Expenses
-- Colonnes envoyées par useExpenses: tout le spread de Expense + tenant_id, created_at, updated_at
-- Expense: id, tenant_id, company_id, supplier_id, vehicle_id, driver_id, category, description,
--          date, invoice_ref_supplier, amount_ht, tva_rate, tva_amount, amount_ttc,
--          is_deductible, payment_status, attachment_url, fuel_liters, created_at
CREATE TABLE expenses (
  id text PRIMARY KEY,
  tenant_id text NOT NULL DEFAULT 'T001',
  company_id text,
  supplier_id text,
  vehicle_id text,
  driver_id text,
  category text NOT NULL,
  description text,
  date date NOT NULL,
  invoice_ref_supplier text,
  amount_ht numeric,
  tva_rate numeric,
  tva_amount numeric,
  amount_ttc numeric NOT NULL,
  is_deductible boolean DEFAULT true,
  payment_status text DEFAULT 'Unpaid',
  attachment_url text,
  fuel_liters numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. Invoices
-- Colonnes envoyées par useInvoices mapToDB: id, number, client_id, client_name, date, due_date,
--          status, items (jsonb), amount_ht, tva_rate, tva_amount, timbre_fiscal, amount_ttc,
--          apply_rs, rs_rate, rs_amount, net_to_pay, attachment_url, tenant_id, created_at, updated_at
CREATE TABLE invoices (
  id text PRIMARY KEY,
  tenant_id text NOT NULL DEFAULT 'T001',
  number text NOT NULL,
  client_id text NOT NULL,
  client_name text,
  date date NOT NULL,
  due_date date,
  status text NOT NULL DEFAULT 'Brouillon',
  items jsonb DEFAULT '[]',
  amount_ht numeric,
  tva_rate numeric,
  tva_amount numeric,
  timbre_fiscal numeric,
  amount_ttc numeric,
  apply_rs boolean DEFAULT false,
  rs_rate numeric,
  rs_amount numeric,
  net_to_pay numeric,
  attachment_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 8. Driver Activities
-- Colonnes envoyées par useActivity: id, driver_id, route_name, count
CREATE TABLE driver_activities (
  id text PRIMARY KEY,
  driver_id text NOT NULL,
  route_name text NOT NULL,
  count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 9. Trip Rates
-- Colonnes envoyées par useTripRates: id, departure, destination, rate, truck_price, updated_at
CREATE TABLE trip_rates (
  id text PRIMARY KEY,
  departure text NOT NULL,
  destination text NOT NULL,
  rate numeric,
  truck_price numeric NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- Buckets de stockage (exécuter séparément si ça échoue)
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('expenses', 'expenses', true) ON CONFLICT DO NOTHING;
