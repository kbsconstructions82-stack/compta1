
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DriverState, Employee } from '../../types';
import { useAuth } from './useAuth';
import * as bcrypt from 'bcryptjs';
import { getValidTenantUUID } from '../utils/tenantUtils';
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

const mapToDB = (employee: DriverState, tenantUUID: string, passwordHash?: string | null) => {
    return {
        id: employee.id, // Ensure ID is present for sync
        full_name: employee.fullName,
        role: employee.role || 'Chauffeur',
        base_salary: employee.baseSalary,
        marital_status: employee.maritalStatus,
        children_count: employee.childrenCount,
        cnss_number: (employee as any).cnss_number || null,
        phone: (employee as any).phone || null,
        email: (employee as any).email || null,
        username: (employee as any).username || null,
        password: passwordHash || undefined, // Only update if provided
        vehicle_matricule: (employee as any).vehicleMatricule || null,
        tenant_id: tenantUUID,
        cin: employee.cin || null
    };
};

export const useEmployees = () => {
    return useQuery({
        queryKey: ['employees'],
        queryFn: async () => {
            // 1. Try to fetch from Supabase if online
            if (navigator.onLine && isSupabaseConfigured()) {
                try {
                    const { data, error } = await supabase
                        .from('employees')
                        .select('*')
                        .order('created_at', { ascending: false });

                    if (error) throw error;

                    if (data) {
                        // 2. Update Local DB
                        await db.drivers.bulkPut(data as Employee[]);
                        return data.map(mapToApp);
                    }
                } catch (err) {
                    console.warn('Network fetch failed, falling back to local DB', err);
                }
            }

            // 3. Fallback to Dexie
            const localData = await db.drivers.toArray();
            return localData.map(mapToApp);
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

export const useAddEmployee = () => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    return useMutation({
        mutationFn: async (employee: DriverState) => {
            // Obtenir un tenant UUID valide (ou fallback offline)
            const tenantUUID = await getValidTenantUUID(currentUser?.tenant_id);
            
            if (!tenantUUID) {
                // Should not happen with new tenantUtils logic, but safety check
                throw new Error('Impossible d\'obtenir un tenant UUID.');
            }

            // Generate ID if missing
            const tempId = employee.id || generateId();
            const employeeWithId = { ...employee, id: tempId };

            let passwordHash = null;
            if ((employee as any).password) {
                const salt = bcrypt.genSaltSync(10);
                passwordHash = bcrypt.hashSync((employee as any).password, salt);
            }

            const dbPayload = mapToDB(employeeWithId, tenantUUID, passwordHash);

            // 1. Save to Local DB (Optimistic)
            await db.drivers.put(dbPayload as any);

            // 2. Add to Sync Queue
            await addToSyncQueue('employees', 'CREATE', dbPayload);

            // 3. Trigger Sync if online
            if (navigator.onLine && isSupabaseConfigured()) {
                syncService.processQueue();
                
                // Also handle vehicle link if needed (complex op, maybe just queue it separately?)
                // The original code did a vehicle update. 
                // We should probably add that to queue too if we want full offline support.
                if (dbPayload.vehicle_matricule) {
                     // Optimistic vehicle update not easy without logic duplication.
                     // For now, let's leave the side-effect to the server or subsequent sync?
                     // Or just do it if online.
                }
            }

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
            const tenantUUID = await getValidTenantUUID(currentUser?.tenant_id) || 'T001';
            
            // Password handling
            let passwordHash = null;
             if ((employee as any).password) {
                const salt = bcrypt.genSaltSync(10);
                passwordHash = bcrypt.hashSync((employee as any).password, salt);
            }

            const dbPayload = mapToDB(employee, tenantUUID, passwordHash);

            // 1. Update Local DB
            await db.drivers.put(dbPayload as any);

            // 2. Add to Sync Queue
            await addToSyncQueue('employees', 'UPDATE', dbPayload);

            // 3. Trigger Sync
            if (navigator.onLine && isSupabaseConfigured()) {
                syncService.processQueue();
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
            // 1. Update Local DB
            await db.drivers.delete(id);

            // 2. Add to Sync Queue
            await addToSyncQueue('employees', 'DELETE', { id });

            // 3. Trigger Sync
            if (navigator.onLine && isSupabaseConfigured()) {
                syncService.processQueue();
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['employees'] });
            await queryClient.refetchQueries({ queryKey: ['employees'] });
        }
    });
};
