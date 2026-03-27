import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './useAuth';
import React from 'react';

export interface TrackingPosition {
    id?: string;
    tenant_id?: string;
    driver_id: string;
    vehicle_id?: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    altitude?: number;
    timestamp?: string;
    battery_level?: number;
    is_moving?: boolean;
    driver_name?: string;
    vehicle_matricule?: string;
}

/**
 * Hook pour récupérer les dernières positions de tous les véhicules/chauffeurs
 */
export const useTracking = () => {
    const { currentUser } = useAuth();

    return useQuery({
        queryKey: ['tracking'],
        queryFn: async () => {
            if (!isSupabaseConfigured()) {
                console.warn('[useTracking] Supabase not configured');
                return [];
            }

            try {
                // Fetch latest positions from Supabase
                const { data, error } = await supabase
                    .from('tracking')
                    .select('*')
                    .eq('tenant_id', currentUser?.tenant_id || 'T001')
                    .order('timestamp', { ascending: false });

                if (error) throw error;
                return data as TrackingPosition[];
            } catch (err) {
                console.error('[useTracking] Error fetching positions:', err);
                return [];
            }
        },
        refetchInterval: 10000,
        enabled: isSupabaseConfigured(),
    });
};

/**
 * Hook pour récupérer l'historique des positions d'un chauffeur spécifique
 */
export const useTrackingHistory = (driverId?: string, limit: number = 50) => {
    const { currentUser } = useAuth();

    return useQuery({
        queryKey: ['tracking-history', driverId],
        queryFn: async () => {
            if (!isSupabaseConfigured() || !driverId) return [];

            try {
                const { data, error } = await supabase
                    .from('tracking')
                    .select('*')
                    .eq('tenant_id', currentUser?.tenant_id || 'T001')
                    .eq('driver_id', driverId)
                    .order('timestamp', { ascending: false })
                    .limit(limit);

                if (error) throw error;
                return data as TrackingPosition[];
            } catch (err) {
                console.error('[useTrackingHistory] Error:', err);
                return [];
            }
        },
        enabled: isSupabaseConfigured() && !!driverId,
    });
};

/**
 * Hook pour envoyer une nouvelle position GPS vers Supabase
 */
export const useSendPosition = () => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    return useMutation({
        mutationFn: async (position: TrackingPosition) => {
            if (!isSupabaseConfigured()) {
                throw new Error('Supabase not configured');
            }

            const docId = `${position.driver_id}_${Date.now()}`;
            const payload = {
                id: docId,
                tenant_id: currentUser?.tenant_id || 'T001',
                driver_id: position.driver_id,
                vehicle_id: position.vehicle_id || null,
                latitude: position.latitude,
                longitude: position.longitude,
                accuracy: position.accuracy || null,
                speed: position.speed || null,
                heading: position.heading || null,
                altitude: position.altitude || null,
                battery_level: position.battery_level || null,
                is_moving: position.is_moving !== undefined ? position.is_moving : true,
                timestamp: new Date().toISOString(),
            };

            const { error } = await supabase.from('tracking').insert(payload);
            if (error) throw error;

            return payload;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tracking'] });
        },
    });
};

/**
 * Hook personnalisé pour activer le suivi GPS automatique
 */
export const useGPSTracking = (driverId?: string, vehicleId?: string, enabled: boolean = false) => {
    const sendPositionMutation = useSendPosition();

    React.useEffect(() => {
        if (!enabled || !driverId) return;

        let watchId: number | null = null;

        if ('geolocation' in navigator) {
            console.log('[GPS] Starting GPS tracking for driver:', driverId);

            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude, accuracy, altitude, heading, speed } = position.coords;

                    let batteryLevel: number | undefined;
                    if ('getBattery' in navigator) {
                        (navigator as any).getBattery().then((battery: any) => {
                            batteryLevel = Math.round(battery.level * 100);
                        });
                    }

                    sendPositionMutation.mutate({
                        driver_id: driverId,
                        vehicle_id: vehicleId,
                        latitude,
                        longitude,
                        accuracy: accuracy || undefined,
                        altitude: altitude || undefined,
                        heading: heading || undefined,
                        speed: speed ? speed * 3.6 : undefined,
                        battery_level: batteryLevel,
                        is_moving: speed ? speed > 0.5 : undefined,
                    });
                },
                (error) => {
                    console.error('[GPS] Error:', error.message);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                }
            );
        } else {
            console.warn('[GPS] Geolocation not supported');
        }

        return () => {
            if (watchId !== null) {
                console.log('[GPS] Stopping GPS tracking');
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [enabled, driverId, vehicleId, sendPositionMutation]);

    return {
        isTracking: enabled && !!driverId,
        sendPosition: sendPositionMutation.mutate,
    };
};
