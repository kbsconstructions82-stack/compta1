import React, { useState } from 'react';
import { Vehicle, VehicleType } from '../types';
import { Truck, Calendar, AlertTriangle, FileText, CheckCircle, Search, Filter, Clock, Plus, Edit2, X, Save, Trash2 } from 'lucide-react';
import { useVehicles, useUpdateVehicle, useAddVehicle, useDeleteVehicle } from '../src/hooks/useVehicles';
import { MobileTableWrapper, MobileCard, MobileCardRow } from './MobileTableWrapper';

export const Fleet: React.FC = () => {
    // Hooks
    const { data: vehicles = [] } = useVehicles();
    const updateVehicleMutation = useUpdateVehicle();
    const addVehicleMutation = useAddVehicle();
    const deleteVehicleMutation = useDeleteVehicle();

    const onUpdateVehicle = (updatedVehicle: Vehicle) => {
        updateVehicleMutation.mutate(updatedVehicle, {
            onSuccess: () => {
                alert('Véhicule mis à jour !');
                setIsModalOpen(false);
            },
            onError: (error: any) => {
                alert("Erreur mise à jour: " + error.message);
            }
        });
    };

    const onAddVehicle = (newVehicle: Vehicle) => {
        addVehicleMutation.mutate(newVehicle, {
            onSuccess: () => {
                alert('Véhicule ajouté !');
                setIsModalOpen(false);
            },
            onError: (error: any) => {
                alert("Erreur ajout véhicule: " + (error.message || "Inconnue. Vérifiez votre connexion."));
            }
        });
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentVehicle, setCurrentVehicle] = useState<Partial<Vehicle>>({});

    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'maintenance'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const getExpiryStatus = (dateStr: string) => {
        if (!dateStr) return { color: 'text-gray-400 bg-gray-50', icon: Clock, label: 'Non défini' };
        const today = new Date();
        const expiry = new Date(dateStr);
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { color: 'text-red-600 bg-red-50', icon: AlertTriangle, label: 'Expiré' };
        if (diffDays < 30) return { color: 'text-orange-600 bg-orange-50', icon: Clock, label: `${diffDays}j restants` };
        return { color: 'text-green-600 bg-green-50', icon: CheckCircle, label: 'Valide' };
    };

    const openAddModal = () => {
        setCurrentVehicle({
            id: '',
            type: VehicleType.TRUCK,
            matricule: '',
            brand: '',
            model: '',
            insurance_expiry: '',
            technical_visit_expiry: '',
            vignette_expiry: '',
            mileage: 0
        });
        setIsModalOpen(true);
    };

    const openEditModal = (vehicle: Vehicle) => {
        setCurrentVehicle({ ...vehicle });
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!currentVehicle.matricule || !currentVehicle.brand) {
            alert("Matricule et Marque sont obligatoires");
            return;
        }

        if (currentVehicle.id) {
            onUpdateVehicle(currentVehicle as Vehicle);
        } else {
            // Remove manual ID and tenant_id (handled by hook/backend)
            const newV = {
                ...currentVehicle,
                owner_id: 'CMP001', // TODO: Make this dynamic if multiple owners exist
                purchase_price: currentVehicle.purchase_price || 0
            } as Vehicle;
            onAddVehicle(newV);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Parc Roulant</h2>
                <button
                    onClick={openAddModal}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center"
                >
                    <Plus size={18} className="mr-2" /> Nouveau Véhicule
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <MobileTableWrapper
                    title="Véhicules"
                    mobileCards={
                        <>
                            {vehicles.map((vehicle) => {
                                const insuranceStatus = getExpiryStatus(vehicle.insurance_expiry);
                                const visiteStatus = getExpiryStatus(vehicle.technical_visit_expiry);
                                const vignetteStatus = getExpiryStatus(vehicle.vignette_expiry);

                                return (
                                    <MobileCard key={vehicle.id}>
                                        {/* En-tête avec matricule */}
                                        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                                            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                                                <Truck size={24} className="text-indigo-600" />
                                            </div>
                                            <div className="flex-1">
                                                <span className="font-mono font-bold text-gray-800 text-base">
                                                    {vehicle.matricule}
                                                </span>
                                                <p className="text-sm text-gray-600">{vehicle.brand} {vehicle.model}</p>
                                                <p className="text-xs text-gray-500">{vehicle.type}</p>
                                            </div>
                                        </div>

                                        {/* Informations */}
                                        <MobileCardRow 
                                            label="Kilométrage" 
                                            value={<span className="font-mono font-bold">{vehicle.mileage?.toLocaleString()} km</span>} 
                                        />

                                        {/* Statuts avec badges */}
                                        <div className="py-2 border-b border-gray-100">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-gray-600">Assurance</span>
                                                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${insuranceStatus.color}`}>
                                                    <insuranceStatus.icon size={12} />
                                                    <span>{insuranceStatus.label}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="py-2 border-b border-gray-100">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-gray-600">Visite Tech.</span>
                                                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${visiteStatus.color}`}>
                                                    <visiteStatus.icon size={12} />
                                                    <span>{visiteStatus.label}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="py-2 border-b border-gray-100">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-gray-600">Vignette</span>
                                                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${vignetteStatus.color}`}>
                                                    <vignetteStatus.icon size={12} />
                                                    <span>{vignetteStatus.label}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 mt-4">
                                            <button
                                                onClick={() => openEditModal(vehicle)}
                                                className="flex-1 py-3 px-4 bg-blue-50 text-blue-600 rounded-lg font-medium min-h-[48px] flex items-center justify-center gap-2 active:scale-95 transition-transform"
                                            >
                                                <Edit2 size={18} />
                                                <span>Modifier</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm(`Supprimer ${vehicle.matricule} ?`)) {
                                                        deleteVehicleMutation.mutate(vehicle.id);
                                                    }
                                                }}
                                                className="py-3 px-4 bg-red-50 text-red-600 rounded-lg font-medium min-h-[48px] flex items-center justify-center active:scale-95 transition-transform"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </MobileCard>
                                );
                            })}
                        </>
                    }
                >
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matricule</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type / Marque</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assurance</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kilométrage</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visite Technique</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taxe (Vignette)</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {vehicles.map((vehicle) => {
                                const insuranceStatus = getExpiryStatus(vehicle.insurance_expiry);
                                const visiteStatus = getExpiryStatus(vehicle.technical_visit_expiry);

                                return (
                                    <tr key={vehicle.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-3 py-1 rounded border border-gray-300 bg-gray-100 font-mono font-bold text-gray-800 text-sm">
                                                {vehicle.matricule}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{vehicle.brand} {vehicle.model}</div>
                                            <div className="text-xs text-gray-500">{vehicle.type}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className={`flex items-center space-x-2 px-2 py-1 rounded-full text-xs font-medium w-fit ${insuranceStatus.color}`}>
                                                <insuranceStatus.icon size={12} />
                                                <span>{insuranceStatus.label}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-700">{vehicle.mileage?.toLocaleString()} km</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className={`flex items-center space-x-2 px-2 py-1 rounded-full text-xs font-medium w-fit ${visiteStatus.color}`}>
                                                <visiteStatus.icon size={12} />
                                                <span>{visiteStatus.label}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {vehicle.vignette_expiry}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end space-x-3">
                                                <button 
                                                    onClick={() => openEditModal(vehicle)} 
                                                    className="text-blue-600 hover:text-blue-900 flex items-center"
                                                    title="Éditer"
                                                >
                                                    <Edit2 size={14} className="mr-1" /> Éditer
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`Êtes-vous sûr de vouloir supprimer le véhicule ${vehicle.matricule} ?`)) {
                                                            deleteVehicleMutation.mutate(vehicle.id, {
                                                                onSuccess: () => {
                                                                    alert('Véhicule supprimé avec succès !');
                                                                },
                                                                onError: (error: any) => {
                                                                    alert('Erreur lors de la suppression : ' + (error.message || 'Inconnue'));
                                                                }
                                                            });
                                                        }
                                                    }}
                                                    className="text-red-600 hover:text-red-900 flex items-center"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </MobileTableWrapper>
            </div>

            {/* --- ADD/EDIT MODAL --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center">
                                <Truck size={20} className="mr-2 text-blue-600" />
                                {currentVehicle.id ? 'Éditer Véhicule' : 'Nouveau Véhicule'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 min-h-[48px] min-w-[48px] flex items-center justify-center">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            {/* Row 1: Identifiers */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Matricule</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-sm font-mono font-bold text-white placeholder-gray-400"
                                        placeholder="123 TU 4567"
                                        value={currentVehicle.matricule || ''}
                                        onChange={e => setCurrentVehicle({ ...currentVehicle, matricule: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                    <select
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white text-gray-900"
                                        value={currentVehicle.type}
                                        onChange={e => setCurrentVehicle({ ...currentVehicle, type: e.target.value as VehicleType })}
                                    >
                                        {Object.values(VehicleType).map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Row 2: Make Model */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Marque</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-sm text-white placeholder-gray-400"
                                        placeholder="Ex: Volvo"
                                        value={currentVehicle.brand || ''}
                                        onChange={e => setCurrentVehicle({ ...currentVehicle, brand: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Modèle</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-sm text-white placeholder-gray-400"
                                        placeholder="Ex: FH16"
                                        value={currentVehicle.model || ''}
                                        onChange={e => setCurrentVehicle({ ...currentVehicle, model: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kilométrage Actuel</label>
                                    <input
                                        type="number"
                                        className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm"
                                        placeholder="0"
                                        value={currentVehicle.mileage || ''}
                                        onChange={e => setCurrentVehicle({ ...currentVehicle, mileage: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Conducteur Assigné</label>
                                    <input
                                        type="text"
                                        className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm"
                                        placeholder="Nom du conducteur"
                                        value={currentVehicle.driver_name || ''}
                                        onChange={e => setCurrentVehicle({ ...currentVehicle, driver_name: e.target.value })}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        💡 Lorsque vous créez un salarié chauffeur avec ce matricule, il sera automatiquement lié
                                    </p>
                                </div>
                            </div>

                            {/* Row 3: Admin Data */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">N° Châssis</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-sm text-white"
                                        value={currentVehicle.chassis_number || ''}
                                        onChange={e => setCurrentVehicle({ ...currentVehicle, chassis_number: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Achat</label>
                                    <input
                                        type="date"
                                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-sm text-white"
                                        value={currentVehicle.purchase_date || ''}
                                        onChange={e => setCurrentVehicle({ ...currentVehicle, purchase_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-gray-100 my-4 pt-4">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Dates d'Expiration (Alertes)</h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Assurance</label>
                                        <input
                                            type="date"
                                            className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-sm text-white"
                                            value={currentVehicle.insurance_expiry || ''}
                                            onChange={e => setCurrentVehicle({ ...currentVehicle, insurance_expiry: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Visite Tech.</label>
                                        <input
                                            type="date"
                                            className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-sm text-white"
                                            value={currentVehicle.technical_visit_expiry || ''}
                                            onChange={e => setCurrentVehicle({ ...currentVehicle, technical_visit_expiry: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Taxe (Vignette)</label>
                                        <input
                                            type="date"
                                            className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-sm text-white"
                                            value={currentVehicle.vignette_expiry || ''}
                                            onChange={e => setCurrentVehicle({ ...currentVehicle, vignette_expiry: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Boutons */}
                            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200 pb-20">
                                <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-300 rounded-lg min-h-[48px]">
                                    Annuler
                                </button>
                                <button onClick={handleSave} className="px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm flex items-center min-h-[48px]">
                                    <Save size={16} className="mr-2" /> Enregistrer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
};
