
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { TripRate } from '../../types';
import { db, addToSyncQueue } from '../lib/db';
import { syncService } from '../services/syncService';
import { generateId } from '../utils/uuid';

export const useTripRates = () => {
    return useQuery({
        queryKey: ['tripRates'],
        queryFn: async () => {
            // 1. Try to fetch from Supabase if online
            if (navigator.onLine && isSupabaseConfigured()) {
                try {
                    const { data, error } = await supabase
                        .from('trip_rates')
                        .select('*');

                    if (error) throw error;

                    if (data) {
                         // 2. Update Local DB
                        await db.tripRates.bulkPut(data as TripRate[]);
                        return data as TripRate[];
                    }
                } catch (err) {
                    console.warn('Network fetch failed, falling back to local DB', err);
                }
            }

            // 3. Fallback to Dexie
            return await db.tripRates.toArray();
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

export const useUpdateTripRates = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (rates: TripRate[]) => {
            // Process rates: Ensure IDs for local DB
            const processedRates = rates.map(r => ({
                ...r,
                id: r.id || generateId()
            }));

            // 1. Update Local DB
            await db.tripRates.bulkPut(processedRates);

            // 2. Add to Sync Queue
            for (const rate of processedRates) {
                // If it was originally missing ID, it's a CREATE (conceptually), but since we assigned UUID, 
                // we can treat it as UPSERT if we had that action.
                // But SyncService expects CREATE or UPDATE.
                // If we queue as CREATE with UUID, Supabase insert works.
                // If we queue as UPDATE with UUID, Supabase update works ONLY if row exists.
                // So we need to know if it's new.
                const isNew = !rates.find(original => original.id === rate.id && original.id); // Simple check if original had ID
                
                await addToSyncQueue(
                    'trip_rates', 
                    isNew ? 'CREATE' : 'UPDATE', 
                    rate
                );
            }

            // 3. Trigger Sync
            if (navigator.onLine && isSupabaseConfigured()) {
                syncService.processQueue();
            }

            return processedRates;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['tripRates'] });
            await queryClient.refetchQueries({ queryKey: ['tripRates'] });
        },
    });
};
