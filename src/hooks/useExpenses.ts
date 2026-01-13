import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Expense } from '../../types';
import { useAuth } from './useAuth';
import { getValidTenantUUID, cacheTenantUUID } from '../utils/tenantUtils';
import { db, addToSyncQueue } from '../lib/db';
import { syncService } from '../services/syncService';
import { generateId } from '../utils/uuid';

export const useExpenses = () => {
    return useQuery({
        queryKey: ['expenses'],
        queryFn: async () => {
            // 1. Try to fetch from Supabase if online
            if (navigator.onLine && isSupabaseConfigured()) {
                try {
                    const { data, error } = await supabase
                        .from('expenses')
                        .select('*')
                        .order('created_at', { ascending: false });
                    if (error) throw error;
                    
                    if (data) {
                        // 2. Update Local DB
                        await db.expenses.bulkPut(data as Expense[]);
                        return data as Expense[];
                    }
                } catch (err) {
                    console.warn('Network fetch failed, falling back to local DB', err);
                }
            }

            // 3. Fallback to Dexie
            const localData = await db.expenses.toArray();
            // Sort by date desc (Assuming date string YYYY-MM-DD or ISO)
            return localData.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        },
    });
};

export const useAddExpense = () => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    return useMutation({
        mutationFn: async (expense: Expense) => {
            const tenantUUID = await getValidTenantUUID(currentUser?.tenant_id) || '00000000-0000-0000-0000-000000000000';
            
            // Generate UUID if missing
            const tempId = expense.id || generateId();
            
            const payload = {
                ...expense,
                id: tempId,
                tenant_id: tenantUUID,
                created_at: expense.created_at || new Date().toISOString()
            };

            // 1. Update Local DB
            await db.expenses.put(payload);

            // 2. Add to Sync Queue
            await addToSyncQueue('expenses', 'CREATE', payload);

            // 3. Trigger Sync
            if (navigator.onLine) {
                syncService.processQueue();
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
            const tenantUUID = await getValidTenantUUID(currentUser?.tenant_id) || '00000000-0000-0000-0000-000000000000';
            // Ensure tenant_id is set
            const payload = { ...expense, tenant_id: tenantUUID };

            // 1. Update Local DB
            await db.expenses.put(payload);

            // 2. Add to Sync Queue
            await addToSyncQueue('expenses', 'UPDATE', payload);

            // 3. Trigger Sync
            if (navigator.onLine) {
                syncService.processQueue();
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
            // 1. Update Local DB
            await db.expenses.delete(id);

            // 2. Add to Sync Queue
            await addToSyncQueue('expenses', 'DELETE', { id });

            // 3. Trigger Sync
            if (navigator.onLine) {
                syncService.processQueue();
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['expenses'] });
            await queryClient.refetchQueries({ queryKey: ['expenses'] });
        }
    });
};
