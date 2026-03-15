import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    db as firestoreDb,
    collection,
    getDocs,
    doc,
    setDoc,
    deleteDoc,
    query,
    orderBy,
    isFirebaseConfigured,
    createDriverAuthAccount,
} from '../lib/firebase';
import { DriverState, Employee } from '../../types';
import { useAuth } from './useAuth';
import * as bcrypt from 'bcryptjs';
import { db } from '../lib/db';
import { generateId } from '../utils/uuid';

// --- Helpers for Mapping ---
const mapToApp = (e: any): DriverState => ({
    id: e.id,
    fullName: e.full_name,
    role: e.role,
    baseSalary: e.base_salary,
    maritalStatus: e.marital_status,
    childrenCount: e.children_count,
    cin: e.cin,
    vehicleMatricule: e.vehicle_matricule,
    username: e.username,
});

const mapToDB = (employee: DriverState, tenantId: string, passwordHash?: string | null, existingCreatedAt?: string) => ({
    id: employee.id,
    full_name: employee.fullName,
    role: employee.role || 'Chauffeur',
    base_salary: employee.baseSalary,
    marital_status: employee.maritalStatus,
    children_count: employee.childrenCount,
    cnss_number: (employee as any).cnss_number || null,
    phone: (employee as any).phone || null,
    email: (employee as any).email || null,
    username: (employee as any).username || null,
    ...(passwordHash ? { password: passwordHash } : {}),
    vehicle_matricule: (employee as any).vehicleMatricule || null,
    tenant_id: tenantId,
    cin: employee.cin || null,
    created_at: existingCreatedAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
});

export const useEmployees = () => {
    return useQuery({
        queryKey: ['employees'],
        queryFn: async () => {
            // Always load local data first (includes pending-sync items)
            const localData = await db.drivers.toArray();

            // Try Firestore if online
            if (navigator.onLine && isFirebaseConfigured()) {
                try {
                    const q = query(collection(firestoreDb, 'employees'), orderBy('created_at', 'desc'));
                    const snap = await getDocs(q);
                    const remoteData = snap.docs.map(d => ({ id: d.id, ...d.data() }));

                    // Merge: remote is source of truth, keep local-only pending items
                    const remoteIds = new Set(remoteData.map((d: any) => d.id));
                    const localOnly = localData.filter(l => !remoteIds.has(l.id));
                    const merged = [...remoteData, ...localOnly];

                    // Update local DB with remote data
                    await db.drivers.bulkPut(remoteData as Employee[]);
                    return merged.map(mapToApp);
                } catch (err) {
                    console.warn('[useEmployees] Network fetch failed, falling back to local DB', err);
                }
            }
            // Fallback to Dexie only
            return localData.map(mapToApp);
        },
        staleTime: 1000 * 60 * 2,
    });
};

