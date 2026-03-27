-- Supabase SQL Init Script for Momo-Logistics
-- Copy and paste this script into the Supabase SQL Editor to initialize your database structure.

-- Enable UUID extension globally if not already
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
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
  created_at timestamp with time zone DEFAULT now(),
  next_billing_date timestamp with time zone
);

-- Insert default tenant required by the app
INSERT INTO tenants (id, name, plan) VALUES ('T001', 'Default Tenant', 'Découverte') ON CONFLICT DO NOTHING;

-- 2. Create companies table (Clients and Suppliers)
CREATE TABLE IF NOT EXISTS companies (
  id text PRIMARY KEY,
  tenant_id text NOT NULL DEFAULT 'T001',
  name text NOT NULL,
  matricule_fiscale text,
  registre_commerce text,
  address text,
  is_client boolean DEFAULT false,
  is_supplier boolean DEFAULT false,
  tva_assujetti boolean DEFAULT true,
  contact_email text,
  contact_phone text,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id text PRIMARY KEY,
  tenant_id text NOT NULL DEFAULT 'T001',
  matricule text NOT NULL,
  type text NOT NULL,
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
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Create employees table (including drivers)
CREATE TABLE IF NOT EXISTS employees (
  id text PRIMARY KEY,
  tenant_id text NOT NULL DEFAULT 'T001',
  company_id text,
  cin text,
  cnss_number text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role text NOT NULL,
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
  created_at timestamp with time zone DEFAULT now()
);

-- 5. Create missions table (operations)
CREATE TABLE IF NOT EXISTS missions (
  id text PRIMARY KEY,
  tenant_id text NOT NULL DEFAULT 'T001',
  vehicle_id text,
  driver_id text,
  client_id text,
  departure_location text,
  destination_location text,
  distance_km numeric,
  cargo_weight_tonnes numeric,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  waybill_number text,
  waybill_date date,
  piece_number text,
  status text NOT NULL,
  agreed_price_ttc numeric,
  invoice_id text,
  created_at timestamp with time zone DEFAULT now()
);

-- 6. Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
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
  created_at timestamp with time zone DEFAULT now()
);

-- 7. Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id text PRIMARY KEY,
  tenant_id text NOT NULL DEFAULT 'T001',
  number text NOT NULL,
  client_id text NOT NULL,
  date date NOT NULL,
  due_date date,
  total_ht numeric,
  tva_rate numeric,
  tva_amount numeric,
  timbre_fiscal numeric,
  apply_rs boolean DEFAULT false,
  rs_rate numeric,
  rs_amount numeric,
  total_ttc numeric,
  net_to_pay numeric,
  status text NOT NULL,
  attachment_url text,
  created_at timestamp with time zone DEFAULT now()
);

-- 8. Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id text REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  mission_id text,
  quantity numeric,
  unit_price numeric,
  trajet text,
  pref_p text,
  piece_no text,
  devise text DEFAULT 'TND'
);

-- 9. (Optional but recommended) Disable RLS for now or add policies
-- Since this is an offline-first app that might be connecting straight dynamically,
-- ensure the tables are fully accessible to authenticated/anon users depending on your setup.
-- If needed, run:
-- ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE missions DISABLE ROW LEVEL SECURITY;
-- (applies to all tables)

-- 10. Create required storage buckets (skip if they already exist)
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('expenses', 'expenses', true) ON CONFLICT DO NOTHING;
