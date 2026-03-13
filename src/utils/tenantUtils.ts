// ==========================================
// Utilitaires pour la gestion des tenants
// ==========================================
// Migré de Supabase vers Firebase Firestore
// ==========================================

import {
    db as firestoreDb,
    collection,
    getDocs,
    addDoc,
    isFirebaseConfigured,
} from '../lib/firebase';

// Helper to check if a string is a valid UUID
export const isValidUUID = (str: string): boolean => {
    if (!str || typeof str !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str.trim());
};

/**
 * Obtient un tenant_id UUID valide à partir du tenant_id de l'utilisateur.
 * Avec Firebase, le tenant_id peut être l'UID Firebase directement ou un ID personnalisé.
 */
export const getValidTenantUUID = async (userTenantId: string | undefined): Promise<string | null> => {
    // 1. If userTenantId is already a valid UUID, return it
    if (userTenantId && isValidUUID(userTenantId)) {
        return userTenantId;
    }

    // 2. Check LocalStorage Cache
    const cachedTenant = localStorage.getItem('default_tenant_uuid');
    if (cachedTenant && isValidUUID(cachedTenant)) {
        return cachedTenant;
    }

    // 3. If offline, return nil UUID fallback
    if (!navigator.onLine) {
        console.warn('Offline and no cached tenant UUID. Using offline fallback UUID.');
        return '00000000-0000-0000-0000-000000000000';
    }

    // 4. If Firebase is not configured, return fallback
    if (!isFirebaseConfigured()) {
        return null;
    }

    // 5. Try to fetch first tenant from Firestore
    try {
        const snap = await getDocs(collection(firestoreDb, 'tenants'));
        if (!snap.empty) {
            const firstTenant = snap.docs[0];
            const tenantId = firstTenant.id;
            cacheTenantUUID(tenantId);
            return tenantId;
        }

        // Create a default tenant if none exists
        const tenantName = userTenantId ? `Tenant ${userTenantId}` : 'Default Tenant';
        const newTenantRef = await addDoc(collection(firestoreDb, 'tenants'), {
            name: tenantName,
            created_at: new Date().toISOString(),
        });
        cacheTenantUUID(newTenantRef.id);
        return newTenantRef.id;

    } catch (err) {
        console.error('Unexpected error in getValidTenantUUID:', err);
        return null;
    }
};

/**
 * Version synchrone pour obtenir un tenant UUID (utilise le cache ou localStorage)
 */
export const getTenantUUIDSync = (userTenantId: string | undefined): string | null => {
    if (userTenantId && isValidUUID(userTenantId)) {
        return userTenantId;
    }
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
    if (uuid) {
        localStorage.setItem('default_tenant_uuid', uuid);
    }
};
