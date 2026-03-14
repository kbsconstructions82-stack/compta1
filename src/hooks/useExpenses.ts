import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    db as firestoreDb,
    collection,
    getDocs,
    doc,
    setDoc,
    deleteDoc,
    query,
    orderBy,
    isFirebaseConfigured,
} from '../lib/firebase';
import { Expense } from '../../types';
import { useAuth } from './useAuth';
import { db } from '../lib/db';
import { generateId } from '../utils/uuid';

export const useExpenses = () => {
    return useQuery({
        queryKey: ['expenses'],
        queryFn: async () => {
            // Always load local data first (includes pending-sync items)
            const localData = await db.expenses.toArray();

            // Try to fetch from Firestore if online
            if (navigator.onLine && isFirebaseConfigured()) {
                try {
                    const q = query(collection(firestoreDb, 'expenses'), orderBy('created_at', 'desc'));
                    const snap = await getDocs(q);
                    const remoteData = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Expense[];

                    // Merge: remote is source of truth, keep local-only items
                    const remoteIds = new Set(remoteData.map(d => d.id));
                    const localOnly = localData.filter(l => !remoteIds.has(l.id));
                    const merged = [...remoteData, ...localOnly];

                    await db.expenses.bulkPut(remoteData);
                    return merged;
                } catch (err) {
                    console.warn('[useExpenses] Network fetch failed, falling back to local DB', err);
                }
            }
            // Fallback to Dexie
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
            const now = new Date().toISOString();
            const payload = {
                ...expense,
                id: tempId,
                tenant_id: currentUser?.tenant_id || 'T001',
                created_at: expense.created_at || now,
                updated_at: now,
                fuel_liters: expense.fuel_liters ?? null,
            };

            // 1. Save to Dexie immediately (optimistic)
            await db.expenses.put(payload);

            // 2. Write directly to Firestore if online
            if (navigator.onLine && isFirebaseConfigured()) {
                try {
                    const docRef = doc(firestoreDb, 'expenses', tempId);
                    await setDoc(docRef, payload);
                    console.log('[useExpenses] Expense saved to Firestore:', tempId);
                } catch (err) {
                    console.error('[useExpenses] Firestore write failed:', err);
                    throw err;
                }
            } else {
                console.warn('[useExpenses] Offline - expense saved locally only');
            }

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
            const existing = await db.expenses.get(expense.id) as any;
            const payload = {
                ...expense,
                tenant_id: currentUser?.tenant_id || 'T001',
                created_at: existing?.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
                fuel_liters: expense.fuel_liters ?? null,
            };

            // 1. Update Dexie immediately
            await db.expenses.put(payload);

            // 2. Write directly to Firestore if online
            if (navigator.onLine && isFirebaseConfigured()) {
                try {
                    const docRef = doc(firestoreDb, 'expenses', expense.id);
                    await setDoc(docRef, payload, { merge: true });
                    console.log('[useExpenses] Expense updated in Firestore:', expense.id);
                } catch (err) {
                    console.error('[useExpenses] Firestore update failed:', err);
                    throw err;
                }
            } else {
                console.warn('[useExpenses] Offline - expense updated locally only');
            }

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
            // 1. Delete from Dexie immediately
            await db.expenses.delete(id);

            // 2. Delete from Firestore if online
            if (navigator.onLine && isFirebaseConfigured()) {
                try {
                    const docRef = doc(firestoreDb, 'expenses', id);
                    await deleteDoc(docRef);
                    console.log('[useExpenses] Expense deleted from Firestore:', id);
                } catch (err) {
                    console.error('[useExpenses] Firestore delete failed:', err);
                    throw err;
                }
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['expenses'] });
            await queryClient.refetchQueries({ queryKey: ['expenses'] });
        }
    });
};