export const useAddEmployee = () => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    return useMutation({
        mutationFn: async (employee: DriverState) => {
            const tenantId = currentUser?.tenant_id || 'T001';
            const tempId = employee.id || generateId();
            // Nettoyage du username pour l'email Firebase
            let username = (employee as any).username || '';
            username = username.toLowerCase().replace(/\s+/g, '');
            const employeeWithId = { ...employee, id: tempId, username };

            let passwordHash: string | null = null;
            let plainPassword = (employee as any).password || '';
            if (plainPassword) {
                const salt = bcrypt.genSaltSync(10);
                passwordHash = bcrypt.hashSync(plainPassword, salt);
            }

            const dbPayload = mapToDB(employeeWithId, tenantId, passwordHash);

            // 1. Save to Dexie immediately (optimistic)
            await db.drivers.put(dbPayload as any);

            let authResult = { success: false, message: '', code: '' };

            // 2. Write directly to Firestore if online
            if (navigator.onLine && isFirebaseConfigured()) {
                try {
                    const docRef = doc(firestoreDb, 'employees', tempId);
                    await setDoc(docRef, dbPayload);
                    console.log('[useEmployees] Employee saved to Firestore:', tempId);

                    // 3. Create Firebase Auth User for the driver
                    if (username && plainPassword) {
                        const email = `${username}@compta1.com`;
                        console.log('[useEmployees] Tentative création Auth:', email, plainPassword);
                        try {
                            await createDriverAuthAccount(email, plainPassword);
                            authResult = { success: true, message: 'Compte Auth créé avec succès.', code: '' };
                        } catch (err: any) {
                            if (err?.code === 'auth/email-already-in-use') {
                                authResult = { success: true, message: 'Email déjà utilisé, compte Auth déjà existant.', code: err.code };
                            } else {
                                authResult = { success: false, message: err?.message || 'Erreur inconnue lors de la création du compte Auth.', code: err?.code || '' };
                            }
                        }
                    } else {
                        authResult = { success: false, message: 'Aucun identifiant fourni.', code: 'no-credentials' };
                    }
                } catch (err) {
                    console.error('[useEmployees] Firestore write failed:', err);
                    throw err; // Re-throw so the UI shows the error
                }
            } else {
                console.warn('[useEmployees] Offline - employee saved locally only');
                authResult = { success: false, message: 'Création Auth non tentée (hors ligne ou config Firebase manquante).', code: 'offline' };
            }

            return { employee: mapToApp(dbPayload), authResult };
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['employees'] });
            await queryClient.refetchQueries({ queryKey: ['employees'] });
        },
    });
};

export const useUpdateEmployee = () => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    return useMutation({
        mutationFn: async (employee: DriverState) => {
            const tenantId = currentUser?.tenant_id || 'T001';

            let passwordHash: string | null = null;
            if ((employee as any).password) {
                const pwd = (employee as any).password;
                if (pwd.startsWith('$2a$') || pwd.startsWith('$2b$') || pwd.startsWith('$2y$')) {
                    passwordHash = pwd;
                } else {
                    const salt = bcrypt.genSaltSync(10);
                    passwordHash = bcrypt.hashSync(pwd, salt);
                }
            }

            // Preserve existing created_at
            const existing = await db.drivers.get(employee.id);
            const dbPayload = mapToDB(employee, tenantId, passwordHash, (existing as any)?.created_at);

            // 1. Update Dexie immediately
            await db.drivers.put(dbPayload as any);

            // 2. Write directly to Firestore if online
            if (navigator.onLine && isFirebaseConfigured()) {
                try {
                    const docRef = doc(firestoreDb, 'employees', employee.id);
                    await setDoc(docRef, dbPayload, { merge: true });
                    console.log('[useEmployees] Employee updated in Firestore:', employee.id);
                    
                    // 3. Keep Auth User in sync (Create if it doesn't exist, ignore otherwise)
                    // Note: This won't update the password if it already exists because no API for that via client SDK easily,
                    // but it will create the account if the user was missing from Firebase Auth.
                    if ((employee as any).username && (employee as any).password) {
                        const pwd = (employee as any).password;
                        if (!pwd.startsWith('$2')) { // Only try if it's plaintext
                            const email = `${(employee as any).username.toLowerCase()}@compta1.com`;
                            await createDriverAuthAccount(email, pwd);
                        }
                    }
                } catch (err) {
                    console.error('[useEmployees] Firestore update failed:', err);
                    throw err;
                }
            } else {
                console.warn('[useEmployees] Offline - employee updated locally only');
            }

            return employee;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['employees'] });
            await queryClient.refetchQueries({ queryKey: ['employees'] });
        }
    });
};

export const useDeleteEmployee = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            // 1. Delete from Dexie immediately
            await db.drivers.delete(id);

            // 2. Delete from Firestore if online
            if (navigator.onLine && isFirebaseConfigured()) {
                try {
                    const docRef = doc(firestoreDb, 'employees', id);
                    await deleteDoc(docRef);
                    console.log('[useEmployees] Employee deleted from Firestore:', id);
                } catch (err) {
                    console.error('[useEmployees] Firestore delete failed:', err);
                    throw err;
                }
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['employees'] });
            await queryClient.refetchQueries({ queryKey: ['employees'] });
        }
    });
};
