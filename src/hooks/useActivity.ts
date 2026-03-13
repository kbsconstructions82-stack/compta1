import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    db as firestoreDb,
    collection,
    getDocs,
    doc,
    setDoc,
    isFirebaseConfigured,
} from '../lib/firebase';
import { db, DriverActivity } from '../lib/db';

export const useActivity = () => {
    return useQuery({
        queryKey: ['activity'],
        queryFn: async () => {
            let data: DriverActivity[] = [];

            // 1. Try Firestore if online
            if (navigator.onLine && isFirebaseConfigured()) {
                try {
                    const snap = await getDocs(collection(firestoreDb, 'driver_activities'));
                    const remoteData = snap.docs.map(d => ({ ...d.data() })) as DriverActivity[];
                    // 2. Update Local DB
                    await db.driverActivities.bulkPut(remoteData);
                    data = remoteData;
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

            const payload: DriverActivity = {
                driver_id: driverId,
                route_name: routeName,
                count: count,
            };

            // 1. Update Local DB
            await db.driverActivities.put(payload);

            // 2. In Firestore, use a deterministic ID based on driver + route for upsert behavior
            const docId = `${driverId}_${routeName.replace(/[^a-zA-Z0-9]/g, '_')}`;
            if (navigator.onLine && isFirebaseConfigured()) {
                await setDoc(doc(firestoreDb, 'driver_activities', docId), payload, { merge: true });
            } else {
                throw new Error("Impossible d'enregistrer l'activité hors ligne");
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activity'] });
        },
    });
};
