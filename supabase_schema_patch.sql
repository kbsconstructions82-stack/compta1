-- Patch SQL pour corriger les erreurs de schéma
-- À exécuter dans le SQL Editor de Supabase

-- 1. Correction de la table employees
-- L'application envoie "full_name" au lieu de "first_name" et "last_name"
ALTER TABLE employees DROP COLUMN IF EXISTS first_name;
ALTER TABLE employees DROP COLUMN IF EXISTS last_name;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS full_name text;

-- 2. Création de la table driver_activities manquante
CREATE TABLE IF NOT EXISTS driver_activities (
  id text PRIMARY KEY,
  driver_id text NOT NULL,
  route_name text NOT NULL,
  count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Création de la table trip_rates manquante
CREATE TABLE IF NOT EXISTS trip_rates (
  id text PRIMARY KEY,
  departure text NOT NULL,
  destination text NOT NULL,
  rate numeric,
  truck_price numeric NOT NULL,
  updated_at timestamp with time zone DEFAULT now()
);
