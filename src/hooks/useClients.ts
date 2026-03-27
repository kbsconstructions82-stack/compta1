import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Company } from '../../types';
import { useAuth } from './useAuth';
import { db } from '../lib/db';
import { generateId } from '../utils/uuid';

export const useClients = () => {
    return useQuery({
        queryKey: ['clients'],
        queryFn: async () => {
            const localData = await db.companies.where('is_client').equals(1 as any).toArray() || await db.companies.toArray();
            let clientsLocal = localData.filter(c => c.is_client) as Company[];

            if (navigator.onLine) {
                try {
                    const { data: remoteData, error } = await supabase
                        .from('companies')
                        .select('*')
                        .eq('is_client', true)
                        .order('name', { ascending: true });

                    if (error) throw error;

                    const validRemoteData = (remoteData || []) as Company[];

                    const remoteIds = new Set(validRemoteData.map(d => d.id));
                    const localOnly = clientsLocal.filter(l => !remoteIds.has(l.id));
                    const merged = [...validRemoteData, ...localOnly];

                    if (validRemoteData.length > 0) {
                        await db.companies.bulkPut(validRemoteData);
                    }
                    return merged.sort((a, b) => a.name.localeCompare(b.name));
                } catch (err) {
                    console.warn('[useClients] Network fetch failed, falling back to local DB', err);
                }
            }
            return clientsLocal.sort((a, b) => a.name.localeCompare(b.name));
        },
        staleTime: 1000 * 60 * 2,
    });
};

export const useAddClient = () => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    return useMutation({
        mutationFn: async (client: Partial<Company>) => {
            const tempId = client.id || generateId();
            const now = new Date().toISOString();
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
                created_at: now,
                updated_at: now,
            } as Company;

            // 1. Save locally
            await db.companies.put(newClient);

            // 2. Write to Supabase
            if (navigator.onLine) {
                try {
                    const { error } = await supabase.from('companies').insert(newClient);
                    if (error) throw error;
                    console.log('[useClients] Client saved to Supabase:', tempId);
                } catch (err) {
                    console.error('[useClients] Supabase write failed:', err);
                    throw err;
                }
            } else {
                console.warn('[useClients] Offline - client saved locally only');
            }

            return newClient;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['clients'] });
        },
    });
};
