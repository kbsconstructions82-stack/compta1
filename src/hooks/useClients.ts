import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    db as firestoreDb,
    collection,
    getDocs,
    query,
    orderBy,
    where,
    isFirebaseConfigured,
} from '../lib/firebase';
import { Company } from '../../types';
import { useAuth } from './useAuth';
import { db, addToSyncQueue } from '../lib/db';
import { syncService } from '../services/syncService';
import { generateId } from '../utils/uuid';

export const useClients = () => {
    return useQuery({
        queryKey: ['clients'],
        queryFn: async () => {
            // 1. Try Firestore if online
            if (navigator.onLine && isFirebaseConfigured()) {
                try {
                    const q = query(
                        collection(firestoreDb, 'companies'),
                        where('is_client', '==', true),
                        orderBy('name', 'asc')
                    );
                    const snap = await getDocs(q);
                    const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Company[];
                    // 2. Update Local DB
                    await db.companies.bulkPut(data);
                    return data;
                } catch (err) {
                    console.warn('Network fetch failed, falling back to local DB', err);
                }
            }
            // 3. Fallback to Dexie
            const localData = await db.companies.where('is_client').equals(true as any).toArray();
            return localData.sort((a, b) => a.name.localeCompare(b.name));
        },
    });
};

export const useAddClient = () => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    return useMutation({
        mutationFn: async (client: Partial<Company>) => {
            const tempId = client.id || generateId();
            const newClient = {
                ...client,
                id: tempId,
                tenant_id: currentUser?.tenant_id || 'T001',
                is_client: true,
                name: client.name || '',
                matricule_fiscale: client.matricule_fiscale || '',
                address: client.address || '',
                is_supplier: client.is_supplier || false,
                contact_email: client.contact_email || '',
                contact_phone: client.contact_phone || '',
            } as Company;

            await db.companies.put(newClient);
            await addToSyncQueue('companies', 'CREATE', newClient);
            if (navigator.onLine) syncService.processQueue();
            return newClient;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['clients'] });
            await queryClient.refetchQueries({ queryKey: ['clients'] });
        },
    });
};
