import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Mission, MissionStatus } from '../../types';
import { useAuth } from './useAuth';
import { db } from '../lib/db';
import { generateId } from '../utils/uuid';

// --- HELPER: Map DB doc to App type ---
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
    tenant_id: m.tenant_id,
    // Legacy fields needed by types
    vehicle_id: m.vehicle_id,
    driver_id: m.driver_id,
    client_id: m.client_id || '',
    departure_location: m.departure || '',
    destination_location: m.destination || '',
    distance_km: m.distance_km || 0,
    cargo_weight_tonnes: m.cargo_weight_tonnes || 0,
    start_date: m.start_date || '',
    agreed_price_ttc: m.agreed_price_ttc || m.price_ht || 0,
});

// --- HELPER: Map App type to DB doc ---
const mapMissionToDB = (mission: Mission, tenantId: string, existingCreatedAt?: string) => {
    const defaultClient = 'NEW BOX TUNISIA';
    const missionClient = (mission.client && mission.client.trim() !== '' && mission.client !== 'Client')
        ? mission.client.trim()
        : defaultClient;

    return {
        id: mission.id,
        mission_number: mission.missionNumber || null,
        status: mission.status || null,
        departure: mission.departure || null,
        destination: mission.destination || null,
        start_date: mission.date ? new Date(mission.date).toISOString() : null,
        vehicle_id: (mission.vehicleId || mission.vehicle_id) || null,
        driver_id: (mission.driverId || mission.driver_id) || null,
        client_name: missionClient || null,
        cargo_description: mission.cargo || null,
        distance_km: mission.distance || null,
        price_ht: mission.price || null,
        tenant_id: tenantId,
        waybill_number: mission.waybill_number || null,
        waybill_date: (mission.waybill_date || mission.waybillDate) || null,
        piece_number: mission.piece_number || mission.pieceNumber || null,
        created_at: existingCreatedAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
};

export const useMissions = () => {
    return useQuery({
        queryKey: ['missions'],
        queryFn: async () => {
            // Always load local data first
            const localData = await db.missions.toArray();

            if (navigator.onLine && isSupabaseConfigured()) {
                try {
                    const { data, error } = await supabase
                        .from('missions')
                        .select('*')
                        .order('created_at', { ascending: false });

                    if (error) throw error;
                    const remoteData = data;
                    
                    // Merge local pending items with remote
                    const remoteIds = new Set(remoteData.map((d: any) => d.id));
                    const localOnly = localData.filter(l => !remoteIds.has(l.id));
                    const merged = [...remoteData, ...localOnly];

                    if (remoteData.length > 0) {
                        await db.missions.bulkPut(remoteData as any);
                    }
                    return merged.map(mapMissionFromDB);
                } catch (err) {
                    console.warn('[useMissions] Network fetch failed, falling back to local DB', err);
                }
            }
            return localData.map(m => mapMissionFromDB(m));
        },
        staleTime: 1000 * 60 * 2,
    });
};

export const useAddMission = () => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    return useMutation({
        mutationFn: async (mission: Mission) => {
            const tenantId = currentUser?.tenant_id || 'T001';
            const tempId = mission.id || generateId();
            const missionWithId = { ...mission, id: tempId };
            const dbPayload = mapMissionToDB(missionWithId, tenantId);

            // 1. Save locally
            await db.missions.put(dbPayload as any);

            // 2. Write to Supabase
            if (navigator.onLine && isSupabaseConfigured()) {
                try {
                    const { error } = await supabase.from('missions').insert(dbPayload);
                    if (error) throw error;
                    console.log('[useMissions] Mission saved to Supabase:', tempId);
                } catch (err) {
                    console.error('[useMissions] Supabase write failed:', err);
                    throw err;
                }
            } else {
                console.warn('[useMissions] Offline - mission saved locally only');
            }

            return missionWithId;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['missions'] });
        },
    });
};

export const useUpdateMission = () => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    return useMutation({
        mutationFn: async (mission: Mission) => {
            const tenantId = currentUser?.tenant_id || 'T001';
            const existing = await db.missions.get(mission.id);
            const dbPayload = mapMissionToDB(mission, tenantId, (existing as any)?.created_at);
            
            // 1. Save locally
            await db.missions.put(dbPayload as any);

            // 2. Write to Supabase
            if (navigator.onLine && isSupabaseConfigured()) {
                try {
                    const { error } = await supabase.from('missions').upsert(dbPayload);
                    if (error) throw error;
                    console.log('[useMissions] Mission updated in Supabase:', mission.id);
                } catch (err) {
                    console.error('[useMissions] Supabase update failed:', err);
                    throw err;
                }
            } else {
                console.warn('[useMissions] Offline - mission updated locally only');
            }

            return mission;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['missions'] });
        }
    });
};

export const useDeleteMission = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            // 1. Save locally
            await db.missions.delete(id);

            // 2. Delete from Supabase
            if (navigator.onLine && isSupabaseConfigured()) {
                try {
                    const { error } = await supabase.from('missions').delete().eq('id', id);
                    if (error) throw error;
                    console.log('[useMissions] Mission deleted from Supabase:', id);
                } catch (err) {
                    console.error('[useMissions] Supabase delete failed:', err);
                    throw err;
                }
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['missions'] });
        }
    });
};
