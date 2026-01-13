import React, { useState, useEffect } from 'react';
import { DriverState, TripRate, Vehicle, Expense, ExpenseCategory } from '../types';
import { User, Truck, MapPin, Calendar, DollarSign, Activity, FileText, Save, Edit2, X, Settings, Plus, Receipt, CheckCircle } from 'lucide-react';
import { useAuth } from '../src/hooks/useAuth';
import { useEmployees, useUpdateEmployee } from '../src/hooks/useEmployees';
import { useTripRates } from '../src/hooks/useTripRates';
import { useActivity } from '../src/hooks/useActivity';
import { useVehicles, useUpdateVehicle } from '../src/hooks/useVehicles';
import { useExpenses, useAddExpense } from '../src/hooks/useExpenses';
import { calculateTTC, calculateTVA } from '../utils/taxUtils';
import { uploadFile } from '../src/lib/supabase';

interface DriverProfileContentProps {
    driverId?: string;
}

export const DriverProfileContent: React.FC<DriverProfileContentProps> = ({ driverId }) => {
    const { currentUser } = useAuth();
    const { data: employees = [] } = useEmployees();
    const updateEmployeeMutation = useUpdateEmployee();
    const { data: tripRates = [] } = useTripRates();
    const { data: monthlyActivity = {} } = useActivity();
    const { data: vehicles = [] } = useVehicles();
    const { data: expenses = [] } = useExpenses();
    const addExpenseMutation = useAddExpense();
    const updateVehicleMutation = useUpdateVehicle();

    const targetId = driverId || currentUser?.id;
    const driver = employees.find(e => e.id === targetId);

    // Check if current user is viewing their own profile as a driver
    const isDriverViewingOwnProfile = currentUser?.role === 'CHAUFFEUR' && targetId === currentUser?.id;

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    
    // Expense Declaration State
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [newExpense, setNewExpense] = useState<Partial<Expense>>({
        date: new Date().toISOString().split('T')[0],
        category: ExpenseCategory.FUEL,
        payment_status: 'Paid',
        is_deductible: true,
        tva_rate: 19,
        amount_ht: 0,
        tva_amount: 0,
        amount_ttc: 0
    });
    
    // Additional fields for specific expense types
    const [expiryDate, setExpiryDate] = useState<string>('');

    useEffect(() => {
        if (driver) {
            setEditForm({
                fullName: driver.fullName,
                role: driver.role,
                baseSalary: driver.baseSalary,
                maritalStatus: driver.maritalStatus,
                childrenCount: driver.childrenCount,
                username: driver.username || '',
                password: driver.password || '',
                vehicleMatricule: driver.vehicleMatricule || ''
            });
        }
    }, [driver]);

    if (!driver) return <div className="p-10 text-center text-gray-500">Chargement du profil...</div>;

    const driverActivity = monthlyActivity[targetId] || {};
    // Calculate Stats
    const totalTrips = Object.values(driverActivity).reduce((a, b) => a + (b as number), 0);
    const variablePrime = Object.entries(driverActivity).reduce((total, [routeName, count]) => {
        let rateConfig = tripRates.find(r => `${r.departure} - ${r.destination}` === routeName);
        if (!rateConfig) rateConfig = tripRates.find(r => r.destination === routeName);
        return total + ((count as number) * (rateConfig?.truck_price || 0));
    }, 0);

    const handleSave = () => {
        updateEmployeeMutation.mutate({ id: targetId, ...editForm }, {
            onSuccess: () => {
                setIsEditing(false);
                alert("Profil mis à jour avec succès !");
            },
            onError: (err: any) => alert("Erreur : " + err.message)
        });
    };

    // Allowed categories for drivers (excluding SALARY, OFFICE, PERSONAL, OTHER)
    const allowedCategories = [
        ExpenseCategory.FUEL,
        ExpenseCategory.MAINTENANCE,
        ExpenseCategory.SPARE_PARTS,
        ExpenseCategory.TOLLS,
        ExpenseCategory.INSURANCE,
        ExpenseCategory.TAXES
    ];

    // Check if category requires expiry date
    const requiresExpiryDate = (category: ExpenseCategory) => {
        return category === ExpenseCategory.INSURANCE || 
               category === ExpenseCategory.TAXES ||
               (category === ExpenseCategory.MAINTENANCE && newExpense.description?.toLowerCase().includes('visite technique'));
    };

    const handleCalculateTax = (amount: number, type: 'ht' | 'ttc') => {
        const rate = newExpense.tva_rate || 19;
        let ht, tva, ttc;

        if (type === 'ht') {
            ht = amount;
            tva = calculateTVA(ht, rate);
            ttc = calculateTTC(ht, rate);
        } else {
            ttc = amount;
            ht = ttc / (1 + (rate / 100));
            tva = ttc - ht;
        }

        setNewExpense({
            ...newExpense,
            amount_ht: parseFloat(ht.toFixed(3)),
            tva_amount: parseFloat(tva.toFixed(3)),
            amount_ttc: parseFloat(ttc.toFixed(3))
        });
    };

    const handleSaveExpense = () => {
        // Validation
        if (!newExpense.description || newExpense.description.trim() === '') {
            alert("Erreur : Veuillez entrer une description.");
            return;
        }
        if (!newExpense.amount_ht || newExpense.amount_ht <= 0) {
            alert("Erreur : Veuillez entrer un montant (HT) valide.");
            return;
        }
        if (!newExpense.date) {
            alert("Erreur : La date est obligatoire.");
            return;
        }
        if (!driver?.vehicleMatricule) {
            alert("Erreur : Aucun véhicule associé à votre profil.");
            return;
        }

        // Check if expiry date is required
        if (requiresExpiryDate(newExpense.category as ExpenseCategory) && !expiryDate) {
            alert("Erreur : La date d'expiration est obligatoire pour cette catégorie.");
            return;
        }

        // Find the vehicle associated with the driver
        const driverVehicle = vehicles.find(v => v.matricule === driver.vehicleMatricule);
        if (!driverVehicle) {
            alert("Erreur : Véhicule non trouvé dans le parc roulant.");
            return;
        }

        const expense: Expense = {
            ...newExpense,
            vehicle_id: driverVehicle.id,
            driver_id: targetId
        } as Expense;

        // Save expense
        addExpenseMutation.mutate(expense, {
            onSuccess: () => {
                // Update vehicle expiry dates if applicable
                if (expiryDate && driverVehicle) {
                    const updatedVehicle: Vehicle = { ...driverVehicle };
                    
                    if (newExpense.category === ExpenseCategory.INSURANCE) {
                        updatedVehicle.insurance_expiry = expiryDate;
                    } else if (newExpense.category === ExpenseCategory.TAXES) {
                        updatedVehicle.vignette_expiry = expiryDate;
                    } else if (newExpense.category === ExpenseCategory.MAINTENANCE && 
                               newExpense.description?.toLowerCase().includes('visite technique')) {
                        updatedVehicle.technical_visit_expiry = expiryDate;
                    }

                    updateVehicleMutation.mutate(updatedVehicle, {
                        onSuccess: () => {
                            alert("Dépense enregistrée et dates du véhicule mises à jour avec succès !");
                        },
                        onError: (error: any) => {
                            alert("Dépense enregistrée, mais erreur lors de la mise à jour du véhicule : " + error.message);
                        }
                    });
                } else {
                    alert("Dépense enregistrée avec succès !");
                }

                // Reset form
                setShowExpenseForm(false);
                setNewExpense({
                    date: new Date().toISOString().split('T')[0],
                    category: ExpenseCategory.FUEL,
                    payment_status: 'Paid',
                    is_deductible: true,
                    tva_rate: 19,
                    amount_ht: 0,
                    tva_amount: 0,
                    amount_ttc: 0
                });
                setExpiryDate('');
            },
            onError: (error: any) => {
                console.error("Erreur lors de l'enregistrement:", error);
                alert("Une erreur est survenue lors de l'enregistrement : " + (error.message || "Erreur inconnue"));
            }
        });
    };

    // Find the driver's vehicle
    const driverVehicle = vehicles.find(v => v.matricule === driver?.vehicleMatricule);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header / Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

                <div className="relative flex flex-col md:flex-row items-center md:items-end mt-8">
                    <div className="w-24 h-24 bg-white p-1 rounded-full shadow-lg">
                        <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                            <User size={40} />
                        </div>
                    </div>
                    <div className="mt-4 md:mt-0 md:ml-6 text-center md:text-left flex-1">
                        {isEditing ? (
                            <input
                                type="text"
                                value={editForm.fullName}
                                onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                                className="text-2xl font-bold text-gray-900 border-b border-gray-300 focus:border-indigo-500 outline-none w-full bg-transparent"
                            />
                        ) : (
                            <h1 className="text-2xl font-bold text-gray-800">{driver.fullName}</h1>
                        )}
                        <p className="text-gray-500">Chauffeur Professionnel • {driver.role}</p>
                    </div>
                    {!isDriverViewingOwnProfile && (
                        <div className="mt-4 md:mt-0 flex space-x-3 items-end">
                            {isEditing ? (
                                <>
                                    <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-700 shadow-sm">
                                        <Save size={16} className="mr-2" /> Enregistrer
                                    </button>
                                    <button onClick={() => setIsEditing(false)} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center hover:bg-gray-50 shadow-sm">
                                        <X size={16} className="mr-2" /> Annuler
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => setIsEditing(true)} className="bg-white border border-indigo-200 text-indigo-600 px-4 py-2 rounded-lg flex items-center hover:bg-indigo-50 shadow-sm transition-all">
                                    <Edit2 size={16} className="mr-2" /> Modifier Fiche
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {isEditing && !isDriverViewingOwnProfile && (
                    <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-300">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Identifiant (Login)</label>
                            <input
                                type="text"
                                value={editForm.username}
                                onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mot De Passe</label>
                            <input
                                type="text"
                                value={editForm.password}
                                onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Véhicule (Matricule)</label>
                            <input
                                type="text"
                                value={editForm.vehicleMatricule}
                                onChange={e => setEditForm({ ...editForm, vehicleMatricule: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Situation Familiale</label>
                            <select
                                value={editForm.maritalStatus}
                                onChange={e => setEditForm({ ...editForm, maritalStatus: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                            >
                                <option value="Single">Célibataire</option>
                                <option value="Married">Marié(e)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre d'Enfants</label>
                            <input
                                type="number"
                                value={editForm.childrenCount}
                                onChange={e => setEditForm({ ...editForm, childrenCount: Number(e.target.value) })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Salaire Base (TTC)</label>
                            <input
                                type="number"
                                value={editForm.baseSalary}
                                onChange={e => setEditForm({ ...editForm, baseSalary: Number(e.target.value) })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Income Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-gray-500 text-sm font-medium">Salaire de Base (TTC)</h3>
                        <div className="p-2 bg-gray-100 rounded-lg text-gray-600"><DollarSign size={18} /></div>
                    </div>
                    <p className="text-3xl font-bold text-gray-800">{driver.baseSalary} <span className="text-sm font-normal text-gray-400">TND</span></p>
                    <p className="text-xs text-green-600 mt-2 flex items-center">
                        <Activity size={12} className="mr-1" /> Fixe Mensuel
                    </p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-gray-500 text-sm font-medium">Primes Trajets (Est. TTC)</h3>
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><MapPin size={18} /></div>
                    </div>
                    <p className="text-3xl font-bold text-indigo-600">{variablePrime.toFixed(3)} <span className="text-sm font-normal text-indigo-300">TND</span></p>
                    <p className="text-xs text-indigo-500 mt-2">Basé sur {totalTrips} voyages validés</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-gray-500 text-sm font-medium">Total Est. (TTC)</h3>
                        <div className="p-2 bg-green-100 rounded-lg text-green-600"><DollarSign size={18} /></div>
                    </div>
                    <p className="text-3xl font-bold text-green-700">{(driver.baseSalary + variablePrime).toFixed(3)} <span className="text-sm font-normal text-green-400">TND</span></p>
                    <p className="text-xs text-gray-400 mt-2">Salaire + Primes</p>
                </div>
            </div>

            {/* Monthly Activity Detail */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 flex items-center">
                        <FileText size={18} className="mr-2 text-gray-500" /> Historique Activité (Derniers 30 Jours)
                    </h3>
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-600">Mois en cours</span>
                </div>

                {Object.keys(driverActivity).length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tarif (Prime TTC)</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Nb Trajets</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total (TTC)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {Object.entries(driverActivity).map(([routeName, count]) => {
                                // Match logic same as global calc
                                let rateConfig = tripRates.find(r => `${r.departure} - ${r.destination}` === routeName);
                                if (!rateConfig) {
                                    rateConfig = tripRates.find(r => r.destination === routeName);
                                }

                                const price = rateConfig ? rateConfig.truck_price : 0;
                                const totalRow = (count as number) * price;

                                return (
                                    <tr key={routeName} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{routeName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{price.toFixed(3)} TND</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-800 font-bold">{count as number}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600 font-bold">{totalRow.toFixed(3)} TND</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-gray-50">
                            <tr>
                                <td colSpan={3} className="px-6 py-4 text-sm font-bold text-gray-600 text-right">Total Primes Variables (TTC)</td>
                                <td className="px-6 py-4 text-sm font-bold text-indigo-600 text-right">{variablePrime.toFixed(3)} TND</td>
                            </tr>
                        </tfoot>
                    </table>
                ) : (
                    <div className="p-12 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                            <Activity className="text-gray-400" size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">Aucune activité enregistrée</h3>
                        <p className="mt-1 text-gray-500">Vos trajets validés apparaîtront ici.</p>
                    </div>
                )}
            </div>

            {/* Expense Declaration Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 flex items-center">
                        <Receipt size={18} className="mr-2 text-blue-600" /> Mes Dépenses
                    </h3>
                    <button
                        onClick={() => setShowExpenseForm(!showExpenseForm)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center shadow-sm transition-all"
                    >
                        <Plus size={16} className="mr-2" /> Déclarer une Dépense
                    </button>
                </div>

                {/* Expense Form */}
                {showExpenseForm && (
                    <div className="p-6 bg-gray-50 border-b border-gray-200">
                        <div className="max-w-3xl mx-auto space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                    <input
                                        type="date"
                                        className="w-full border border-gray-300 rounded-md p-2"
                                        value={newExpense.date}
                                        onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                                    <select
                                        className="w-full border border-gray-300 rounded-md p-2 bg-white"
                                        value={newExpense.category}
                                        onChange={e => setNewExpense({ ...newExpense, category: e.target.value as ExpenseCategory })}
                                    >
                                        {allowedCategories.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description / Fournisseur</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-md p-2"
                                    placeholder="ex: Station Shell - Plein de carburant"
                                    value={newExpense.description || ''}
                                    onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Référence Facture</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-md p-2"
                                    placeholder="ex: FC-12345"
                                    value={newExpense.invoice_ref_supplier || ''}
                                    onChange={e => setNewExpense({ ...newExpense, invoice_ref_supplier: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Montant (HT)</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        className="w-full border border-gray-300 rounded-md p-2"
                                        value={newExpense.amount_ht}
                                        onChange={e => handleCalculateTax(Number(e.target.value), 'ht')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Taux TVA (%)</label>
                                    <select
                                        className="w-full border border-gray-300 rounded-md p-2"
                                        value={newExpense.tva_rate}
                                        onChange={e => {
                                            setNewExpense({ ...newExpense, tva_rate: Number(e.target.value) });
                                            handleCalculateTax(newExpense.amount_ht || 0, 'ht');
                                        }}
                                    >
                                        <option value="19">19% (Standard)</option>
                                        <option value="13">13% (Carburant Spéc.)</option>
                                        <option value="7">7% (Services)</option>
                                        <option value="0">0% (Exonéré/Assurance)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Montant (TTC)</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        className="w-full border border-gray-300 rounded-md p-2 font-bold"
                                        value={newExpense.amount_ttc}
                                        onChange={e => handleCalculateTax(Number(e.target.value), 'ttc')}
                                    />
                                </div>
                            </div>

                            {/* Expiry Date Field (Conditional) */}
                            {requiresExpiryDate(newExpense.category as ExpenseCategory) && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <label className="block text-sm font-medium text-yellow-800 mb-2">
                                        📅 Date d'Expiration {newExpense.category === ExpenseCategory.INSURANCE ? "(Assurance)" : 
                                                             newExpense.category === ExpenseCategory.TAXES ? "(Vignette)" : "(Visite Technique)"}
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full border border-yellow-300 rounded-md p-2 bg-white"
                                        value={expiryDate}
                                        onChange={e => setExpiryDate(e.target.value)}
                                    />
                                    <p className="text-xs text-yellow-700 mt-1">
                                        Cette date sera automatiquement enregistrée dans le Parc Roulant pour votre véhicule ({driver?.vehicleMatricule}).
                                    </p>
                                </div>
                            )}

                            {/* File Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pièce Justificative (Photo/Scan)</label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-blue-400 transition-colors">
                                    <div className="space-y-1 text-center">
                                        {newExpense.attachment_url ? (
                                            <div className="flex flex-col items-center">
                                                <div className="text-green-600 mb-2">
                                                    <CheckCircle size={32} />
                                                </div>
                                                <p className="text-sm text-gray-600">Fichier joint avec succès !</p>
                                                <a href={newExpense.attachment_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                                                    Voir le document
                                                </a>
                                                <button
                                                    onClick={() => setNewExpense({ ...newExpense, attachment_url: undefined })}
                                                    className="mt-2 text-xs text-red-500 hover:text-red-700"
                                                >
                                                    Supprimer
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <svg
                                                    className="mx-auto h-12 w-12 text-gray-400"
                                                    stroke="currentColor"
                                                    fill="none"
                                                    viewBox="0 0 48 48"
                                                    aria-hidden="true"
                                                >
                                                    <path
                                                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                                        strokeWidth={2}
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                                <div className="flex text-sm text-gray-600 justify-center">
                                                    <label
                                                        htmlFor="driver-file-upload"
                                                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                                                    >
                                                        <span>Téléverser un fichier</span>
                                                        <input
                                                            id="driver-file-upload"
                                                            name="driver-file-upload"
                                                            type="file"
                                                            className="sr-only"
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    const url = await uploadFile('documents', file, 'expenses');
                                                                    if (url) {
                                                                        setNewExpense({ ...newExpense, attachment_url: url });
                                                                    } else {
                                                                        alert("Erreur lors de l'upload.");
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                                <p className="text-xs text-gray-500">PNG, JPG, PDF jusqu'à 5MB</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start space-x-3 bg-blue-50 p-3 rounded-md">
                                <input
                                    type="checkbox"
                                    id="driver-deductible"
                                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded"
                                    checked={newExpense.is_deductible}
                                    onChange={e => setNewExpense({ ...newExpense, is_deductible: e.target.checked })}
                                />
                                <label htmlFor="driver-deductible" className="text-sm text-gray-700">
                                    <span className="font-medium block text-gray-900">TVA Déductible / Récupérable</span>
                                    <span className="text-xs text-gray-500">
                                        Décocher pour les dépenses non admises fiscalement.
                                    </span>
                                </label>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                                <button
                                    onClick={() => {
                                        setShowExpenseForm(false);
                                        setNewExpense({
                                            date: new Date().toISOString().split('T')[0],
                                            category: ExpenseCategory.FUEL,
                                            payment_status: 'Paid',
                                            is_deductible: true,
                                            tva_rate: 19,
                                            amount_ht: 0,
                                            tva_amount: 0,
                                            amount_ttc: 0
                                        });
                                        setExpiryDate('');
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSaveExpense}
                                    disabled={addExpenseMutation.isPending}
                                    className={`bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center ${addExpenseMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <Save size={16} className="mr-2" />
                                    {addExpenseMutation.isPending ? 'Enregistrement...' : 'Enregistrer la Dépense'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Message informatif - pas d'historique pour les chauffeurs */}
                {!showExpenseForm && (
                    <div className="p-8 text-center bg-blue-50 border-t border-blue-100">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-3">
                            <Receipt className="text-blue-600" size={24} />
                        </div>
                        <h3 className="text-base font-medium text-gray-900">Déclaration de Dépenses</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            Utilisez le bouton ci-dessus pour déclarer vos dépenses liées à votre véhicule.
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                            Catégories disponibles : Carburant, Entretien, Pièces, Péage, Assurance, Taxes
                        </p>
                        <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                            <p className="text-xs text-gray-600">
                                ℹ️ Vos déclarations seront validées par l'administration. 
                                Pour consulter l'historique, contactez votre responsable.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export const DriverProfile: React.FC = () => {
    return <DriverProfileContent />;
};
