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
            // Always load local data first (includes pending-sync items)
            const localData = await db.trucks.toArray();

            // Try Firestore if online
            if (navigator.onLine && isFirebaseConfigured()) {
                try {
                    const snap = await getDocs(collection(firestoreDb, 'vehicles'));
                    const remoteData = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Vehicle[];

                    // Merge: remote is source of truth, keep local-only pending items
                    const remoteIds = new Set(remoteData.map(d => d.id));
                    const localOnly = localData.filter(l => !remoteIds.has(l.id));
                    const merged = [...remoteData, ...localOnly];

                    await db.trucks.bulkPut(remoteData);
                    return merged;
                } catch (err) {
                    console.warn('Network fetch failed, falling back to local DB', err);
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
            const { id, ...vehicleData } = vehicle;
            const newId = (id && id.trim()) ? id : generateId();
            const payload: Vehicle = {
                ...vehicleData,
                id: newId,
                tenant_id: currentUser?.tenant_id || 'T001',
                created_at: new Date().toISOString(),
            };

            // Remove empty strings (but NOT id and created_at)
            Object.keys(payload).forEach(key => {
                if (key !== 'id' && key !== 'created_at' && (payload as any)[key] === '') {
                    delete (payload as any)[key];
                }
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
            // Preserve existing created_at
            const existing = await db.trucks.get(vehicle.id);
            const payload = {
                ...vehicle,
                tenant_id: currentUser?.tenant_id || 'T001',
                created_at: (existing as any)?.created_at || new Date().toISOString(),
            };
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
