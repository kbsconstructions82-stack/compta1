import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Battery, Clock, Truck, User, Play, Square, RefreshCw } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTracking, useGPSTracking, TrackingPosition } from '../src/hooks/useTracking';
import { useAuth } from '../src/hooks/useAuth';
import { useEmployees } from '../src/hooks/useEmployees';
import { useVehicles } from '../src/hooks/useVehicles';
import { MobileTableWrapper, MobileCard, MobileCardRow } from './MobileTableWrapper';

// Fix pour les icônes Leaflet avec Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export const Tracking: React.FC = () => {
    const { currentUser } = useAuth();
    const { data: positions = [], isLoading, refetch } = useTracking();
    const { data: employees = [] } = useEmployees();
    const { data: vehicles = [] } = useVehicles();

    const [viewMode, setViewMode] = useState<'map' | 'table'>('map');
    const [selectedPosition, setSelectedPosition] = useState<TrackingPosition | null>(null);

    // Pour les chauffeurs : activer le suivi GPS automatiquement (pas de contrôle)
    const currentDriver = employees.find(e => e.id === currentUser?.id);
    const currentVehicle = vehicles.find(v => v.matricule === currentDriver?.vehicleMatricule);

    // GPS toujours actif pour les chauffeurs
    useGPSTracking(
        currentUser?.role === 'CHAUFFEUR' ? currentUser.id : undefined,
        currentVehicle?.id,
        currentUser?.role === 'CHAUFFEUR' // Toujours true pour les chauffeurs
    );

    // Format de date/heure
    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'À l\'instant';
        if (diffMins < 60) return `Il y a ${diffMins} min`;
        if (diffMins < 1440) return `Il y a ${Math.floor(diffMins / 60)}h`;
        return date.toLocaleString('fr-FR');
    };

    // Couleur selon l'ancienneté de la position
    const getStatusColor = (timestamp: string) => {
        const diffMins = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 60000);
        if (diffMins < 5) return 'bg-green-100 text-green-800';
        if (diffMins < 30) return 'bg-yellow-100 text-yellow-800';
        return 'bg-red-100 text-red-800';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Suivi GPS en Temps Réel</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {positions.length} position(s) active(s) • Mise à jour toutes les 10 secondes
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg flex items-center hover:bg-blue-100 transition-colors"
                >
                    <RefreshCw size={16} className="mr-2" />
                    Actualiser
                </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setViewMode('map')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            viewMode === 'map'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <MapPin size={16} className="inline mr-2" />
                        Carte Interactive
                    </button>
                    <button
                        onClick={() => setViewMode('table')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            viewMode === 'table'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Tableau
                    </button>
                </nav>
            </div>

            {/* Tracking Active Notice (Chauffeurs) */}
            {currentUser?.role === 'CHAUFFEUR' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
                    <Navigation size={24} className="text-green-600 mr-3 animate-pulse" />
                    <div>
                        <p className="text-sm font-bold text-green-800">🟢 GPS Toujours Actif</p>
                        <p className="text-xs text-green-600">
                            Votre position est automatiquement partagée en temps réel avec le bureau pour votre sécurité
                        </p>
                    </div>
                </div>
            )}

            {/* Loading */}
            {isLoading && (
                <div className="text-center py-12">
                    <RefreshCw size={32} className="animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-500">Chargement des positions...</p>
                </div>
            )}

            {/* Map View */}
            {viewMode === 'map' && !isLoading && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="h-[600px] relative">
                        {positions.length > 0 ? (
                            <MapContainer
                                center={[positions[0].latitude, positions[0].longitude]}
                                zoom={13}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                {positions.map((pos) => (
                                    <Marker
                                        key={pos.id}
                                        position={[pos.latitude, pos.longitude]}
                                    >
                                        <Popup>
                                            <div className="p-2">
                                                <div className="font-bold text-gray-800 mb-1">
                                                    {pos.driver_name || pos.driver_id}
                                                </div>
                                                {pos.vehicle_matricule && (
                                                    <div className="text-sm text-gray-600 flex items-center gap-1">
                                                        <Truck size={12} />
                                                        {pos.vehicle_matricule}
                                                    </div>
                                                )}
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {formatTimestamp(pos.timestamp || '')}
                                                </div>
                                                {pos.speed && pos.speed > 1 && (
                                                    <div className="text-xs text-blue-600 mt-1">
                                                        🚗 {pos.speed.toFixed(0)} km/h
                                                    </div>
                                                )}
                                            </div>
                                        </Popup>
                                    </Marker>
                                ))}
                            </MapContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center bg-gray-50">
                                <div className="text-center">
                                    <MapPin size={48} className="text-gray-400 mx-auto mb-3" />
                                    <p className="text-gray-500">Aucune position GPS disponible</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Les chauffeurs doivent activer leur GPS pour voir leurs positions
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Aperçu des positions */}
                        {positions.length > 0 && (
                            <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs z-[1000]">
                            <h4 className="font-bold text-gray-800 mb-3 text-sm">Positions Actives</h4>
                            <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                {positions.map((pos) => (
                                    <div
                                        key={pos.id}
                                        className="bg-gray-50 rounded p-2 cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => setSelectedPosition(pos)}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold text-gray-800">
                                                {pos.driver_name || pos.driver_id}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(pos.timestamp || '')}`}>
                                                {formatTimestamp(pos.timestamp || '')}
                                            </span>
                                        </div>
                                        {pos.vehicle_matricule && (
                                            <div className="flex items-center text-xs text-gray-600">
                                                <Truck size={12} className="mr-1" />
                                                {pos.vehicle_matricule}
                                            </div>
                                        )}
                                        <div className="text-xs text-gray-500 mt-1">
                                            📍 {pos.latitude.toFixed(5)}, {pos.longitude.toFixed(5)}
                                        </div>
                                        {pos.speed && pos.speed > 1 && (
                                            <div className="text-xs text-blue-600 mt-1">
                                                🚗 {pos.speed.toFixed(0)} km/h
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        )}
                    </div>
                </div>
            )}

            {/* Table View */}
            {viewMode === 'table' && !isLoading && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <MobileTableWrapper
                        title="Positions GPS"
                        mobileCards={
                            <>
                                {positions.map((pos) => (
                                    <MobileCard key={pos.id}>
                                        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                                <User size={24} className="text-blue-600" />
                                            </div>
                                            <div className="flex-1">
                                                <span className="font-bold text-gray-800 text-base">
                                                    {pos.driver_name || pos.driver_id}
                                                </span>
                                                {pos.vehicle_matricule && (
                                                    <div className="flex items-center text-sm text-gray-600 mt-1">
                                                        <Truck size={14} className="mr-1" />
                                                        {pos.vehicle_matricule}
                                                    </div>
                                                )}
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded font-medium ${getStatusColor(pos.timestamp || '')}`}>
                                                {formatTimestamp(pos.timestamp || '')}
                                            </span>
                                        </div>

                                        <MobileCardRow
                                            label="Position"
                                            value={`${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}`}
                                        />
                                        {pos.speed !== undefined && pos.speed > 0 && (
                                            <MobileCardRow
                                                label="Vitesse"
                                                value={<span className="font-bold text-blue-600">{pos.speed.toFixed(0)} km/h</span>}
                                            />
                                        )}
                                        {pos.accuracy && (
                                            <MobileCardRow
                                                label="Précision"
                                                value={`±${pos.accuracy.toFixed(0)} m`}
                                            />
                                        )}
                                        {pos.battery_level !== undefined && (
                                            <MobileCardRow
                                                label="Batterie"
                                                value={
                                                    <div className="flex items-center">
                                                        <Battery size={16} className={pos.battery_level < 20 ? 'text-red-600' : 'text-green-600'} />
                                                        <span className="ml-1">{pos.battery_level}%</span>
                                                    </div>
                                                }
                                            />
                                        )}
                                    </MobileCard>
                                ))}
                            </>
                        }
                    >
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chauffeur</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Véhicule</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vitesse</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Précision</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dernière Mise à Jour</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batterie</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {positions.map((pos) => (
                                    <tr key={pos.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <User size={16} className="text-gray-400 mr-2" />
                                                <span className="text-sm font-medium text-gray-900">
                                                    {pos.driver_name || pos.driver_id}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {pos.vehicle_matricule ? (
                                                <div className="flex items-center text-blue-600">
                                                    <Truck size={14} className="mr-1" />
                                                    <span className="text-sm font-medium">{pos.vehicle_matricule}</span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-xs text-gray-600">
                                                <MapPin size={14} className="mr-1 text-red-500" />
                                                <a
                                                    href={`https://www.openstreetmap.org/?mlat=${pos.latitude}&mlon=${pos.longitude}&zoom=15`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {pos.latitude.toFixed(5)}, {pos.longitude.toFixed(5)}
                                                </a>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {pos.speed !== undefined && pos.speed > 0 ? (
                                                <span className="text-sm font-bold text-blue-600">
                                                    {pos.speed.toFixed(0)} km/h
                                                </span>
                                            ) : (
                                                <span className="text-sm text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {pos.accuracy ? `±${pos.accuracy.toFixed(0)} m` : '—'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <Clock size={14} className="mr-1 text-gray-400" />
                                                <span className={`text-xs px-2 py-1 rounded ${getStatusColor(pos.timestamp || '')}`}>
                                                    {formatTimestamp(pos.timestamp || '')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {pos.battery_level !== undefined ? (
                                                <div className="flex items-center">
                                                    <Battery
                                                        size={16}
                                                        className={pos.battery_level < 20 ? 'text-red-600' : 'text-green-600'}
                                                    />
                                                    <span className="ml-1 text-sm text-gray-700">{pos.battery_level}%</span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </MobileTableWrapper>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && positions.length === 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <MapPin size={64} className="text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-700 mb-2">Aucune Position Active</h3>
                    <p className="text-gray-500">
                        Les positions GPS des chauffeurs apparaîtront ici en temps réel.
                    </p>
                    {currentUser?.role === 'CHAUFFEUR' && (
                        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 inline-block">
                            <p className="text-sm text-blue-800">
                                ⏳ Votre position sera visible dès que le signal GPS sera capté...
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
