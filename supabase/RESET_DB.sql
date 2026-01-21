-- ⚠️ DANGER ZONE: This script deletes ALL data and tables ⚠️
-- Exécutez ce script pour repartir sur une base de données PROPRE et COMPLÈTE.

-- 0. Extensions Required
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Drop Tables (Cleanup)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

DROP TABLE IF EXISTS driver_activities CASCADE;
DROP TABLE IF EXISTS daily_activities CASCADE;
DROP TABLE IF EXISTS trip_rates CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS missions CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- 2. Create Base Tables (Tenants & Users)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT DEFAULT 'OBSERVATEUR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Companies (Clients & Suppliers)
CREATE TABLE companies (
    id TEXT PRIMARY KEY, -- C001, F002 (Manual IDs from app)
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    matricule_fiscale TEXT,
    address TEXT,
    is_client BOOLEAN DEFAULT FALSE,
    is_supplier BOOLEAN DEFAULT FALSE,
    contact_email TEXT,
    contact_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Vehicles
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    matricule TEXT NOT NULL,
    type TEXT, -- Camion, Remorque...
    brand TEXT,
    model TEXT,
    chassis_number TEXT,
    purchase_date DATE,
    purchase_price NUMERIC DEFAULT 0,
    owner_id TEXT, -- Added owner_id (FK to companies or text)
    
    -- Expiry Dates
    insurance_expiry DATE,
    vignette_expiry DATE,
    technical_visit_expiry DATE,
    extinguisher_expiry DATE,
    tacho_calibration_expiry DATE,
    
    mileage INTEGER DEFAULT 0,
    image_url TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(matricule)
);

-- 5. Create Employees
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL, -- Combined First/Last for simplicity or match UI
    role TEXT, -- Chauffeur, Admin...
    cin TEXT,
    cnss_number TEXT,
    base_salary NUMERIC DEFAULT 0,
    marital_status TEXT,
    children_count INTEGER DEFAULT 0,
    license_number TEXT,
    license_expiry DATE,
    phone TEXT, 
    email TEXT,
    
    -- Fields from UI Form
    username TEXT,
    password TEXT,
    vehicle_matricule TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create Missions
CREATE TABLE missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    
    -- Form Fields Alignment
    client_name TEXT,           -- Client / Nom du client
    departure TEXT,             -- Départ
    destination TEXT,           -- Destination
    cargo_description TEXT,     -- Marchandise / Cargaison
    
    start_date TIMESTAMP WITH TIME ZONE, -- Date
    end_date TIMESTAMP WITH TIME ZONE,
    
    status TEXT DEFAULT 'Planifiée',
    price_ht NUMERIC DEFAULT 0,  -- Renaming agreed_price for clarity/hook match
    
    -- Legacy/Compat fields
    mission_number TEXT, 
    distance_km NUMERIC DEFAULT 150, -- Keeping for legacy compat
    
    -- Bon de Livraison (BL)
    waybill_number TEXT, -- Numéro de BL (Bon de Livraison)
    waybill_date DATE, -- Date de BL (Bon de Livraison)
    
    -- Pièce N° (distincte du BL, pour facture)
    piece_number TEXT, -- Pièce N° (référence pièce pour facture, distincte du BL)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create Expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    
    category TEXT,
    description TEXT,
    date DATE DEFAULT CURRENT_DATE,
    
    invoice_ref_supplier TEXT, -- Réf. Pièce (Facture)
    
    amount_ht NUMERIC DEFAULT 0,
    tva_rate NUMERIC DEFAULT 19,
    tva_amount NUMERIC DEFAULT 0,
    amount_ttc NUMERIC DEFAULT 0,
    
    is_deductible BOOLEAN DEFAULT TRUE,
    payment_status TEXT DEFAULT 'Unpaid',
    
    fuel_liters NUMERIC DEFAULT NULL, -- Quantité de carburant en litres
    
    attachment_url TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    number TEXT NOT NULL,
    client_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
    client_name TEXT, -- Denormalized for display
    
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    
    status TEXT DEFAULT 'Brouillon',
    
    -- Items Storage (JSONB for flexibility)
    items JSONB DEFAULT '[]'::jsonb,
    
    -- Financials
    amount_ht NUMERIC DEFAULT 0,
    tva_rate NUMERIC DEFAULT 19,
    tva_amount NUMERIC DEFAULT 0,
    timbre_fiscal NUMERIC DEFAULT 1.000,
    amount_ttc NUMERIC DEFAULT 0,
    
    -- Retenue à la Source
    apply_rs BOOLEAN DEFAULT FALSE,
    rs_rate NUMERIC DEFAULT 0,
    rs_amount NUMERIC DEFAULT 0,
    net_to_pay NUMERIC DEFAULT 0,
    
    attachment_url TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Create Trip Rates (Tarification)
