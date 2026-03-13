import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    db as firestoreDb,
    collection,
    getDocs,
    query,
    orderBy,
    isFirebaseConfigured,
} from '../lib/firebase';
import { Expense } from '../../types';
import { useAuth } from './useAuth';
import { db, addToSyncQueue } from '../lib/db';
import { syncService } from '../services/syncService';
import { generateId } from '../utils/uuid';

export const useExpenses = () => {
    return useQuery({
        queryKey: ['expenses'],
        queryFn: async () => {
            // 1. Try to fetch from Firestore if online
            if (navigator.onLine && isFirebaseConfigured()) {
                try {
                    const q = query(collection(firestoreDb, 'expenses'), orderBy('created_at', 'desc'));
                    const snap = await getDocs(q);
                    const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Expense[];
                    // 2. Update Local DB
                    await db.expenses.bulkPut(data);
                    return data;
                } catch (err) {
                    console.warn('Network fetch failed, falling back to local DB', err);
                }
            }
            // 3. Fallback to Dexie
            const localData = await db.expenses.toArray();
            return localData.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        },
    });
};

export const useAddExpense = () => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    return useMutation({
        mutationFn: async (expense: Expense) => {
            const tempId = expense.id || generateId();
            const payload = {
                ...expense,
                id: tempId,
                tenant_id: currentUser?.tenant_id || 'T001',
                created_at: expense.created_at || new Date().toISOString(),
            };

            await db.expenses.put(payload);
            await addToSyncQueue('expenses', 'CREATE', payload);
            if (navigator.onLine) syncService.processQueue();
            return payload;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['expenses'] });
            await queryClient.refetchQueries({ queryKey: ['expenses'] });
        }
    });
};

export const useUpdateExpense = () => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    return useMutation({
        mutationFn: async (expense: Expense) => {
            const payload = { ...expense, tenant_id: currentUser?.tenant_id || 'T001' };
            await db.expenses.put(payload);
            await addToSyncQueue('expenses', 'UPDATE', payload);
            if (navigator.onLine) syncService.processQueue();
            return payload;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['expenses'] });
            await queryClient.refetchQueries({ queryKey: ['expenses'] });
        }
    });
};

export const useDeleteExpense = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await db.expenses.delete(id);
            await addToSyncQueue('expenses', 'DELETE', { id });
            if (navigator.onLine) syncService.processQueue();
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['expenses'] });
            await queryClient.refetchQueries({ queryKey: ['expenses'] });
        }
    });
};
