import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Company } from '../../types';
import { useAuth } from './useAuth';
import { getValidTenantUUID, cacheTenantUUID } from '../utils/tenantUtils';
import { db, addToSyncQueue } from '../lib/db';
import { syncService } from '../services/syncService';
import { generateId } from '../utils/uuid';

export const useClients = () => {
    return useQuery({
        queryKey: ['clients'],
        queryFn: async () => {
            // 1. Try to fetch from Supabase if online
            if (navigator.onLine && isSupabaseConfigured()) {
                try {
                    const { data, error } = await supabase
                        .from('companies')
                        .select('*')
                        .eq('is_client', true)
                        .order('name', { ascending: true });

                    if (error) throw error;
                    
                    if (data) {
                        // 2. Update Local DB
                        await db.companies.bulkPut(data as Company[]);
                        return data as Company[];
                    }
                } catch (err) {
                    console.warn('Network fetch failed, falling back to local DB', err);
                }
            }

            // 3. Fallback to Dexie
            const localData = await db.companies
                .where('is_client').equals(true as any) // Cast to any to avoid strict type issues with boolean index
                .toArray();
            
            return localData.sort((a, b) => a.name.localeCompare(b.name));
        },
    });
};

export const useAddClient = () => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    return useMutation({
        mutationFn: async (client: Partial<Company>) => {
            const tenantUUID = await getValidTenantUUID(currentUser?.tenant_id) || 'T001';
            
            // Generate UUID if missing
            const tempId = client.id || generateId();

            const newClient = {
                ...client,
                id: tempId,
                tenant_id: tenantUUID,
                is_client: true, // Ensure it is a client
                name: client.name || '',
                // Default values for required fields if missing
                matricule_fiscale: client.matricule_fiscale || '',
                address: client.address || '',
                is_supplier: client.is_supplier || false,
                contact_email: client.contact_email || '',
                contact_phone: client.contact_phone || ''
            } as Company;

            // 1. Update Local DB
            await db.companies.put(newClient);

            // 2. Add to Sync Queue
            // Note: Table name in Supabase is 'companies'
            await addToSyncQueue('companies', 'CREATE', newClient);

            // 3. Trigger Sync
            if (navigator.onLine) {
                syncService.processQueue();
            }

            return newClient;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['clients'] });
            await queryClient.refetchQueries({ queryKey: ['clients'] });
        },
    });
};
