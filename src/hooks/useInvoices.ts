import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Invoice } from '../../types';
import { useAuth } from './useAuth';
import { getValidTenantUUID, cacheTenantUUID } from '../utils/tenantUtils';
import { db, addToSyncQueue } from '../lib/db';
import { syncService } from '../services/syncService';
import { generateId } from '../utils/uuid';

// Helper to map DB row to Application Type
const mapToApp = (row: any): Invoice => ({
    id: row.id,
    number: row.number,
    client_id: row.client_id,
    clientName: row.client_name, // Map client_name -> clientName
    date: row.date,
    due_date: row.due_date,
    status: row.status,
    items: row.items || [], // Ensure items is an array

    total_ht: Number(row.amount_ht || 0),   // amount_ht -> total_ht
    tva_rate: Number(row.tva_rate || 19),
    tva_amount: Number(row.tva_amount || 0),
    timbre_fiscal: Number(row.timbre_fiscal || 1.000),
    total_ttc: Number(row.amount_ttc || 0), // amount_ttc -> total_ttc

    apply_rs: row.apply_rs || false,
    rs_rate: Number(row.rs_rate || 0),
    rs_amount: Number(row.rs_amount || 0),
    net_to_pay: Number(row.net_to_pay || 0),

    attachment_url: row.attachment_url,
    tenant_id: row.tenant_id
});

// Helper to map Application Type to DB Row
const mapToDB = (invoice: Invoice, tenantUUID?: string | null) => ({
    id: invoice.id, // ID is required for local DB and sync
    number: invoice.number,
    client_id: invoice.client_id,
    client_name: invoice.clientName || 'Client Inconnu', // clientName -> client_name
    date: invoice.date,
    due_date: invoice.due_date,
    status: invoice.status,
    items: invoice.items,

    amount_ht: invoice.total_ht,   // total_ht -> amount_ht
    tva_rate: invoice.tva_rate,
    tva_amount: invoice.tva_amount,
    timbre_fiscal: invoice.timbre_fiscal,
    amount_ttc: invoice.total_ttc, // total_ttc -> amount_ttc

    apply_rs: invoice.apply_rs,
    rs_rate: invoice.rs_rate,
    rs_amount: invoice.rs_amount,
    net_to_pay: invoice.net_to_pay,

    attachment_url: invoice.attachment_url,
    // tenant_id sera ajouté si fourni
    ...(tenantUUID ? { tenant_id: tenantUUID } : {})
});

export const useInvoices = () => {
    return useQuery({
        queryKey: ['invoices'],
        queryFn: async () => {
            // 1. Try to fetch from Supabase if online
            if (navigator.onLine && isSupabaseConfigured()) {
                try {
                    const { data, error } = await supabase
                        .from('invoices')
                        .select('*')
                        .order('created_at', { ascending: false });
                    
                    if (error) throw error;
                    
                    if (data) {
                         // 2. Update Local DB (Cache)
                         await db.invoices.bulkPut(data);
                         return (data || []).map(mapToApp);
                    }
                } catch (err) {
                    console.warn('Network fetch failed, falling back to local DB', err);
                }
            }

            // 3. Fallback to Dexie
            const localData = await db.invoices.toArray();
            // Sort by date desc (Assuming date string YYYY-MM-DD)
            return localData.map(mapToApp).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        },
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });
};

export const useAddInvoice = () => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    return useMutation({
        mutationFn: async (invoice: Invoice) => {
            console.log('🔵 useAddInvoice called with:', invoice);
            
            const tenantUUID = await getValidTenantUUID(currentUser?.tenant_id) || '00000000-0000-0000-0000-000000000000';
            console.log('🔵 Tenant UUID:', tenantUUID);
            
            // Generate ID if not present
            const tempId = invoice.id || generateId();
            const invoiceWithId = { ...invoice, id: tempId };
            console.log('🔵 Invoice with ID:', invoiceWithId);

            const payload = mapToDB(invoiceWithId, tenantUUID);
            console.log('🔵 Payload to save:', payload);

            try {
                // 1. Update Local DB
                await db.invoices.put(payload as any);
                console.log('✅ Saved to local DB');

                // 2. Add to Sync Queue
                await addToSyncQueue('invoices', 'CREATE', payload);
                console.log('✅ Added to sync queue');

                // 3. Trigger Sync
                if (navigator.onLine) {
                    syncService.processQueue();
                    console.log('✅ Sync triggered');
                }

                return mapToApp(payload);
            } catch (error) {
                console.error('❌ Error in useAddInvoice:', error);
                throw error;
            }
        },
        onSuccess: async () => {
            console.log('✅ useAddInvoice success, invalidating queries');
            await queryClient.invalidateQueries({ queryKey: ['invoices'] });
            await queryClient.refetchQueries({ queryKey: ['invoices'] });
        },
        onError: (error) => {
            console.error('❌ useAddInvoice mutation error:', error);
        }
    });
};

export const useUpdateInvoice = () => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    return useMutation({
        mutationFn: async (invoice: Invoice) => {
            const tenantUUID = await getValidTenantUUID(currentUser?.tenant_id) || '00000000-0000-0000-0000-000000000000';
            const payload = mapToDB(invoice, tenantUUID);

            // 1. Update Local DB
            await db.invoices.put(payload as any);

            // 2. Add to Sync Queue
            await addToSyncQueue('invoices', 'UPDATE', payload);

            // 3. Trigger Sync
            if (navigator.onLine) {
                syncService.processQueue();
            }

            return mapToApp(payload);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['invoices'] });
            await queryClient.refetchQueries({ queryKey: ['invoices'] });
        },
    });
};

export const useDeleteInvoice = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            // 1. Update Local DB
            await db.invoices.delete(id);

            // 2. Add to Sync Queue
            // For DELETE, payload only needs ID
            await addToSyncQueue('invoices', 'DELETE', { id });

            // 3. Trigger Sync
            if (navigator.onLine) {
                syncService.processQueue();
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['invoices'] });
            await queryClient.refetchQueries({ queryKey: ['invoices'] });
        }
    });
};
