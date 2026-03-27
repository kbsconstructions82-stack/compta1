import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Vehicle } from '../../types';
import { useAuth } from './useAuth';
import { db } from '../lib/db';
import { generateId } from '../utils/uuid';

export const useVehicles = () => {
    return useQuery({
        queryKey: ['vehicles'],
        queryFn: async () => {
            // Always load local data first (includes pending-sync items)
            const localData = await db.trucks.toArray();

            // Try Supabase if online
            if (navigator.onLine && isSupabaseConfigured()) {
                try {
                    const { data, error } = await supabase.from('vehicles').select('*');
                    if (error) throw error;
                    
                    const remoteData = data as Vehicle[];

                    // Merge: remote is source of truth, but keep local-only pending items
                    const remoteIds = new Set(remoteData.map(d => d.id));
                    const localOnly = localData.filter(l => !remoteIds.has(l.id));
                    const merged = [...remoteData, ...localOnly];

                    // Update local cache
                    if (remoteData.length > 0) {
                        await db.trucks.bulkPut(remoteData);
                    }
                    return merged;
                } catch (err) {
                    console.warn('[useVehicles] Network fetch failed, falling back to local DB', err);
                }
            }
            // Fallback to Dexie only
            return localData;
        },
        staleTime: 1000 * 60 * 2,
    });
};

export const useAddVehicle = () => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    return useMutation({
        mutationFn: async (vehicle: Vehicle) => {
            const newId = generateId();
            const now = new Date().toISOString();
            const payload: any = {
                ...vehicle,
                id: newId,
                tenant_id: currentUser?.tenant_id || 'T001',
                created_at: now,
                updated_at: now,
            };

            // Remove empty string values (but keep id and timestamps)
            Object.keys(payload).forEach(key => {
                if (!['id', 'created_at', 'updated_at', 'tenant_id'].includes(key) && payload[key] === '') {
                    delete payload[key];
                }
            });

            // 1. Save to Dexie immediately (optimistic)
            await db.trucks.put(payload);

            // 2. Write directly to Supabase if online
            if (navigator.onLine && isSupabaseConfigured()) {
                try {
                    const { error } = await supabase.from('vehicles').insert(payload);
                    if (error) throw error;
                    console.log('[useVehicles] Vehicle saved to Supabase:', newId);
                } catch (err) {
                    console.error('[useVehicles] Supabase write failed:', err);
                    throw err; // Re-throw so the UI shows the error
                }
            } else {
                console.warn('[useVehicles] Offline - vehicle saved locally only');
            }

            return payload;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        },
        onError: (err) => {
            console.error('[useVehicles] useAddVehicle error:', err);
        }
    });
};

export const useUpdateVehicle = () => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    return useMutation({
        mutationFn: async (vehicle: Vehicle) => {
            // Preserve existing created_at
            const existing = await db.trucks.get(vehicle.id) as any;
            const payload: any = {
                ...vehicle,
                tenant_id: currentUser?.tenant_id || 'T001',
                created_at: existing?.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            // 1. Update Dexie immediately (optimistic)
            await db.trucks.put(payload);

            // 2. Write directly to Supabase if online
            if (navigator.onLine && isSupabaseConfigured()) {
                try {
                    const { error } = await supabase.from('vehicles').upsert(payload);
                    if (error) throw error;
                    console.log('[useVehicles] Vehicle updated in Supabase:', vehicle.id);
                } catch (err) {
                    console.error('[useVehicles] Supabase update failed:', err);
                    throw err;
                }
            } else {
                console.warn('[useVehicles] Offline - vehicle updated locally only');
            }

            return payload;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        },
    });
};

export const useDeleteVehicle = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            // 1. Delete from Dexie immediately
            await db.trucks.delete(id);

            // 2. Delete from Supabase if online
            if (navigator.onLine && isSupabaseConfigured()) {
                try {
                    const { error } = await supabase.from('vehicles').delete().eq('id', id);
                    if (error) throw error;
                    console.log('[useVehicles] Vehicle deleted from Supabase:', id);
                } catch (err) {
                    console.error('[useVehicles] Supabase delete failed:', err);
                    throw err;
                }
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        }
    });
};
