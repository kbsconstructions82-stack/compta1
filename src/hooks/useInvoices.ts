import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Invoice } from '../../types';
import { useAuth } from './useAuth';
import { db } from '../lib/db';
import { generateId } from '../utils/uuid';

// Helper to map DB document to Application Type
const mapToApp = (row: any): Invoice => ({
    id: row.id,
    number: row.number,
    client_id: row.client_id,
    clientName: row.client_name,
    date: row.date,
    due_date: row.due_date,
    status: row.status,
    items: row.items || [],
    total_ht: Number(row.amount_ht || 0),
    tva_rate: Number(row.tva_rate || 19),
    tva_amount: Number(row.tva_amount || 0),
    timbre_fiscal: Number(row.timbre_fiscal || 1.000),
    total_ttc: Number(row.amount_ttc || 0),
    apply_rs: row.apply_rs || false,
    rs_rate: Number(row.rs_rate || 0),
    rs_amount: Number(row.rs_amount || 0),
    net_to_pay: Number(row.net_to_pay || 0),
    attachment_url: row.attachment_url,
    tenant_id: row.tenant_id
});

// Helper to map Application Type to DB document
const mapToDB = (invoice: Invoice, tenantId?: string, existingCreatedAt?: string) => ({
    id: invoice.id,
    number: invoice.number,
    client_id: invoice.client_id,
    client_name: invoice.clientName || 'Client Inconnu',
    date: invoice.date,
    due_date: invoice.due_date,
    status: invoice.status,
    items: invoice.items,
    amount_ht: invoice.total_ht,
    tva_rate: invoice.tva_rate,
    tva_amount: invoice.tva_amount,
    timbre_fiscal: invoice.timbre_fiscal,
    amount_ttc: invoice.total_ttc,
    apply_rs: invoice.apply_rs,
    rs_rate: invoice.rs_rate,
    rs_amount: invoice.rs_amount,
    net_to_pay: invoice.net_to_pay,
    attachment_url: invoice.attachment_url ?? null,
    ...(tenantId ? { tenant_id: tenantId } : {}),
    created_at: existingCreatedAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
});

export const useInvoices = () => {
    return useQuery({
        queryKey: ['invoices'],
        queryFn: async () => {
            const localData = await db.invoices.toArray();

            if (navigator.onLine && isSupabaseConfigured()) {
                try {
                    const { data, error } = await supabase
                        .from('invoices')
                        .select('*')
                        .order('created_at', { ascending: false });

                    if (error) throw error;
                    const remoteData = data;
                    
                    const remoteIds = new Set(remoteData.map((d: any) => d.id));
                    const localOnly = localData.filter(l => !remoteIds.has(l.id));
                    const merged = [...remoteData, ...localOnly];

                    if (remoteData.length > 0) {
                        await db.invoices.bulkPut(remoteData as any);
                    }
                    return merged.map(mapToApp);
                } catch (err) {
                    console.warn('[useInvoices] Network fetch failed, falling back to local DB', err);
                }
            }
            return localData.map(mapToApp).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        },
        staleTime: 1000 * 60 * 2,
    });
};

export const useAddInvoice = () => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    return useMutation({
        mutationFn: async (invoice: Invoice) => {
            const tempId = invoice.id || generateId();
            const invoiceWithId = { ...invoice, id: tempId };
            const payload = mapToDB(invoiceWithId, currentUser?.tenant_id);

            // 1. Save locally
            await db.invoices.put(payload as any);

            // 2. Write to Supabase
            if (navigator.onLine && isSupabaseConfigured()) {
                try {
                    const { error } = await supabase.from('invoices').insert(payload);
                    if (error) throw error;
                    console.log('[useInvoices] Invoice saved to Supabase:', tempId);
                } catch (err) {
                    console.error('[useInvoices] Supabase write failed:', err);
                    throw err;
                }
            } else {
                console.warn('[useInvoices] Offline - invoice saved locally only');
            }

            return mapToApp(payload);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['invoices'] });
        },
    });
};

export const useUpdateInvoice = () => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    return useMutation({
        mutationFn: async (invoice: Invoice) => {
            const existing = await db.invoices.get(invoice.id);
            const payload = mapToDB(invoice, currentUser?.tenant_id, (existing as any)?.created_at);
            
            // 1. Save locally
            await db.invoices.put(payload as any);

            // 2. Write to Supabase
            if (navigator.onLine && isSupabaseConfigured()) {
                try {
                    const { error } = await supabase.from('invoices').upsert(payload);
                    if (error) throw error;
                    console.log('[useInvoices] Invoice updated in Supabase:', invoice.id);
                } catch (err) {
                    console.error('[useInvoices] Supabase update failed:', err);
                    throw err;
                }
            } else {
                console.warn('[useInvoices] Offline - invoice updated locally only');
            }

            return mapToApp(payload);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['invoices'] });
        },
    });
};

export const useDeleteInvoice = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async (id: string) => {
            // 1. Save locally
            await db.invoices.delete(id);

            // 2. Delete from Supabase
            if (navigator.onLine && isSupabaseConfigured()) {
                try {
                    const { error } = await supabase.from('invoices').delete().eq('id', id);
                    if (error) throw error;
                    console.log('[useInvoices] Invoice deleted from Supabase:', id);
                } catch (err) {
                    console.error('[useInvoices] Supabase delete failed:', err);
                    throw err;
                }
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['invoices'] });
        }
    });
};
