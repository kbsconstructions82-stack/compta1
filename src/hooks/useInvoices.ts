import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    db as firestoreDb,
    collection,
    getDocs,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    isFirebaseConfigured,
} from '../lib/firebase';
import { Invoice } from '../../types';
import { useAuth } from './useAuth';
import { db, addToSyncQueue } from '../lib/db';
import { syncService } from '../services/syncService';
import { generateId } from '../utils/uuid';

// Helper to map Firestore document to Application Type
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

// Helper to map Application Type to Firestore document
const mapToDB = (invoice: Invoice, tenantId?: string) => ({
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
    attachment_url: invoice.attachment_url,
    ...(tenantId ? { tenant_id: tenantId } : {}),
    created_at: new Date().toISOString(),
});

export const useInvoices = () => {
    return useQuery({
        queryKey: ['invoices'],
        queryFn: async () => {
            // 1. Try to fetch from Firestore if online
            if (navigator.onLine && isFirebaseConfigured()) {
                try {
                    const q = query(collection(firestoreDb, 'invoices'), orderBy('created_at', 'desc'));
                    const snap = await getDocs(q);
                    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    // 2. Update Local DB (Cache)
                    await db.invoices.bulkPut(data as any);
                    return data.map(mapToApp);
                } catch (err) {
                    console.warn('Network fetch failed, falling back to local DB', err);
                }
            }
            // 3. Fallback to Dexie
            const localData = await db.invoices.toArray();
            return localData.map(mapToApp).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        },
        staleTime: 1000 * 60 * 5,
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
            // 2. Add to Sync Queue
            await addToSyncQueue('invoices', 'CREATE', payload);
            // 3. Trigger Sync
            if (navigator.onLine) syncService.processQueue();

            return mapToApp(payload);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['invoices'] });
            await queryClient.refetchQueries({ queryKey: ['invoices'] });
        },
    });
};

export const useUpdateInvoice = () => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    return useMutation({
        mutationFn: async (invoice: Invoice) => {
            const payload = mapToDB(invoice, currentUser?.tenant_id);
            await db.invoices.put(payload as any);
            await addToSyncQueue('invoices', 'UPDATE', payload);
            if (navigator.onLine) syncService.processQueue();
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
            await db.invoices.delete(id);
            await addToSyncQueue('invoices', 'DELETE', { id });
            if (navigator.onLine) syncService.processQueue();
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['invoices'] });
            await queryClient.refetchQueries({ queryKey: ['invoices'] });
        }
    });
};