CREATE TABLE trip_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    departure TEXT NOT NULL,
    destination TEXT NOT NULL,
    truck_price NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Create Daily Activities (Simulated)
CREATE TABLE daily_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    
    revenue NUMERIC DEFAULT 0,
    expenses NUMERIC DEFAULT 0,
    profit NUMERIC DEFAULT 0,
    start_km INTEGER,
    end_km INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, vehicle_id, date)
);

-- 11. Create Driver Activities (Payroll - Monthly Stats)
CREATE TABLE driver_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    
    route_name TEXT NOT NULL, -- "Sbeitla - Tunis"
    count INTEGER DEFAULT 0,
    
    month TEXT, -- YYYY-MM (Optional if we want history, currently app overwrites)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(driver_id, route_name) -- Constraint for Upsert
);


-- 11. ENABLE ROW LEVEL SECURITY (RLS) & POLICIES
-- Policy: "Authenticated users can do EVERYTHING" (Simple & Secure for internal app)

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_activities ENABLE ROW LEVEL SECURITY;

-- Apply "Access All" Policy
CREATE POLICY "Enable all for auth users" ON tenants FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for auth users" ON user_profiles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for auth users" ON companies FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for auth users" ON vehicles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for auth users" ON employees FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for auth users" ON missions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for auth users" ON expenses FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for auth users" ON invoices FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for auth users" ON trip_rates FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for auth users" ON daily_activities FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for auth users" ON driver_activities FOR ALL USING (auth.role() = 'authenticated');


-- 12. STORAGE BUCKETS
-- Insert public buckets if they don't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vehicles', 'vehicles', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Drop existing policies first to facilitate re-runs
DROP POLICY IF EXISTS "Public Access Vehicles" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload Vehicles" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update Vehicles" ON storage.objects;

DROP POLICY IF EXISTS "Public Access Documents" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload Documents" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update Documents" ON storage.objects;

CREATE POLICY "Public Access Vehicles" ON storage.objects FOR SELECT USING (bucket_id = 'vehicles');
CREATE POLICY "Auth Upload Vehicles" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'vehicles' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Update Vehicles" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'vehicles' AND auth.role() = 'authenticated');

CREATE POLICY "Public Access Documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
CREATE POLICY "Auth Upload Documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Update Documents" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');


-- 13. USER MANAGEMENT TRIGGERS
-- Automatically create a user_profile when a new user signs up via Supabase Auth

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_tenant_id UUID;
BEGIN
    -- 1. Create a default Tenant for this user
    INSERT INTO public.tenants (name)
    VALUES ('Mon Entreprise')
    RETURNING id INTO new_tenant_id;

    -- 2. Create the User Profile linked to this Tenant
    INSERT INTO public.user_profiles (id, tenant_id, full_name, role)
    VALUES (new.id, new_tenant_id, new.raw_user_meta_data->>'full_name', 'ADMIN');

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger checks
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 14. FIX EXISTING USERS (Backfill)
-- If users already exist in auth.users, create their profiles/tenants now.
-- This prevents "User not found" errors for accounts created before this reset.
DO $$
DECLARE
    u record;
    new_tenant_id uuid;
BEGIN
    FOR u IN SELECT * FROM auth.users LOOP
        -- Check if profile exists (it shouldn't since we dropped and recreated the table)
        IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = u.id) THEN
            -- Create Tenant
            INSERT INTO public.tenants (name) VALUES ('Mon Entreprise (Retauré)') RETURNING id INTO new_tenant_id;
            
            -- Create Profile
            INSERT INTO public.user_profiles (id, tenant_id, full_name, role)
            VALUES (u.id, new_tenant_id, COALESCE(u.raw_user_meta_data->>'full_name', 'Utilisateur'), 'ADMIN');
        END IF;
    END LOOP;
END $$;

-- 15. CREATE DEFAULT TENANT (if none exists)
-- This ensures there's always at least one tenant for the application to use
INSERT INTO public.tenants (name)
SELECT 'Tenant Principal'
WHERE NOT EXISTS (SELECT 1 FROM public.tenants);

-- Note: If you're using RLS (Row Level Security), you may need to:
-- 1. Disable RLS temporarily: ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
-- 2. Or create the tenant manually in Supabase Dashboard: SQL Editor -> INSERT INTO tenants (name) VALUES ('Tenant Principal');



