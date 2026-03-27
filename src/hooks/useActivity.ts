import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { db, DriverActivity } from '../lib/db';

export const useActivity = () => {
    return useQuery({
        queryKey: ['activity'],
        queryFn: async () => {
            let data: DriverActivity[] = [];

            // 1. Try Supabase if online
            if (navigator.onLine) {
                try {
                    const { data: remoteData, error } = await supabase
                        .from('driver_activities')
                        .select('*');

                    if (error) throw error;
                    
                    if (remoteData && remoteData.length > 0) {
                        // 2. Update Local DB
                        await db.driverActivities.bulkPut(remoteData as DriverActivity[]);
                        data = remoteData as DriverActivity[];
                    }
                } catch (err) {
                    console.warn('Network fetch failed, falling back to local DB', err);
                }
            }

            // 3. Fallback to Dexie if no network data
            if (data.length === 0) {
                data = await db.driverActivities.toArray();
            }

            // Transform to activityMap
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

            const docId = `${driverId}_${routeName.replace(/[^a-zA-Z0-9]/g, '_')}`;

            const payload: DriverActivity = {
                id: docId,
                driver_id: driverId,
                route_name: routeName,
                count: count,
            };

            // 1. Update Local DB
            await db.driverActivities.put(payload);

            // 2. In Supabase, upsert
            if (navigator.onLine) {
                const { error } = await supabase.from('driver_activities').upsert(payload);
                if (error) throw error;
            } else {
                throw new Error("Impossible d'enregistrer l'activité hors ligne");
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activity'] });
        },
    });
};
