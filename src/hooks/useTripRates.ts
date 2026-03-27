import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { TripRate } from '../../types';
import { db } from '../lib/db';
import { generateId } from '../utils/uuid';

export const useTripRates = () => {
    return useQuery({
        queryKey: ['tripRates'],
        queryFn: async () => {
            const localData = await db.tripRates.toArray();

            if (navigator.onLine && isSupabaseConfigured()) {
                try {
                    const { data, error } = await supabase.from('trip_rates').select('*');
                    if (error) throw error;
                    
                    const remoteData = data as TripRate[];
                    
                    const remoteIds = new Set(remoteData.map(d => d.id));
                    const localOnly = localData.filter(l => !remoteIds.has(l.id!));
                    const merged = [...remoteData, ...localOnly];

                    if (remoteData.length > 0) {
                        await db.tripRates.bulkPut(remoteData);
                    }
                    return merged;
                } catch (err) {
                    console.warn('[useTripRates] Network fetch failed, falling back to local DB', err);
                }
            }
            return localData;
        },
        staleTime: 1000 * 60 * 2,
    });
};

export const useUpdateTripRates = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (rates: TripRate[]) => {
            const processedRates = rates.map(r => ({
                ...r,
                id: r.id || generateId(),
                updated_at: new Date().toISOString()
            }));

            // 1. Save locally
            await db.tripRates.bulkPut(processedRates);

            // 2. Write to Supabase sequentially
            if (navigator.onLine && isSupabaseConfigured()) {
                try {
                    // Supabase allows array inserts/upserts
                    const { error } = await supabase.from('trip_rates').upsert(processedRates);
                    if (error) throw error;
                    console.log(`[useTripRates] ${processedRates.length} TripRates saved to Supabase`);
                } catch (err) {
                    console.error('[useTripRates] Supabase bulk write failed:', err);
                    throw err;
                }
            } else {
                console.warn('[useTripRates] Offline - TripRates saved locally only');
            }

            return processedRates;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['tripRates'] });
        },
    });
};
