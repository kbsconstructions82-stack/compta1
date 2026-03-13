import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    db as firestoreDb,
    collection,
    getDocs,
    doc,
    updateDoc,
    query,
    orderBy,
    isFirebaseConfigured,
} from '../lib/firebase';
import { DriverState, Employee } from '../../types';
import { useAuth } from './useAuth';
import * as bcrypt from 'bcryptjs';
import { db, addToSyncQueue } from '../lib/db';
import { syncService } from '../services/syncService';
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

                    // Merge: remote data is source of truth, but keep local-only items (pending sync)
                    const remoteIds = new Set(remoteData.map((d: any) => d.id));
                    const localOnly = localData.filter(l => !remoteIds.has(l.id));
                    const merged = [...remoteData, ...localOnly];

                    // Update local DB with remote data
                    await db.drivers.bulkPut(remoteData as Employee[]);
                    return merged.map(mapToApp);
                } catch (err) {
                    console.warn('Network fetch failed, falling back to local DB', err);
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
            const employeeWithId = { ...employee, id: tempId };

            let passwordHash: string | null = null;
            if ((employee as any).password) {
                const salt = bcrypt.genSaltSync(10);
                passwordHash = bcrypt.hashSync((employee as any).password, salt);
            }

            const dbPayload = mapToDB(employeeWithId, tenantId, passwordHash);

            await db.drivers.put(dbPayload as any);
            await addToSyncQueue('employees', 'CREATE', dbPayload);
            if (navigator.onLine) syncService.processQueue();

            return mapToApp(dbPayload);
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
            await db.drivers.put(dbPayload as any);
            await addToSyncQueue('employees', 'UPDATE', dbPayload);
            if (navigator.onLine) syncService.processQueue();

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
            await db.drivers.delete(id);
            await addToSyncQueue('employees', 'DELETE', { id });
            if (navigator.onLine) syncService.processQueue();
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['employees'] });
            await queryClient.refetchQueries({ queryKey: ['employees'] });
        }
    });
};
