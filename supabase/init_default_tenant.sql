-- ==========================================
-- Script d'initialisation : Créer un tenant par défaut
-- ==========================================
-- Ce script crée un tenant par défaut si aucun n'existe dans la base de données.
-- À exécuter dans Supabase SQL Editor si vous rencontrez l'erreur :
-- "Impossible de créer ou trouver un tenant" ou problème RLS
--
-- INSTRUCTIONS:
-- 1. Ouvrez Supabase Dashboard
-- 2. Allez dans "SQL Editor"
-- 3. Collez le script ci-dessous et exécutez-le
-- ==========================================

-- SOLUTION RAPIDE: Désactiver RLS temporairement, créer le tenant, puis réactiver
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;

INSERT INTO tenants (name)
SELECT 'Tenant Principal'
WHERE NOT EXISTS (SELECT 1 FROM tenants);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Vérifier que le tenant a été créé
SELECT id, name, created_at FROM tenants;

-- ==========================================
-- Si la solution ci-dessus ne fonctionne pas, utilisez fix_rls_tenant.sql
-- qui contient des solutions plus avancées pour les problèmes RLS
-- ==========================================
