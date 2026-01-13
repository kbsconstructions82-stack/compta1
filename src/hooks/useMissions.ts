import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Mission, MissionStatus } from '../../types';
import { useAuth } from './useAuth';
import { getValidTenantUUID, cacheTenantUUID } from '../utils/tenantUtils';
import { db, addToSyncQueue } from '../lib/db'; // Import Dexie DB
import { syncService } from '../services/syncService'; // Import Sync Service
import { generateId } from '../utils/uuid';

// --- HELPER: Map DB (Snake) to App (Camel) ---
const mapMissionFromDB = (m: any): Mission => ({
    id: m.id,
    missionNumber: m.mission_number,
    status: m.status as MissionStatus,
    departure: m.departure,
    destination: m.destination,
    date: m.start_date ? m.start_date.split('T')[0] : '',
    vehicleId: m.vehicle_id,
    driverId: m.driver_id,
    client: m.client_name,
    cargo: m.cargo_description,
    distance: m.distance_km,
    price: m.price_ht,
    waybill_number: m.waybill_number || undefined,
    waybill_date: m.waybill_date ? m.waybill_date.split('T')[0] : undefined,
    waybillDate: m.waybill_date ? m.waybill_date.split('T')[0] : undefined,
    piece_number: m.piece_number || undefined,
    pieceNumber: m.piece_number || undefined,
    tenant_id: m.tenant_id
});

// --- HELPER: Map App (Camel) to DB (Snake) ---
const mapMissionToDB = (mission: Mission, tenantUUID: string) => {
    // Default Client Logic
    const defaultClient = 'NEW BOX TUNISIA';
    const missionClient = (mission.client && mission.client.trim() !== '' && mission.client !== 'Client') 
        ? mission.client.trim() 
        : defaultClient;

    return {
        id: mission.id, // Keep ID if updating, or generate one if creating
        mission_number: mission.missionNumber,
        status: mission.status,
        departure: mission.departure,
        destination: mission.destination,
        start_date: mission.date ? new Date(mission.date).toISOString() : null,
        vehicle_id: mission.vehicleId,
        driver_id: mission.driverId,
        client_name: missionClient,
        cargo_description: mission.cargo,
        distance_km: mission.distance,
        price_ht: mission.price,
        tenant_id: tenantUUID,
        waybill_number: mission.waybill_number || mission.waybillNumber || null,
        waybill_date: (mission.waybill_date || mission.waybillDate) ? (mission.waybill_date || mission.waybillDate) : null,
        piece_number: mission.piece_number || mission.pieceNumber || null
    };
};

export const useMissions = () => {
    // Strategy: Network-First if Online, Cache-First if Offline
    // React Query handles this partially, but we want to use IndexedDB as the "Source of Truth" for offline
    
    return useQuery({
        queryKey: ['missions'],
        queryFn: async () => {
            // 1. Try to fetch from Supabase if online
            if (navigator.onLine && isSupabaseConfigured()) {
                try {
                    const { data, error } = await supabase
                        .from('missions')
                        .select('*')
                        .order('created_at', { ascending: false });

                    if (error) throw error;

                    if (data) {
                        // 2. Update Local DB (Cache)
                        // Use bulkPut to upsert
                        const mappedData = data.map(m => mapMissionFromDB(m));
                        // Store in Dexie (Need to map back to DB format or store as App format? 
                        // Let's store as App format in Dexie for simpler usage, OR mirror DB.
                        // Decision: Mirror DB format in Dexie for easier sync logic.
                        
                        await db.missions.bulkPut(data); // Store raw DB items
                        return mappedData;
                    }
                } catch (err) {
                    console.warn('Network fetch failed, falling back to local DB', err);
                }
            }

            // 3. Fallback to Dexie (Offline or Network Fail)
            const localData = await db.missions.toArray();
            return localData.map(m => mapMissionFromDB(m));
        },
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });
};

export const useAddMission = () => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    return useMutation({
        mutationFn: async (mission: Mission) => {
            const tenantUUID = await getValidTenantUUID(currentUser?.tenant_id) || 'T001';
            
            // Generate a temporary ID if not present (UUID v4-like)
            const tempId = mission.id || generateId();
            const missionWithId = { ...mission, id: tempId };

            const dbPayload = mapMissionToDB(missionWithId, tenantUUID);

            // 1. Always save to Local DB first (Optimistic UI)
            await db.missions.put(dbPayload as any);

            // 2. Add to Sync Queue
            // Note: We use 'missions' table name
            await addToSyncQueue('missions', 'CREATE', dbPayload);

            // 3. Trigger Background Sync (Fire & Forget)
            // If online, it will process immediately. If offline, it waits.
            if (navigator.onLine) {
                syncService.processQueue();
            }

            return missionWithId;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['missions'] });
            await queryClient.refetchQueries({ queryKey: ['missions'] });
        },
    });
};

export const useUpdateMission = () => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    return useMutation({
        mutationFn: async (mission: Mission) => {
            const tenantUUID = await getValidTenantUUID(currentUser?.tenant_id) || 'T001';
            const dbPayload = mapMissionToDB(mission, tenantUUID);

            // 1. Update Local DB
            await db.missions.put(dbPayload as any);

            // 2. Add to Sync Queue
            await addToSyncQueue('missions', 'UPDATE', dbPayload);

            // 3. Trigger Sync
            if (navigator.onLine) {
                syncService.processQueue();
            }

            return mission;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['missions'] });
            await queryClient.refetchQueries({ queryKey: ['missions'] });
        }
    });
};
