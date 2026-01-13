// ==========================================
// Utilitaires pour la gestion des tenants
// ==========================================
// Cette fonction permet de résoudre le problème du tenant_id "T001"
// qui n'est pas un UUID valide mais qui doit être converti en UUID
// pour les tables Supabase qui nécessitent un UUID
// ==========================================

import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Helper to check if a string is a valid UUID
export const isValidUUID = (str: string): boolean => {
    if (!str || typeof str !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str.trim());
};

/**
 * Obtient un tenant_id UUID valide à partir du tenant_id de l'utilisateur
 * Si le tenant_id est déjà un UUID, il est retourné tel quel
 * Sinon, on récupère le premier tenant disponible dans la base de données
 * 
 * @param userTenantId - Le tenant_id de l'utilisateur (peut être "T001" ou un UUID)
 * @returns Promise<string | null> - Un UUID de tenant valide, ou null si aucun n'est trouvé
 */
export const getValidTenantUUID = async (userTenantId: string | undefined): Promise<string | null> => {
    // 1. Check if userTenantId is already a valid UUID
    if (userTenantId && isValidUUID(userTenantId)) {
        return userTenantId;
    }

    // 2. Check LocalStorage Cache (Fastest & Offline support)
    const cachedTenant = localStorage.getItem('default_tenant_uuid');
    if (cachedTenant && isValidUUID(cachedTenant)) {
        return cachedTenant;
    }

    // 3. If Offline, and no cache, return a fallback UUID for offline creation
    // This allows creating data offline even if never synced before (though unlikely for a logged in user)
    // We use a specific UUID for "Offline Default" that we can map later if needed, 
    // or just assume the user will eventually sync and we can fix it then.
    // For now, let's return a valid UUID zero-filled or similar if offline.
    if (!navigator.onLine) {
        console.warn('Offline and no cached tenant UUID. Using offline fallback UUID.');
        // If we have a userTenantId like "T001", we can't use it. 
        // We'll return a deterministic UUID based on it or a generic one.
        // Let's use a "Offline Placeholder" UUID.
        // But better: if we are offline, we probably can't get the REAL tenant ID.
        // If we return a fake one, sync might fail later due to FK constraints.
        // However, we blocked the user before. Now we unblock.
        // Strategy: Return a "Offline-Pending" UUID.
        return '00000000-0000-0000-0000-000000000000'; // Nil UUID
    }

    // 4. If Online, fetch from Supabase
    if (!isSupabaseConfigured()) {
        return null;
    }

    try {
        // Essayer de récupérer le premier tenant disponible
        const { data: tenants, error } = await supabase
            .from('tenants')
            .select('id')
            .order('created_at', { ascending: true })
            .limit(1);

        if (error) {
            console.error('Error fetching tenants:', error);
            return null;
        }

        if (tenants && tenants.length > 0 && tenants[0]?.id) {
            // Cache it!
            cacheTenantUUID(tenants[0].id);
            return tenants[0].id;
        }

        // Si aucun tenant n'existe, essayer d'en créer un
        const tenantName = userTenantId ? `Tenant ${userTenantId}` : 'Default Tenant';
        const { data: newTenant, error: createError } = await supabase
            .from('tenants')
            .insert([{ name: tenantName }])
            .select('id')
            .single();

        if (createError) {
            console.error('Error creating tenant:', createError);
            // Si la création échoue (peut-être RLS), essayer de récupérer à nouveau
            const { data: retryTenants } = await supabase
                .from('tenants')
                .select('id')
                .limit(1)
                .maybeSingle();

            if (retryTenants?.id) {
                cacheTenantUUID(retryTenants.id);
                return retryTenants.id;
            }
            return null;
        }

        if (newTenant?.id) {
            cacheTenantUUID(newTenant.id);
            return newTenant.id;
        }

        return null;
    } catch (err) {
        console.error('Unexpected error in getValidTenantUUID:', err);
        return null;
    }
};

/**
 * Version synchrone pour obtenir un tenant UUID (utilise le cache ou localStorage)
 * À utiliser uniquement si vous êtes sûr qu'un tenant existe déjà
 */
export const getTenantUUIDSync = (userTenantId: string | undefined): string | null => {
    if (userTenantId && isValidUUID(userTenantId)) {
        return userTenantId;
    }
    
    // Essayer de récupérer depuis localStorage (pour le mode développement)
    const cachedTenant = localStorage.getItem('default_tenant_uuid');
    if (cachedTenant && isValidUUID(cachedTenant)) {
        return cachedTenant;
    }
    
    return null;
};

/**
 * Met en cache un tenant UUID dans localStorage
 */
export const cacheTenantUUID = (uuid: string): void => {
    if (isValidUUID(uuid)) {
        localStorage.setItem('default_tenant_uuid', uuid);
    }
};
