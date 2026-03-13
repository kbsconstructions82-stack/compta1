import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    db as firestoreDb,
    collection,
    getDocs,
    query,
    orderBy,
    isFirebaseConfigured,
} from '../lib/firebase';
import { Mission, MissionStatus } from '../../types';
import { useAuth } from './useAuth';
import { db, addToSyncQueue } from '../lib/db';
import { syncService } from '../services/syncService';
import { generateId } from '../utils/uuid';

// --- HELPER: Map Firestore doc to App type ---
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

// --- HELPER: Map App type to Firestore doc ---
const mapMissionToDB = (mission: Mission, tenantId: string) => {
    const defaultClient = 'NEW BOX TUNISIA';
    const missionClient = (mission.client && mission.client.trim() !== '' && mission.client !== 'Client')
        ? mission.client.trim()
        : defaultClient;

    return {
        id: mission.id,
        mission_number: mission.missionNumber,
        status: mission.status,
        departure: mission.departure,
        destination: mission.destination,
        start_date: mission.date ? new Date(mission.date).toISOString() : null,
        vehicle_id: mission.vehicleId || mission.vehicle_id,
        driver_id: mission.driverId || mission.driver_id,
        client_name: missionClient,
        cargo_description: mission.cargo,
        distance_km: mission.distance,
        price_ht: mission.price,
        tenant_id: tenantId,
        waybill_number: mission.waybill_number || null,
        waybill_date: (mission.waybill_date || mission.waybill_date) || null,
        piece_number: mission.piece_number || mission.pieceNumber || null,
        created_at: new Date().toISOString(),
    };
};

export const useMissions = () => {
    return useQuery({
        queryKey: ['missions'],
        queryFn: async () => {
            // 1. Try Firestore if online
            if (navigator.onLine && isFirebaseConfigured()) {
                try {
                    const q = query(collection(firestoreDb, 'missions'), orderBy('created_at', 'desc'));
                    const snap = await getDocs(q);
                    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    await db.missions.bulkPut(data as any);
                    return data.map(mapMissionFromDB);
                } catch (err) {
                    console.warn('Network fetch failed, falling back to local DB', err);
                }
            }
            // 3. Fallback to Dexie
            const localData = await db.missions.toArray();
            return localData.map(m => mapMissionFromDB(m));
        },
        staleTime: 1000 * 60 * 5,
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

            await db.missions.put(dbPayload as any);
            await addToSyncQueue('missions', 'CREATE', dbPayload);
            if (navigator.onLine) syncService.processQueue();
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
            const tenantId = currentUser?.tenant_id || 'T001';
            const dbPayload = mapMissionToDB(mission, tenantId);
            await db.missions.put(dbPayload as any);
            await addToSyncQueue('missions', 'UPDATE', dbPayload);
            if (navigator.onLine) syncService.processQueue();
            return mission;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['missions'] });
            await queryClient.refetchQueries({ queryKey: ['missions'] });
        }
    });
};
