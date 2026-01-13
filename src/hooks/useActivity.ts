
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { db, addToSyncQueue, DriverActivity } from '../lib/db';
import { syncService } from '../services/syncService';

export const useActivity = () => {
    return useQuery({
        queryKey: ['activity'],
        queryFn: async () => {
            let data: DriverActivity[] = [];

            // 1. Try to fetch from Supabase if online
            if (navigator.onLine && isSupabaseConfigured()) {
                try {
                    const { data: remoteData, error } = await supabase
                        .from('driver_activities')
                        .select('*');

                    if (error) throw error;

                    if (remoteData) {
                        // 2. Update Local DB
                        // Note: driver_activities has composite key [driver_id+route_name]
                        await db.driverActivities.bulkPut(remoteData as DriverActivity[]);
                        data = remoteData as DriverActivity[];
                    }
                } catch (err) {
                    console.warn('Network fetch failed, falling back to local DB', err);
                }
            }
            
            // 3. Fallback to Dexie if no network data (or failed)
            if (data.length === 0) {
                 data = await db.driverActivities.toArray();
            }

            // Transform [ { driver_id, route_name, count } ]
            // into Record<string, Record<string, number>>
            const activityMap: Record<string, Record<string, number>> = {};

            (data || []).forEach((row: DriverActivity) => {
                if (!activityMap[row.driver_id]) {
                    activityMap[row.driver_id] = {};
                }
                activityMap[row.driver_id][row.route_name] = row.count;
            });

            return activityMap;
        },
    });
};

export const useUpdateActivity = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: { driverId: string; routeName: string; count: number }) => {
            const { driverId, routeName, count } = data;
            
            const payload: DriverActivity = {
                driver_id: driverId,
                route_name: routeName,
                count: count
            };

            // 1. Update Local DB
            // Dexie 'put' works with composite keys if defined in schema
            await db.driverActivities.put(payload);

            // 2. Add to Sync Queue (UPSERT)
            await addToSyncQueue('driver_activities', 'UPSERT', payload);

            // 3. Trigger Sync
            if (navigator.onLine && isSupabaseConfigured()) {
                syncService.processQueue();
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activity'] });
        },
    });
};
