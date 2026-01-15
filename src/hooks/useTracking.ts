import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './useAuth';
import { getValidTenantUUID } from '../utils/tenantUtils';

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

            const tenantUUID = await getValidTenantUUID(currentUser?.tenant_id);

            // Récupérer les dernières positions via la vue
            const { data, error } = await supabase
                .from('latest_positions')
                .select('*')
                .eq('tenant_id', tenantUUID)
                .order('timestamp', { ascending: false });

            if (error) {
                console.error('[useTracking] Error fetching positions:', error);
                throw new Error(error.message);
            }

            return data as TrackingPosition[];
        },
        refetchInterval: 10000, // Rafraîchir toutes les 10 secondes
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
            if (!isSupabaseConfigured() || !driverId) {
                return [];
            }

            const tenantUUID = await getValidTenantUUID(currentUser?.tenant_id);

            const { data, error } = await supabase
                .from('tracking')
                .select('*')
                .eq('tenant_id', tenantUUID)
                .eq('driver_id', driverId)
                .order('timestamp', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('[useTrackingHistory] Error:', error);
                throw new Error(error.message);
            }

            return data as TrackingPosition[];
        },
        enabled: isSupabaseConfigured() && !!driverId,
    });
};

/**
 * Hook pour envoyer une nouvelle position GPS
 */
export const useSendPosition = () => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    return useMutation({
        mutationFn: async (position: TrackingPosition) => {
            if (!isSupabaseConfigured()) {
                throw new Error('Supabase not configured');
            }

            const tenantUUID = await getValidTenantUUID(currentUser?.tenant_id);

            const payload = {
                tenant_id: tenantUUID,
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

            const { data, error } = await supabase
                .from('tracking')
                .insert([payload])
                .select()
                .single();

            if (error) {
                console.error('[useSendPosition] Error:', error);
                throw new Error(error.message);
            }

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tracking'] });
        },
    });
};

/**
 * Hook personnalisé pour activer le suivi GPS automatique
 * Utilise l'API Geolocation HTML5
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

                    // Récupérer le niveau de batterie si disponible
                    let batteryLevel: number | undefined;
                    if ('getBattery' in navigator) {
                        (navigator as any).getBattery().then((battery: any) => {
                            batteryLevel = Math.round(battery.level * 100);
                        });
                    }

                    // Envoyer la position
                    sendPositionMutation.mutate({
                        driver_id: driverId,
                        vehicle_id: vehicleId,
                        latitude,
                        longitude,
                        accuracy: accuracy || undefined,
                        altitude: altitude || undefined,
                        heading: heading || undefined,
                        speed: speed ? speed * 3.6 : undefined, // Convertir m/s en km/h
                        battery_level: batteryLevel,
                        is_moving: speed ? speed > 0.5 : undefined, // Considéré en mouvement si > 0.5 m/s
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

        // Cleanup
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

// Import React for useEffect
import React from 'react';
