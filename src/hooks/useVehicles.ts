import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Vehicle } from '../../types';
import { useAuth } from './useAuth';
import { getValidTenantUUID, isValidUUID } from '../utils/tenantUtils';
import { db, addToSyncQueue } from '../lib/db';
import { syncService } from '../services/syncService';
import { generateId } from '../utils/uuid';

export const useVehicles = () => {
    return useQuery({
        queryKey: ['vehicles'],
        queryFn: async () => {
            // 1. Try to fetch from Supabase if online
            if (navigator.onLine && isSupabaseConfigured()) {
                try {
                    const { data, error } = await supabase
                        .from('vehicles')
                        .select('*');

                    if (error) throw error;

                    if (data) {
                        // 2. Update Local DB
                        await db.trucks.bulkPut(data as Vehicle[]);
                        return data as Vehicle[];
                    }
                } catch (err) {
                    console.warn('Network fetch failed, falling back to local DB', err);
                }
            }

            // 3. Fallback to Dexie
            const localData = await db.trucks.toArray();
            return localData;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

export const useAddVehicle = () => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    return useMutation({
        mutationFn: async (vehicle: Vehicle) => {
            // Obtenir un tenant UUID valide (ou fallback offline)
            const tenantUUID = await getValidTenantUUID(currentUser?.tenant_id);
            
            if (!tenantUUID) {
                // Should not happen with new tenantUtils logic, but safety check
                throw new Error('Impossible d\'obtenir un tenant UUID.');
            }

            // Remove ID if empty string to let DB generate UUID
            const { id, ...vehicleData } = vehicle;
            let payload: any = { ...vehicleData };
            
            // Only include id if it's a valid UUID (not empty string)
            // Or generate one if missing (for offline creation)
            if (id && id.trim() && isValidUUID(id)) {
                payload.id = id;
            } else {
                payload.id = generateId();
            }

            payload.tenant_id = tenantUUID;

            // Clean up empty strings that might cause issues
            Object.keys(payload).forEach(key => {
                if (payload[key] === '') {
                    delete payload[key];
                }
            });

            // 1. Save to Local DB (Optimistic)
            await db.trucks.put(payload as Vehicle);

            // 2. Add to Sync Queue
            await addToSyncQueue('vehicles', 'CREATE', payload);

            // 3. Trigger Sync if online
            if (navigator.onLine && isSupabaseConfigured()) {
                syncService.processQueue();
            }

            return payload as Vehicle;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            await queryClient.refetchQueries({ queryKey: ['vehicles'] });
        },
    });
};

export const useUpdateVehicle = () => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    return useMutation({
        mutationFn: async (vehicle: Vehicle) => {
             const tenantUUID = await getValidTenantUUID(currentUser?.tenant_id) || 'T001';
             
             // Ensure tenant_id is set
             const payload = { ...vehicle, tenant_id: tenantUUID };

            // 1. Update Local DB
            await db.trucks.put(payload);

            // 2. Add to Sync Queue
            await addToSyncQueue('vehicles', 'UPDATE', payload);

            // 3. Trigger Sync
            if (navigator.onLine && isSupabaseConfigured()) {
                syncService.processQueue();
            }

            return payload;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            await queryClient.refetchQueries({ queryKey: ['vehicles'] });
        },
    });
};

export const useDeleteVehicle = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            // 1. Delete from Local DB
            await db.trucks.delete(id);

            // 2. Add to Sync Queue
            await addToSyncQueue('vehicles', 'DELETE', { id });

            // 3. Trigger Sync
            if (navigator.onLine && isSupabaseConfigured()) {
                syncService.processQueue();
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            await queryClient.refetchQueries({ queryKey: ['vehicles'] });
        }
    });
};
