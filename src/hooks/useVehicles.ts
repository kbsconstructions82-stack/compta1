import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    db as firestoreDb,
    collection,
    getDocs,
    query,
    isFirebaseConfigured,
} from '../lib/firebase';
import { Vehicle } from '../../types';
import { useAuth } from './useAuth';
import { db, addToSyncQueue } from '../lib/db';
import { syncService } from '../services/syncService';
import { generateId } from '../utils/uuid';

export const useVehicles = () => {
    return useQuery({
        queryKey: ['vehicles'],
        queryFn: async () => {
            // 1. Try Firestore if online
            if (navigator.onLine && isFirebaseConfigured()) {
                try {
                    const snap = await getDocs(collection(firestoreDb, 'vehicles'));
                    const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Vehicle[];
                    // 2. Update Local DB
                    await db.trucks.bulkPut(data);
                    return data;
                } catch (err) {
                    console.warn('Network fetch failed, falling back to local DB', err);
                }
            }
            // 3. Fallback to Dexie
            return db.trucks.toArray();
        },
        staleTime: 1000 * 60 * 5,
    });
};

export const useAddVehicle = () => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    return useMutation({
        mutationFn: async (vehicle: Vehicle) => {
            const { id, ...vehicleData } = vehicle;
            const payload: Vehicle = {
                ...vehicleData,
                id: (id && id.trim()) ? id : generateId(),
                tenant_id: currentUser?.tenant_id || 'T001',
            };

            // Remove empty strings
            Object.keys(payload).forEach(key => {
                if ((payload as any)[key] === '') delete (payload as any)[key];
            });

            await db.trucks.put(payload);
            await addToSyncQueue('vehicles', 'CREATE', payload);
            if (navigator.onLine) syncService.processQueue();
            return payload;
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
            const payload = { ...vehicle, tenant_id: currentUser?.tenant_id || 'T001' };
            await db.trucks.put(payload);
            await addToSyncQueue('vehicles', 'UPDATE', payload);
            if (navigator.onLine) syncService.processQueue();
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
            await db.trucks.delete(id);
            await addToSyncQueue('vehicles', 'DELETE', { id });
            if (navigator.onLine) syncService.processQueue();
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            await queryClient.refetchQueries({ queryKey: ['vehicles'] });
        }
    });
};
