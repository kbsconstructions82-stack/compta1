import React, { useState, useMemo } from 'react';
import { calculatePayroll, calculatePayrollFromNet } from '../utils/taxUtils';
import { getEmployeeRate, EMPLOYEE_RATES } from '../src/utils/tariffs';
import { User, Info, MapPin, Edit2, Save, Plus, Trash2, Clock, X, CheckCircle, Settings, ChevronDown, Check } from 'lucide-react';
import { DriverState, TripRate } from '../types';
import { useEmployees, useAddEmployee, useDeleteEmployee } from '../src/hooks/useEmployees';
import { useTripRates, useUpdateTripRates } from '../src/hooks/useTripRates';
import { useActivity, useUpdateActivity } from '../src/hooks/useActivity';
import { DriverProfileContent } from './DriverProfile';


export const Payroll: React.FC = () => {
    // --- HOOKS ---
    const { data: employees = [] } = useEmployees();
    const addEmployeeMutation = useAddEmployee();
    const deleteEmployeeMutation = useDeleteEmployee();

    const { data: dbTripRates = [] } = useTripRates();
    const updateTripRatesMutation = useUpdateTripRates();

    const { data: monthlyActivity = {} } = useActivity();
    const updateActivityMutation = useUpdateActivity();

    // --- COMBINE DEFAULT TRIPS FROM tariffs.ts WITH DATABASE TRIPS ---
    // Convertir EMPLOYEE_RATES en format TripRate pour compatibilité
    const defaultTripRates: TripRate[] = useMemo(() => {
        return EMPLOYEE_RATES.map(route => ({
            departure: route.departure.charAt(0).toUpperCase() + route.departure.slice(1).replace(/\b\w/g, (l: string) => l.toUpperCase()),
            destination: route.destination.charAt(0).toUpperCase() + route.destination.slice(1).replace(/\b\w/g, (l: string) => l.toUpperCase()),
            truck_price: route.price // Prime employé = truck_price dans le format TripRate
        }));
    }, []);

    // Combiner les trajets par défaut avec ceux de la DB (la DB peut avoir des trajets personnalisés)
    // Les trajets de la DB remplacent ceux par défaut si c'est le même trajet (permettre override du prix)
    const tripRates: TripRate[] = useMemo(() => {
        const combined: TripRate[] = [];
        const processedKeys = new Set<string>();

        // D'abord ajouter tous les trajets par défaut
        defaultTripRates.forEach(defaultRate => {
            const key = `${defaultRate.departure}-${defaultRate.destination}`.toLowerCase();
            processedKeys.add(key);
            combined.push(defaultRate);
        });

        // Ensuite, remplacer les trajets par défaut par ceux de la DB si c'est le même trajet
        // Ou ajouter les nouveaux trajets personnalisés
        dbTripRates.forEach(dbRate => {
            const key = `${dbRate.departure}-${dbRate.destination}`.toLowerCase();
            const existingIndex = combined.findIndex(r =>
                `${r.departure}-${r.destination}`.toLowerCase() === key
            );

            if (existingIndex >= 0) {
                // Remplacer le trajet par défaut par celui de la DB (permet override du prix)
                combined[existingIndex] = dbRate;
            } else {
                // Nouveau trajet personnalisé (pas dans les trajets par défaut)
                combined.push(dbRate);
                processedKeys.add(key);
            }
        });

        return combined;
    }, [defaultTripRates, dbTripRates]);

    const onAddEmployee = (driver: DriverState, callbacks?: { onSuccess?: () => void, onError?: (err: any) => void }) => {
        addEmployeeMutation.mutate(driver, {
            onSuccess: () => {
                alert("Salarié ajouté avec succès !");
                callbacks?.onSuccess?.();
            },
            onError: (err) => {
                alert("Erreur lors de l'ajout : " + err.message);
                callbacks?.onError?.(err);
            }
        });
    };
    const onDeleteEmployee = (id: string) => {
        deleteEmployeeMutation.mutate(id, {
            onSuccess: () => alert("Salarié supprimé avec succès."),
            onError: (err) => alert("Erreur lors de la suppression : " + err.message)
        });
    };
    const onUpdateTripRates = (rates: TripRate[]) => {
        updateTripRatesMutation.mutate(rates, {
            onSuccess: () => alert("Tarifs mis à jour avec succès !"),
            onError: (err) => alert("Erreur : " + err.message)
        });
    };
    const onUpdateActivity = (driverId: string, routeName: string, count: number) => updateActivityMutation.mutate({ driverId, routeName, count });


    // --- STATE MANAGEMENT ---

    // Editing existing rate
    const [editingRateIndex, setEditingRateIndex] = useState<number | null>(null);
    const [editValues, setEditValues] = useState<TripRate>({ departure: '', destination: '', truck_price: 0 });

    // Adding new rate
    const [newRateValues, setNewRateValues] = useState<TripRate>({ departure: 'Kairouan', destination: '', truck_price: 0 });

    // Modals State
    const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
    const [activityModalDriverId, setActivityModalDriverId] = useState<string | null>(null);
    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

    // New Employee Form
    const [newEmployee, setNewEmployee] = useState<DriverState>({
        id: '',
        fullName: '',
        role: 'Chauffeur',
        baseSalary: 600,
        maritalStatus: 'Married',
        childrenCount: 0,
        cin: '',
        cnss_number: '',
        phone: '',
        email: '',
        vehicleMatricule: '',
        username: '',
        password: ''
    });

    // --- CALCULATIONS ---

    const calculateVariableBonus = (driverId: string) => {
        const activities = monthlyActivity[driverId] || {};
        let totalBonus = 0;

        Object.entries(activities).forEach(([routeName, count]) => {
            // routeName expected format: "Departure - Destination"
            const parts = routeName.split(' - ');
            if (parts.length >= 2) {
                const dep = parts[0].trim();
                const dest = parts[1].trim();

                // 1. Try Automated File Rate
                const autoRate = getEmployeeRate(dep, dest);
                if (autoRate > 0) {
                    totalBonus += (count as number) * autoRate;
                    return;
                }
            }

            // 2. Fallback to Editable Trip Rates (Legacy/Custom)
            const rateConfig = tripRates.find(r => `${r.departure} - ${r.destination}` === routeName);

            if (rateConfig) {
                totalBonus += (count as number) * rateConfig.truck_price;
            } else {
                // Fallback: check legacy destination match
                const legacy = tripRates.find(r => r.destination === routeName);
                if (legacy) {
                    totalBonus += (count as number) * legacy.truck_price;
                }
            }
        });

        return totalBonus;
    };

    // --- HANDLERS ---

    // Rate Configuration Handlers
    const startEditing = (index: number) => {
        const rate = tripRates[index];
        setEditingRateIndex(index);
        setEditValues(tripRates[index]);
    };

    const saveEditRate = (index: number) => {
        const rate = tripRates[index];
        // Vérifier si c'est un trajet par défaut
        const isDefault = defaultTripRates.some(r =>
            r.departure.toLowerCase() === rate.departure.toLowerCase() &&
            r.destination.toLowerCase() === rate.destination.toLowerCase()
        );

        if (isDefault) {
            // Pour les trajets par défaut, on peut modifier uniquement le prix
            // Sauvegarder comme trajet personnalisé avec le même départ/destination mais prix modifié
            // Cela permet de persister la modification dans la DB
            const existingCustom = dbTripRates.find(r =>
                r.departure.toLowerCase() === rate.departure.toLowerCase() &&
                r.destination.toLowerCase() === rate.destination.toLowerCase()
            );

            const updatedRate: TripRate = {
                departure: rate.departure, // Garder le départ original
                destination: rate.destination, // Garder la destination originale
                truck_price: editValues.truck_price // Prix modifié
            };

            if (existingCustom) {
                // Mettre à jour le trajet personnalisé existant
                const newDbRates = dbTripRates.map(r =>
                    (r.departure.toLowerCase() === rate.departure.toLowerCase() &&
                        r.destination.toLowerCase() === rate.destination.toLowerCase())
                        ? updatedRate
                        : r
                );
                onUpdateTripRates(newDbRates);
            } else {
                // Créer un nouveau trajet personnalisé avec le prix modifié
                onUpdateTripRates([...dbTripRates, updatedRate]);
            }

            setEditingRateIndex(null);
            return;
        }

        // Pour les trajets personnalisés, on peut tout modifier et sauvegarder dans la DB
        const dbIndex = dbTripRates.findIndex(r =>
            r.departure.toLowerCase() === rate.departure.toLowerCase() &&
            r.destination.toLowerCase() === rate.destination.toLowerCase()
        );

        if (dbIndex >= 0) {
            const newDbRates = [...dbTripRates];
            newDbRates[dbIndex] = editValues;
            onUpdateTripRates(newDbRates);
            setEditingRateIndex(null);
        }
    };

    const deleteRate = (index: number) => {
        const rate = tripRates[index];
        // Vérifier si c'est un trajet par défaut
        const isDefault = defaultTripRates.some(r =>
            r.departure.toLowerCase() === rate.departure.toLowerCase() &&
            r.destination.toLowerCase() === rate.destination.toLowerCase()
        );

        if (isDefault) {
            alert("⚠️ Les trajets par défaut (depuis Kairouan) ne peuvent pas être supprimés.\nVous ne pouvez supprimer que les trajets personnalisés ajoutés manuellement.");
            return;
        }

        if (confirm('Supprimer ce trajet personnalisé de la liste ?')) {
            // Supprimer uniquement de la DB (pas des tarifs par défaut)
            const newDbRates = dbTripRates.filter(r =>
                !(r.departure.toLowerCase() === rate.departure.toLowerCase() &&
                    r.destination.toLowerCase() === rate.destination.toLowerCase())
            );
            onUpdateTripRates(newDbRates);
        }
    };

    const addNewRate = () => {
        if (newRateValues.departure && newRateValues.destination && newRateValues.truck_price > 0) {
            // Vérifier si le trajet existe déjà dans les tarifs par défaut
            const existsInDefault = defaultTripRates.some(r =>
                r.departure.toLowerCase() === newRateValues.departure.toLowerCase() &&
                r.destination.toLowerCase() === newRateValues.destination.toLowerCase()
            );

            if (existsInDefault) {
                alert("⚠️ Ce trajet existe déjà dans les tarifs par défaut (depuis Kairouan).\nVous ne pouvez ajouter que des trajets personnalisés.");
                return;
            }

            // Ajouter uniquement les trajets personnalisés à la DB (pas les trajets par défaut)
            onUpdateTripRates([...dbTripRates, newRateValues]);
            setNewRateValues({ departure: 'Kairouan', destination: '', truck_price: 0 });
        }
    };

    // Employee Management
    const handleSubmitNewEmployee = () => {
        if (!newEmployee.fullName) {
            alert('⚠️ Veuillez remplir au moins le nom du salarié.');
            return;
        }

        // Vérifier si les identifiants sont fournis pour un chauffeur
        if (newEmployee.role === 'Chauffeur' && (!newEmployee.username || !newEmployee.password)) {
            const confirm = window.confirm(
                '⚠️ Aucun identifiant (username/password) fourni pour ce chauffeur.\n\n' +
                'Le chauffeur ne pourra pas se connecter à l\'application.\n\n' +
                'Souhaitez-vous continuer quand même ?'
            );
            if (!confirm) return;
        }

        const driver = {
            ...newEmployee
        } as DriverState;

        onAddEmployee(driver, {
            onSuccess: (createdEmployee: any) => {
                setIsAddEmployeeOpen(false);

                // Afficher un message de succès avec les identifiants si fournis
                if (newEmployee.username && newEmployee.password) {
                    alert(
                        `✅ Salarié créé avec succès !\n\n` +
                        `Nom: ${newEmployee.fullName}\n` +
                        `Rôle: ${newEmployee.role}\n\n` +
                        `🔐 IDENTIFIANTS DE CONNEXION:\n` +
                        `Username: ${newEmployee.username}\n` +
                        `Password: ${newEmployee.password}\n\n` +
                        `⚠️ IMPORTANT: Communiquez ces identifiants au salarié. Ils seront nécessaires pour se connecter à l'application.`
                    );
                } else {
                    alert(
                        `✅ Salarié créé avec succès !\n\n` +
                        `Nom: ${newEmployee.fullName}\n` +
                        `Rôle: ${newEmployee.role}\n\n` +
                        `⚠️ Aucun identifiant fourni. Le salarié ne pourra pas se connecter. Vous pouvez les ajouter plus tard en modifiant le salarié.`
                    );
                }

                // Reset form
                setNewEmployee({ id: '', fullName: '', role: 'Chauffeur', baseSalary: 600, maritalStatus: 'Married', childrenCount: 0, cin: '', cnss_number: '', phone: '', email: '', vehicleMatricule: '', username: '', password: '' });
            },
            onError: (err: any) => {
                alert(`❌ Erreur lors de la création du salarié: ${err.message || 'Erreur inconnue'}`);
            }
        });
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row click
        if (confirm("Êtes-vous sûr de vouloir supprimer cet employé ?")) {
            onDeleteEmployee(id);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Paie & Ressources Humaines</h2>
                    <div className="text-sm text-gray-500">
                        Gestion des salariés, configuration des trajets et calcul des primes variables.
                    </div>
                </div>
                <button
                    onClick={() => setIsAddEmployeeOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center shadow-sm"
                >
                    <Plus size={18} className="mr-2" /> Ajouter un Salarié
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN: Manageable Route Rates (Hover Box) */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="relative group z-30">
                        {/* The "Case" / Trigger */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all flex justify-between items-center group-hover:rounded-b-none">
                            <div className="flex items-center text-gray-800 font-bold">
                                <Settings size={20} className="mr-3 text-indigo-600" />
                                <span>Gérer Tarifs Trajets</span>
                            </div>
                            <div className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md text-xs font-bold flex items-center">
                                {tripRates.length} Trajets <ChevronDown size={14} className="ml-1" />
                            </div>
                        </div>

                        {/* The Dropdown Panel (Visible on Hover) */}
                        <div className="hidden group-hover:block absolute top-full left-0 w-full bg-white border border-t-0 border-gray-200 shadow-xl rounded-b-xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">

                            {/* List of existing rates */}
                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2 mb-4">
                                {tripRates.map((route, idx) => {
                                    const isDefault = defaultTripRates.some(r =>
                                        r.departure.toLowerCase() === route.departure.toLowerCase() &&
                                        r.destination.toLowerCase() === route.destination.toLowerCase()
                                    );

                                    return (
                                        <div key={idx} className={`flex justify-between items-center p-2 hover:bg-gray-50 rounded border ${isDefault ? 'border-blue-100 bg-blue-50/30' : 'border-transparent'} hover:border-gray-100 group/item`}>
                                            {editingRateIndex === idx ? (
                                                <div className="flex items-center w-full space-x-2">
                                                    {isDefault ? (
                                                        // Pour les trajets par défaut, afficher uniquement le prix en édition
                                                        <>
                                                            <div className="flex-1">
                                                                <div className="text-sm font-medium text-gray-700">{route.departure} - {route.destination}</div>
                                                                <div className="text-[10px] text-blue-600 font-medium mt-0.5">📍 Trajet par défaut (prix modifiable)</div>
                                                            </div>
                                                            <input
                                                                type="number"
                                                                className="w-24 border border-blue-300 rounded px-2 py-1 text-xs text-right font-bold"
                                                                value={editValues.truck_price}
                                                                onChange={(e) => setEditValues({ ...editValues, truck_price: Number(e.target.value) })}
                                                                placeholder="Prix"
                                                                min="0"
                                                                step="0.1"
                                                            />
                                                            <span className="text-xs text-gray-500">DT</span>
                                                        </>
                                                    ) : (
                                                        // Pour les trajets personnalisés, tout est modifiable
                                                        <>
                                                            <input
                                                                type="text"
                                                                className="w-1/3 border border-blue-300 rounded px-2 py-1 text-xs"
                                                                value={editValues.departure}
                                                                onChange={(e) => setEditValues({ ...editValues, departure: e.target.value })}
                                                                placeholder="Départ"
                                                            />
                                                            <input
                                                                type="text"
                                                                className="w-1/3 border border-blue-300 rounded px-2 py-1 text-xs"
                                                                value={editValues.destination}
                                                                onChange={(e) => setEditValues({ ...editValues, destination: e.target.value })}
                                                                placeholder="Arrivée"
                                                            />
                                                            <input
                                                                type="number"
                                                                className="w-1/4 border border-blue-300 rounded px-2 py-1 text-xs text-right"
                                                                value={editValues.truck_price}
                                                                onChange={(e) => setEditValues({ ...editValues, truck_price: Number(e.target.value) })}
                                                                placeholder="Prix"
                                                                min="0"
                                                                step="0.1"
                                                            />
                                                        </>
                                                    )}
                                                    <button onClick={() => saveEditRate(idx)} className="text-green-600 hover:bg-green-100 p-1 rounded transition-colors" title="Enregistrer">
                                                        <Check size={14} />
                                                    </button>
                                                    <button onClick={() => setEditingRateIndex(null)} className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors" title="Annuler">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium text-gray-700">{route.departure} - {route.destination}</div>
                                                        {isDefault && (
                                                            <div className="text-[10px] text-blue-600 font-medium mt-0.5">📍 Trajet par défaut</div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-indigo-600">{route.truck_price} <span className="text-[10px] text-gray-400 font-normal">DT (Net)</span></span>
                                                        {/* Crayon visible sur chaque ligne pour modifier le prix */}
                                                        <button
                                                            onClick={() => startEditing(idx)}
                                                            className="text-gray-500 hover:text-blue-600 p-1.5 rounded transition-colors hover:bg-blue-50"
                                                            title={isDefault ? "Modifier le prix (trajet par défaut)" : "Modifier le trajet"}
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        {!isDefault && (
                                                            <button
                                                                onClick={() => deleteRate(idx)}
                                                                className="text-gray-500 hover:text-red-600 p-1.5 rounded transition-colors hover:bg-red-50 opacity-0 group-hover/item:opacity-100"
                                                                title="Supprimer le trajet personnalisé"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Add New Rate Form */}
                            <div className="pt-3 border-t border-gray-100">
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Ajouter un trajet</p>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Départ"
                                        value={newRateValues.departure}
                                        onChange={(e) => setNewRateValues({ ...newRateValues, departure: e.target.value })}
                                    />
                                    <input
                                        type="text"
                                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Arrivée"
                                        value={newRateValues.destination}
                                        onChange={(e) => setNewRateValues({ ...newRateValues, destination: e.target.value })}
                                    />
                                    <input
                                        type="number"
                                        className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Prix Net"
                                        value={newRateValues.truck_price || ''}
                                        onChange={(e) => setNewRateValues({ ...newRateValues, truck_price: Number(e.target.value) })}
                                    />
                                    <button
                                        onClick={addNewRate}
                                        disabled={!newRateValues.departure || !newRateValues.destination || !newRateValues.truck_price}
                                        className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl text-xs text-blue-800 border border-blue-100">
                        <Info size={16} className="mb-2 text-blue-600" />
                        Pointez la souris sur <strong>"Gérer Tarifs Trajets"</strong> pour afficher, modifier ou ajouter de nouvelles destinations et leurs primes fixes.
                    </div>
                </div>

                {/* RIGHT COLUMN: Employee Table & Payroll */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-800 flex items-center">
                                <User className="mr-2 text-gray-500" /> Effectif & Salaire du Mois
                            </h3>
                            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">
                                {employees.length} Salariés
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employé</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Identifiants</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Salaire Base (Net)</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Activité</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Prime Trajets (Net)</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Coût Total</th>
                                        <th className="px-4 py-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {employees.map(driver => {
                                        const variableBonus = calculateVariableBonus(driver.id);
                                        // Use Net Calculation
                                        const payroll = calculatePayrollFromNet(
                                            driver.baseSalary,
                                            driver.maritalStatus,
                                            driver.childrenCount,
                                            variableBonus
                                        );

                                        return (
                                            <tr
                                                key={driver.id}
                                                className="hover:bg-blue-50 cursor-pointer transition-colors"
                                                onClick={() => setSelectedDriverId(driver.id)}
                                            >
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-600 font-bold">
                                                            {driver.fullName.charAt(0)}
                                                        </div>
                                                        <div className="ml-3">
                                                            <div className="text-sm font-medium text-gray-900 underline decoration-dotted decoration-gray-400 underline-offset-4">{driver.fullName}</div>
                                                            <div className="text-xs text-gray-500">{driver.role} • {driver.maritalStatus === 'Married' ? 'Marié' : 'Célib.'} ({driver.childrenCount} enf.)</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    {driver.username ? (
                                                        <div>
                                                            <div className="text-xs font-mono font-medium text-gray-700">
                                                                👤 {driver.username}
                                                            </div>
                                                            <div className="text-[10px] text-green-600 font-medium mt-0.5">
                                                                ✓ Connexion activée
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-gray-400 italic">
                                                            Aucun identifiant
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-500 font-mono">
                                                    {driver.baseSalary.toFixed(3)}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActivityModalDriverId(driver.id);
                                                        }}
                                                        className="inline-flex items-center px-2.5 py-1.5 border border-indigo-200 text-xs font-medium rounded text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                                                    >
                                                        <Clock size={14} className="mr-1.5" /> Saisir Activité
                                                    </button>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-blue-600 font-mono font-bold">
                                                    +{variableBonus.toFixed(3)}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-right">
                                                    <div className="text-sm font-bold text-gray-800 font-mono">{payroll.totalCost.toFixed(3)}</div>
                                                    <div className="text-[10px] text-gray-400">Entreprise</div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-right">
                                                    <button
                                                        onClick={(e) => handleDelete(driver.id, e)}
                                                        className="text-gray-400 hover:text-red-600 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {employees.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-10 text-center text-gray-500 italic">
                                                Aucun salarié enregistré. Cliquez sur "Ajouter un Salarié".
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
                        <Info className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <div className="ml-3">
                            <h4 className="text-sm font-bold text-yellow-800">Note sur la paie</h4>
                            <p className="text-sm text-yellow-700 mt-1">
                                Les montants affichés (Salaire Base, Primes) sont en <strong>NET (TTC)</strong> tel que perçu par le salarié.
                                Le système reconstitue automatiquement le Brut et calcule les charges patronales ("Coût Total" pour l'entreprise).
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MODAL: ADD EMPLOYEE --- */}
            {isAddEmployeeOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
                            <h3 className="text-lg font-bold text-gray-800">Nouveau Salarié</h3>
                            <button onClick={() => setIsAddEmployeeOpen(false)} className="min-h-[48px] min-w-[48px] flex items-center justify-center"><X className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nom Complet</label>
                                <input type="text" className="w-full border border-gray-300 rounded-lg p-2"
                                    value={newEmployee.fullName} onChange={e => setNewEmployee({ ...newEmployee, fullName: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">CIN</label>
                                    <input type="text" className="w-full border border-gray-300 rounded-lg p-2"
                                        placeholder="Ex: 12345678"
                                        value={newEmployee.cin || ''}
                                        onChange={e => setNewEmployee({ ...newEmployee, cin: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Numéro CNSS</label>
                                    <input type="text" className="w-full border border-gray-300 rounded-lg p-2"
                                        placeholder="Ex: 123456789012"
                                        value={newEmployee.cnss_number || ''}
                                        onChange={e => setNewEmployee({ ...newEmployee, cnss_number: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                                    <input type="tel" className="w-full border border-gray-300 rounded-lg p-2"
                                        placeholder="Ex: +216 20 123 456"
                                        value={newEmployee.phone || ''}
                                        onChange={e => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input type="email" className="w-full border border-gray-300 rounded-lg p-2"
                                        placeholder="Ex: mohamed@email.com"
                                        value={newEmployee.email || ''}
                                        onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                                    <select className="w-full border border-gray-300 rounded-lg p-2"
                                        value={newEmployee.role} onChange={e => setNewEmployee({ ...newEmployee, role: e.target.value })}
                                    >
                                        <option value="Chauffeur">Chauffeur</option>
                                        <option value="Mécano">Mécano</option>
                                        <option value="Administratif">Administratif</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Salaire Base Mensuel (Net)</label>
                                    <input type="number" className="w-full border border-gray-300 rounded-lg p-2"
                                        value={newEmployee.baseSalary} onChange={e => setNewEmployee({ ...newEmployee, baseSalary: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            {newEmployee.role === 'Chauffeur' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Immatricule Véhicule</label>
                                    <input type="text" className="w-full border border-gray-300 rounded-lg p-2 uppercase"
                                        placeholder="Ex: 180 TU 4521"
                                        value={newEmployee.vehicleMatricule || ''}
                                        onChange={e => setNewEmployee({ ...newEmployee, vehicleMatricule: e.target.value })}
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1">
                                        Note: Si ce véhicule n'existe pas, il sera automatiquement ajouté au Parc Roulant.
                                    </p>
                                </div>
                            )}

                            <div className="pt-4 border-t border-gray-100">
                                <h4 className="text-sm font-bold text-gray-800 mb-3">Accès Application Chauffeur</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Identifiant (Login)</label>
                                        <input type="text" className="w-full border border-gray-300 rounded-lg p-2"
                                            placeholder="Ex: mohamed"
                                            value={newEmployee.username || ''} onChange={e => setNewEmployee({ ...newEmployee, username: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                                        <input type="text" className="w-full border border-gray-300 rounded-lg p-2"
                                            placeholder="********"
                                            value={newEmployee.password || ''} onChange={e => setNewEmployee({ ...newEmployee, password: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Situation</label>
                                    <select className="w-full border border-gray-300 rounded-lg p-2"
                                        value={newEmployee.maritalStatus} onChange={e => setNewEmployee({ ...newEmployee, maritalStatus: e.target.value as any })}
                                    >
                                        <option value="Single">Célibataire</option>
                                        <option value="Married">Marié(e)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Enfants</label>
                                    <input type="number" className="w-full border border-gray-300 rounded-lg p-2"
                                        value={newEmployee.childrenCount} onChange={e => setNewEmployee({ ...newEmployee, childrenCount: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            
                            {/* Boutons */}
                            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200 pb-20">
                                <button onClick={() => setIsCreateModalOpen(false)} className="px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-300 rounded-lg min-h-[48px]">
                                    Annuler
                                </button>
                                <button onClick={handleSubmitNewEmployee} className="px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm min-h-[48px]">
                                    Enregistrer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL: ACTIVITY INPUT --- */}
            {activityModalDriverId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden h-[80vh] flex flex-col">
                        <div className="bg-indigo-50 p-4 border-b border-indigo-100 flex justify-between items-center flex-shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-indigo-900">Saisie Activité Mensuelle</h3>
                                <p className="text-xs text-indigo-600">
                                    {employees.find(e => e.id === activityModalDriverId)?.fullName}
                                </p>
                            </div>
                            <button onClick={() => setActivityModalDriverId(null)}><X className="text-indigo-400 hover:text-indigo-600" /></button>
                        </div>

                        <div className="p-0 overflow-y-auto flex-1 custom-scrollbar">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trajet (Départ - Arrivée)</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Prime Camion (Net)</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Nombre de Trajets</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total (Net)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {tripRates.map((route, idx) => {
                                        const routeName = `${route.departure} - ${route.destination}`;
                                        const trips = monthlyActivity[activityModalDriverId]?.[routeName] || 0;
                                        const total = trips * route.truck_price;

                                        return (
                                            <tr key={idx} className={trips > 0 ? "bg-indigo-50/50" : ""}>
                                                <td className="px-4 py-3 text-sm text-gray-700 font-medium">{route.departure} - {route.destination}</td>
                                                <td className="px-4 py-3 text-sm text-gray-500 text-right">{route.truck_price}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        className="w-20 border border-gray-300 rounded text-center text-sm p-1 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                        placeholder="0"
                                                        value={trips || ''}
                                                        onChange={(e) => {
                                                            const routeName = `${route.departure} - ${route.destination}`;
                                                            onUpdateActivity(activityModalDriverId, routeName, Number(e.target.value));
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-sm text-indigo-700 font-bold text-right">
                                                    {total > 0 ? total.toFixed(0) : '-'} <span className="text-[10px] font-normal text-gray-400">DT</span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center flex-shrink-0">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold">Total Prime Variable (Net)</p>
                                <p className="text-2xl font-bold text-indigo-600">
                                    {calculateVariableBonus(activityModalDriverId).toFixed(3)} <span className="text-sm text-gray-400">TND</span>
                                </p>
                            </div>
                            <button onClick={() => setActivityModalDriverId(null)} className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center">
                                <CheckCircle size={16} className="mr-2" /> Valider & Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL: DRIVER PROFILE --- */}
            {selectedDriverId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden h-[90vh] flex flex-col relative">
                        <button
                            onClick={() => setSelectedDriverId(null)}
                            className="absolute top-4 right-4 z-10 bg-white/50 hover:bg-white rounded-full p-2 backdrop-blur-sm transition-all text-gray-800 hover:text-red-500 hover:shadow-lg"
                        >
                            <X size={24} />
                        </button>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gray-50">
                            <DriverProfileContent driverId={selectedDriverId} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
