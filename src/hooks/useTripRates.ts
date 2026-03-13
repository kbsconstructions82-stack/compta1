import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    db as firestoreDb,
    collection,
    getDocs,
    isFirebaseConfigured,
} from '../lib/firebase';
import { TripRate } from '../../types';
import { db, addToSyncQueue } from '../lib/db';
import { syncService } from '../services/syncService';
import { generateId } from '../utils/uuid';

export const useTripRates = () => {
    return useQuery({
        queryKey: ['tripRates'],
        queryFn: async () => {
            // 1. Try Firestore if online
            if (navigator.onLine && isFirebaseConfigured()) {
                try {
                    const snap = await getDocs(collection(firestoreDb, 'trip_rates'));
                    const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as TripRate[];
                    // 2. Update Local DB
                    await db.tripRates.bulkPut(data);
                    return data;
                } catch (err) {
                    console.warn('Network fetch failed, falling back to local DB', err);
                }
            }
            // 3. Fallback to Dexie
            return db.tripRates.toArray();
        },
        staleTime: 1000 * 60 * 5,
    });
};

export const useUpdateTripRates = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (rates: TripRate[]) => {
            const processedRates = rates.map(r => ({
                ...r,
                id: r.id || generateId(),
            }));

            await db.tripRates.bulkPut(processedRates);

            for (const rate of processedRates) {
                const isNew = !rates.find(original => original.id === rate.id && original.id);
                await addToSyncQueue('trip_rates', isNew ? 'CREATE' : 'UPDATE', rate);
            }

            if (navigator.onLine) syncService.processQueue();
            return processedRates;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['tripRates'] });
            await queryClient.refetchQueries({ queryKey: ['tripRates'] });
        },
    });
};
