import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    db as firestoreDb,
    collection,
    getDocs,
    doc,
    setDoc,
    isFirebaseConfigured,
} from '../lib/firebase';
import { TripRate } from '../../types';
import { db } from '../lib/db';
import { generateId } from '../utils/uuid';

export const useTripRates = () => {
    return useQuery({
        queryKey: ['tripRates'],
        queryFn: async () => {
            const localData = await db.tripRates.toArray();

            if (navigator.onLine && isFirebaseConfigured()) {
                try {
                    const snap = await getDocs(collection(firestoreDb, 'trip_rates'));
                    const remoteData = snap.docs.map(d => ({ id: d.id, ...d.data() })) as TripRate[];
                    
                    const remoteIds = new Set(remoteData.map(d => d.id));
                    const localOnly = localData.filter(l => !remoteIds.has(l.id!));
                    const merged = [...remoteData, ...localOnly];

                    await db.tripRates.bulkPut(remoteData);
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

            // 2. Write to Firestore sequentially
            if (navigator.onLine && isFirebaseConfigured()) {
                try {
                    await Promise.all(processedRates.map(async (rate) => {
                        const docRef = doc(firestoreDb, 'trip_rates', rate.id!);
                        await setDoc(docRef, rate, { merge: true });
                    }));
                    console.log(`[useTripRates] ${processedRates.length} TripRates saved to Firestore`);
                } catch (err) {
                    console.error('[useTripRates] Firestore bulk write failed:', err);
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
