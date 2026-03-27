import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
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
            // Always load local data first
            const localData = await db.drivers.toArray();

            // Try Supabase if online
            if (navigator.onLine && isSupabaseConfigured()) {
                try {
                    const { data, error } = await supabase
                        .from('employees')
                        .select('*')
                        .order('created_at', { ascending: false });
                        
                    if (error) throw error;
                    const remoteData = data;

                    // Merge
                    const remoteIds = new Set(remoteData.map((d: any) => d.id));
                    const localOnly = localData.filter(l => !remoteIds.has(l.id));
                    const merged = [...remoteData, ...localOnly];

                    if (remoteData.length > 0) {
                        await db.drivers.bulkPut(remoteData as Employee[]);
                    }
                    return merged.map(mapToApp);
                } catch (err) {
                    console.warn('[useEmployees] Network fetch failed, falling back to local DB', err);
                }
            }
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

            // 1. Save to Dexie immediately
            await db.drivers.put(dbPayload as any);

            let authResult = { success: false, message: '', code: '' };

            // 2. Write directly to Supabase if online
            if (navigator.onLine && isSupabaseConfigured()) {
                try {
                    const { error } = await supabase.from('employees').insert(dbPayload);
                    if (error) throw error;
                    console.log('[useEmployees] Employee saved to Supabase:', tempId);
                    authResult = { success: true, message: 'Employé créé en base de données.', code: '' };
                } catch (err) {
                    console.error('[useEmployees] Supabase write failed:', err);
                    throw err; 
                }
            } else {
                console.warn('[useEmployees] Offline - employee saved locally only');
                authResult = { success: false, message: 'Sauvegardé hors ligne.', code: 'offline' };
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

            // 2. Write directly to Supabase if online
            if (navigator.onLine && isSupabaseConfigured()) {
                try {
                    const { error } = await supabase.from('employees').upsert(dbPayload);
                    if (error) throw error;
                    console.log('[useEmployees] Employee updated in Supabase:', employee.id);
                } catch (err) {
                    console.error('[useEmployees] Supabase update failed:', err);
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

            // 2. Delete from Supabase if online
            if (navigator.onLine && isSupabaseConfigured()) {
                try {
                    const { error } = await supabase.from('employees').delete().eq('id', id);
                    if (error) throw error;
                    console.log('[useEmployees] Employee deleted from Supabase:', id);
                } catch (err) {
                    console.error('[useEmployees] Supabase delete failed:', err);
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
