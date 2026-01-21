import React, { useState, useMemo } from 'react';
import { Expense, ExpenseCategory, Vehicle, PaymentMethod } from '../types';
import { useDatabase } from '../contexts/DatabaseContext';
import { Trash2, Plus, FileText, Filter, Calendar, DollarSign, Download, Search, X, Check, Truck, PieChart, TrendingUp, CheckCircle, Receipt } from 'lucide-react';
import { calculateTTC, calculateTVA } from '../utils/taxUtils';
import { MOCK_DRIVERS } from '../constants';
import { MobileTableWrapper, MobileCard, MobileCardRow } from './MobileTableWrapper';

import { useExpenses, useAddExpense, useDeleteExpense } from '../src/hooks/useExpenses';
import { useVehicles, useUpdateVehicle } from '../src/hooks/useVehicles';
import { useAuth } from '../src/hooks/useAuth';
import { uploadFile } from '../src/lib/supabase';

// Helper to get beneficiary
const getBeneficiaryInfo = (vehicleId: string, vehicles: Vehicle[]) => {
  const vehicle = vehicles.find(v => v.id === vehicleId);
  if (!vehicle) return null;

  // Logic: If truck -> Owner (for maintenance/parts) or Driver (for food/allowance)
  // For simplicity in this demo, we show the Owner.
  return {
    type: 'Propriétaire',
    name: vehicle.owner_id === 'CMP001' ? 'Société (Interne)' : vehicle.owner_id // owner_id might need a lookup if it is a UUID
  };
};

export const Expenses: React.FC = () => {
  const { coreAccounting, tvaEngine, refreshData } = useDatabase();
  const [viewMode, setViewMode] = useState<'journal' | 'analytics' | 'form'>('journal');

  // Hooks
  const { data: expenses = [] } = useExpenses();
  const addExpenseMutation = useAddExpense();
  const deleteExpenseMutation = useDeleteExpense();
  const { data: vehicles = [] } = useVehicles();
  const updateVehicleMutation = useUpdateVehicle();
  const { currentUser } = useAuth();

  const userRole = currentUser?.role || 'ADMIN';
  const userVehicleId = undefined; // TODO: Implement finding driver's vehicle via hook if needed

  // Expiry date state for vehicle-related expenses
  const [expiryDate, setExpiryDate] = useState<string>('');

  // Allowed categories based on role
  const allowedCategories = userRole === 'CHAUFFEUR'
    ? [
        ExpenseCategory.FUEL,
        ExpenseCategory.MAINTENANCE,
        ExpenseCategory.SPARE_PARTS,
        ExpenseCategory.TOLLS,
        ExpenseCategory.INSURANCE,
        ExpenseCategory.TAXES
      ]
    : Object.values(ExpenseCategory); // Admin sees all categories



  // Filter expenses based on role
  // Chauffeurs cannot see: SALARY, OFFICE, PERSONAL, OTHER
  const excludedCategoriesForDriver = [
    ExpenseCategory.SALARY,
    ExpenseCategory.OFFICE,
    ExpenseCategory.PERSONAL,
    ExpenseCategory.OTHER
  ];
  
  const visibleExpenses = (userRole === 'CHAUFFEUR' && userVehicleId)
    ? expenses.filter(e => 
        e.vehicle_id === userVehicleId && 
        !excludedCategoriesForDriver.includes(e.category)
      )
    : expenses;

  // Form State
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    date: new Date().toISOString().split('T')[0],
    category: ExpenseCategory.FUEL,
    payment_status: 'Paid',
    is_deductible: true,
    tva_rate: 19,
    amount_ht: 0,
    tva_amount: 0,
    amount_ttc: 0,
    fuel_liters: undefined
  });

  // --- Calculations ---

  const financials = useMemo(() => {
    const totalHT = visibleExpenses.reduce((sum, e) => sum + e.amount_ht, 0);
    const totalTVA = visibleExpenses.reduce((sum, e) => sum + (e.is_deductible ? e.tva_amount : 0), 0);
    const totalFuel = visibleExpenses
      .filter(e => e.category === ExpenseCategory.FUEL)
      .reduce((sum, e) => sum + e.amount_ht, 0);

    return { totalHT, totalTVA, totalFuel };
  }, [visibleExpenses]);

  const fleetAnalytics = useMemo(() => {
    // Group expenses by Vehicle
    const stats: Record<string, { fuel: number, maintenance: number, total: number }> = {};

    vehicles.forEach(v => {
      stats[v.id] = { fuel: 0, maintenance: 0, total: 0 };
    });

    expenses.forEach(exp => {
      if (exp.vehicle_id && stats[exp.vehicle_id]) {
        if (exp.category === ExpenseCategory.FUEL) stats[exp.vehicle_id].fuel += exp.amount_ht;
        if (exp.category === ExpenseCategory.MAINTENANCE || exp.category === ExpenseCategory.SPARE_PARTS) {
          stats[exp.vehicle_id].maintenance += exp.amount_ht;
        }
        stats[exp.vehicle_id].total += exp.amount_ht;
      }
    });

    return stats;
  }, [expenses, vehicles]);

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
      // Reverse calc: HT = TTC / (1 + Rate)
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

  const handleSave = () => {
    // --- Validation ---
    if (!newExpense.description || newExpense.description.trim() === '') {
      alert("Erreur : Veuillez entrer une description ou le nom du fournisseur.");
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
    
    // Check if expiry date is required and provided
    if (requiresExpiryDate(newExpense.category as ExpenseCategory) && newExpense.vehicle_id && !expiryDate) {
      alert("Erreur : La date d'expiration est obligatoire pour cette catégorie.");
      return;
    }

    // Check if we are updating an existing expense or creating a new one
    const isUpdate = newExpense.id !== undefined;

    const expense: Expense = {
      ...newExpense,
      // If it has an ID, keep it. If not, don't generate a fake one, let DB handle it.
      // But verify if newExpense.id is set from selection.
    } as Expense;

    // Persist via Mutation
    addExpenseMutation.mutate(expense, {
      onSuccess: () => {
        // 2. CoreAccounting: Record transaction (Simplified)
        if (!isUpdate) {
          coreAccounting.recordTransaction(
            'DEPENSE',
            expense.amount_ttc,
            expense.category,
            'DEPENSE',
            expense.id,
            expense.description || 'Dépense Diverse',
            expense.vehicle_id
          );
        }

        // 3. TVAEngine: Log VAT
        if (!isUpdate && expense.is_deductible && expense.tva_amount > 0) {
          tvaEngine.logOperation(
            'DEDUCTIBLE',
            expense.amount_ht,
            expense.tva_rate || 19,
            `DEPENSE - ${expense.id} `,
            new Date(expense.date)
          );
        }

        // 4. Update vehicle expiry dates if applicable
        if (!isUpdate && expiryDate && expense.vehicle_id) {
          const vehicle = vehicles.find(v => v.id === expense.vehicle_id);
          if (vehicle) {
            const updatedVehicle: Vehicle = { ...vehicle };
            
            if (expense.category === ExpenseCategory.INSURANCE) {
              updatedVehicle.insurance_expiry = expiryDate;
            } else if (expense.category === ExpenseCategory.TAXES) {
              updatedVehicle.vignette_expiry = expiryDate;
            } else if (expense.category === ExpenseCategory.MAINTENANCE && 
                       expense.description?.toLowerCase().includes('visite technique')) {
              updatedVehicle.technical_visit_expiry = expiryDate;
            }

            updateVehicleMutation.mutate(updatedVehicle, {
              onSuccess: () => {
                alert(isUpdate ? "Dépense modifiée et dates du véhicule mises à jour !" : "Dépense enregistrée et dates du véhicule mises à jour avec succès !");
              },
              onError: (error: any) => {
                alert((isUpdate ? "Dépense modifiée" : "Dépense enregistrée") + ", mais erreur lors de la mise à jour du véhicule : " + error.message);
              }
            });
          } else {
            alert(isUpdate ? "Dépense modifiée avec succès !" : "Dépense enregistrée avec succès !");
          }
        } else {
          alert(isUpdate ? "Dépense modifiée avec succès !" : "Dépense enregistrée avec succès !");
        }

        setViewMode('journal');

        // Reset form
        setNewExpense({
          date: new Date().toISOString().split('T')[0],
          category: ExpenseCategory.FUEL,
          payment_status: 'Paid',
          is_deductible: true,
          tva_rate: 19,
          amount_ht: 0,
          tva_amount: 0,
          amount_ttc: 0,
          fuel_liters: undefined,
          vehicle_id: userRole === 'CHAUFFEUR' && userVehicleId ? userVehicleId : undefined,
          attachment_url: undefined
        });
        setExpiryDate('');
      },
      onError: (error: any) => {
        console.error("Erreur lors de l'enregistrement:", error);
        alert("Une erreur est survenue lors de l'enregistrement : " + (error.message || "Erreur inconnue"));
      }
    });
  };

  // --- Accounting Entry Preview (Simulated) ---
  const renderAccountingEntry = () => {
    const chargeAccount =
      newExpense.category === ExpenseCategory.FUEL ? '6061 - Carburants' :
        newExpense.category === ExpenseCategory.MAINTENANCE ? '615 - Entretien' :
          newExpense.category === ExpenseCategory.INSURANCE ? '616 - Primes d\'assurance' : '606 - Achats non stockés';

    return (
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm font-mono mt-4">
        <h4 className="text-gray-500 text-xs uppercase mb-2 font-bold tracking-wider">Aperçu Écriture Comptable</h4>
        <div className="flex justify-between border-b border-gray-200 pb-1 mb-1 text-gray-400 text-xs">
          <span>Compte</span>
          <span>Libellé</span>
          <span>Débit</span>
          <span>Crédit</span>
        </div>

        {/* Charge Account */}
        <div className="flex justify-between text-gray-800">
          <span className="w-16">{chargeAccount.split(' ')[0]}</span>
          <span className="flex-1 truncate pr-2">{chargeAccount.split('-')[1]}</span>
          <span className="w-20 text-right">{newExpense.amount_ht?.toFixed(3)}</span>
          <span className="w-20 text-right">-</span>
        </div>

        {/* VAT Account */}
        {newExpense.is_deductible && newExpense.tva_amount! > 0 && (
          <div className="flex justify-between text-gray-800">
            <span className="w-16">4366</span>
            <span className="flex-1 truncate pr-2">État, TVA Récupérable</span>
            <span className="w-20 text-right">{newExpense.tva_amount?.toFixed(3)}</span>
            <span className="w-20 text-right">-</span>
          </div>
        )}

        {/* Supplier/Bank Account */}
        <div className="flex justify-between text-gray-800">
          <span className="w-16">401/532</span>
          <span className="flex-1 truncate pr-2">Fournisseurs / Banque</span>
          <span className="w-20 text-right">-</span>
          <span className="w-20 text-right font-bold">{newExpense.amount_ttc?.toFixed(3)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      {/* Header Stats - HIDDEN FOR CHAUFFEUR to avoid distraction/sensitive info */}
      {userRole !== 'CHAUFFEUR' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Charges (HT)</p>
              <h3 className="text-2xl font-bold text-gray-800">{financials.totalHT.toFixed(3)} <span className="text-sm font-normal text-gray-400">TND</span></h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><DollarSign size={24} /></div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">TVA Récupérable</p>
              <h3 className="text-2xl font-bold text-green-600">{financials.totalTVA.toFixed(3)} <span className="text-sm font-normal text-gray-400">TND</span></h3>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-lg"><PieChart size={24} /></div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Poste Carburant</p>
              <h3 className="text-2xl font-bold text-orange-600">{financials.totalFuel.toFixed(3)} <span className="text-sm font-normal text-gray-400">TND</span></h3>
            </div>
            <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><TrendingUp size={24} /></div>
          </div>
        </div>
      )}

      {/* Navigation Tabs - Hidden for CHAUFFEUR */}
      {userRole !== 'CHAUFFEUR' ? (
        <div className="flex justify-between items-center">
          <div className="bg-gray-200 p-1 rounded-lg inline-flex">
            <button
              onClick={() => setViewMode('journal')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'journal' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
            >
              <FileText size={16} className="inline mr-2" /> Journal des Achats
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'analytics' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
            >
              <Truck size={16} className="inline mr-2" /> Analytique Flotte
            </button>
          </div>
          <button
            onClick={() => {
              setNewExpense({
                date: new Date().toISOString().split('T')[0],
                category: ExpenseCategory.FUEL,
                tva_rate: 19,
                amount_ht: 0,
                amount_ttc: 0,
                is_deductible: true,
                fuel_liters: undefined,
                vehicle_id: userRole === 'CHAUFFEUR' && userVehicleId ? userVehicleId : undefined
              });
              setExpiryDate('');
              setViewMode('form');
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center shadow-sm"
          >
            <Plus size={16} className="mr-2" /> Saisir Dépense
          </button>
        </div>
      ) : (
        // Driver view - Direct access to expense form
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">Déclaration de Dépenses</h3>
              <p className="text-sm text-gray-600">Déclarez vos dépenses liées à votre véhicule</p>
            </div>
            {viewMode !== 'form' && (
              <button
                onClick={() => {
                  setNewExpense({
                    date: new Date().toISOString().split('T')[0],
                    category: ExpenseCategory.FUEL,
                    tva_rate: 19,
                    amount_ht: 0,
                    amount_ttc: 0,
                    is_deductible: true,
                    vehicle_id: userVehicleId
                  });
                  setExpiryDate('');
                  setViewMode('form');
                }}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center shadow-md transition-all"
              >
                <Plus size={18} className="mr-2" /> Déclarer une Dépense
              </button>
            )}
          </div>
        </div>
      )}

      {/* --- JOURNAL VIEW --- (Admin/Manager only) */}
      {viewMode === 'journal' && userRole !== 'CHAUFFEUR' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <MobileTableWrapper
            title="Journal des Dépenses"
            mobileCards={
              <>
                {visibleExpenses.map((exp) => {
                  const vehicle = vehicles.find(v => v.id === exp.vehicle_id);
                  return (
                    <MobileCard key={exp.id}>
                      {/* En-tête */}
                      <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-100">
                        <div className="flex-1">
                          <p className="font-bold text-gray-800 text-base">{exp.description}</p>
                          <p className="text-sm text-gray-500">{new Date(exp.date).toLocaleDateString('fr-FR')}</p>
                          {exp.invoice_ref_supplier && (
                            <p className="text-xs text-gray-400 mt-1">Réf: {exp.invoice_ref_supplier}</p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          exp.category === ExpenseCategory.FUEL ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {exp.category}
                        </span>
                      </div>

                      {/* Affectation */}
                      {vehicle && (
                        <div className="py-2 border-b border-gray-100">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600">Véhicule</span>
                            <div className="flex items-center gap-1 text-blue-600 font-medium">
                              <Truck size={14} />
                              <span>{vehicle.matricule}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Montants */}
                      <MobileCardRow 
                        label="Montant HT" 
                        value={`${exp.amount_ht.toFixed(3)} TND`} 
                      />
                      <MobileCardRow 
                        label="TVA" 
                        value={
                          <span className={exp.is_deductible ? 'text-green-600 font-bold' : 'text-red-400 line-through'}>
                            {exp.tva_amount.toFixed(3)} TND
                          </span>
                        } 
                      />
                      <MobileCardRow 
                        label="Montant TTC" 
                        value={<span className="font-bold text-indigo-600 text-lg">{exp.amount_ttc.toFixed(3)} TND</span>} 
                      />

                      {/* Justificatif */}
                      {exp.attachment_url && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <a 
                            href={exp.attachment_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-50 text-blue-600 rounded-lg font-medium min-h-[48px]"
                          >
                            <FileText size={18} />
                            <span>Voir justificatif</span>
                          </a>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => {
                            setNewExpense(exp);
                            setViewMode('form');
                          }}
                          className="flex-1 py-3 px-4 bg-gray-50 text-gray-700 rounded-lg font-medium min-h-[48px] active:scale-95 transition-transform"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Supprimer cette charge ?')) {
                              deleteExpenseMutation.mutate(exp.id);
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fournisseur / Réf</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Affectation</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Litres</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant (HT)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">TVA</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant (TTC)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visibleExpenses.map((exp) => {
                  const vehicle = vehicles.find(v => v.id === exp.vehicle_id);
                  return (
                    <tr key={exp.id} className="hover:bg-gray-50 group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{exp.description}</div>
                        {exp.invoice_ref_supplier && <div className="text-xs text-gray-400">Réf: {exp.invoice_ref_supplier}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${exp.category === ExpenseCategory.FUEL ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}`}>
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {vehicle ? (
                          <div className="flex items-center text-blue-600">
                            <Truck size={14} className="mr-1" />
                            {vehicle.matricule}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Structure</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {exp.category === ExpenseCategory.FUEL && exp.fuel_liters ? (
                          <span className="text-orange-600 font-medium">{exp.fuel_liters.toFixed(2)} L</span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {exp.amount_ht.toFixed(3)}
                        {exp.attachment_url && (
                          <a href={exp.attachment_url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-block text-blue-500 hover:text-blue-700" title="Voir justificatif">
                            <FileText size={14} />
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <div className={exp.is_deductible ? 'text-green-600' : 'text-red-400 line-through'}>
                          {exp.tva_amount.toFixed(3)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">{exp.amount_ttc.toFixed(3)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => {
                              setNewExpense(exp);
                              setViewMode('form');
                            }}
                            className="text-gray-400 hover:text-[#007BFF] transition-colors p-1 rounded-full hover:bg-blue-50"
                            title="Modifier"
                          >
                            <div className="w-5 h-5 flex items-center justify-center">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="feather feather-edit-2"
                              >
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                              </svg>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Êtes-vous sûr de vouloir supprimer cette charge ?')) {
                                deleteExpenseMutation.mutate(exp.id, {
                                  onSuccess: () => {
                                    alert('Charge supprimée avec succès !');
                                  },
                                  onError: (error: any) => {
                                    alert('Erreur lors de la suppression : ' + (error.message || 'Inconnue'));
                                  }
                                });
                              }
                            }}
                            className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded-full hover:bg-red-50"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
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
      )}

      {/* --- ANALYTICS VIEW --- (Admin/Manager only) */}
      {viewMode === 'analytics' && userRole !== 'CHAUFFEUR' && (
        <div className="grid grid-cols-1 gap-6">
          {vehicles.map(vehicle => {
            const stat = fleetAnalytics[vehicle.id] || { fuel: 0, maintenance: 0, total: 0 };
            const simulatedKm = 4500; // Mock data for demo
            const cpkm = simulatedKm > 0 ? (stat.total / simulatedKm).toFixed(3) : 'N/A';

            return (
              <div key={vehicle.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-4">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                      <Truck size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{vehicle.matricule}</h3>
                      <p className="text-sm text-gray-500">{vehicle.brand} {vehicle.model}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Coût Kilométrique</div>
                    <div className="text-xl font-bold text-indigo-600">{cpkm} <span className="text-xs text-gray-400">TND/km</span></div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-xs font-semibold text-orange-700 uppercase">Carburant</p>
                    <p className="text-lg font-bold text-orange-900 mt-1">{stat.fuel.toFixed(3)}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-xs font-semibold text-blue-700 uppercase">Entretien & Pièces</p>
                    <p className="text-lg font-bold text-blue-900 mt-1">{stat.maintenance.toFixed(3)}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs font-semibold text-gray-700 uppercase">Total Coûts</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{stat.total.toFixed(3)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- DRIVER INFO MESSAGE (when not in form mode) --- */}
      {userRole === 'CHAUFFEUR' && viewMode !== 'form' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <Receipt size={32} className="text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Déclaration de Dépenses</h3>
          <p className="text-gray-600 mb-6">
            Cliquez sur le bouton ci-dessus pour déclarer vos dépenses liées à votre véhicule.
          </p>
          <div className="bg-blue-50 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-gray-700">
              <strong>Catégories autorisées :</strong><br />
              Carburant • Entretien • Pièces de rechange • Péage • Assurance • Taxes & Vignettes
            </p>
          </div>
        </div>
      )}

      {/* --- ADD EXPENSE FORM --- */}
      {viewMode === 'form' && (
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">Nouvelle Dépense</h3>
            <button onClick={() => setViewMode('journal')} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
          </div>

          <div className="space-y-6">
            {/* Row 1 */}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Réf. Pièce (Facture)</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md p-2"
                  placeholder="ex: FC-9882"
                  value={newExpense.invoice_ref_supplier || ''}
                  onChange={e => setNewExpense({ ...newExpense, invoice_ref_supplier: e.target.value })}
                />
              </div>
            </div>

            {/* Row 2 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur & Libellé</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md p-2"
                placeholder="ex: Kiosque Shell Rades - Plein gasoil"
                value={newExpense.description || ''}
                onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
              />
            </div>

            {/* Row 3: Categorization */}
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Matricule (Véhicule concerné)</label>
                {userRole === 'CHAUFFEUR' && userVehicleId ? (
                  <div className="w-full bg-gray-100 border border-gray-300 text-gray-700 rounded-md p-2.5 text-sm font-medium">
                    {vehicles.find(v => v.id === userVehicleId)?.matricule || 'Véhicule assigné'}
                    {' - '}
                    {vehicles.find(v => v.id === userVehicleId)?.brand || ''}
                  </div>
                ) : (
                  <select
                    className="w-full border border-gray-300 rounded-md p-2 bg-white"
                    value={newExpense.vehicle_id || ''}
                    onChange={e => setNewExpense({ ...newExpense, vehicle_id: e.target.value || undefined })}
                  >
                    <option value="">-- Sélectionner un Matricule --</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.matricule} - {v.brand}</option>
                    ))}
                  </select>
                )}
                {!userRole || userRole !== 'CHAUFFEUR' && newExpense.vehicle_id && (
                  <div className="mt-2 text-xs text-blue-600 flex items-center bg-blue-50 p-2 rounded">
                    <span className="font-bold mr-1">Destinataire:</span>
                    {getBeneficiaryInfo(newExpense.vehicle_id!, vehicles)?.name}
                    <span className="text-gray-400 ml-1">({getBeneficiaryInfo(newExpense.vehicle_id!, vehicles)?.type})</span>
                  </div>
                )}
              </div>
            </div>

            {/* Row 4: Amounts */}
            <div className="grid grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant (HT)</label>
                <input
                  type="number"
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
                  onChange={e => handleCalculateTax(newExpense.amount_ht || 0, 'ht')} // Re-trigger calc needs better logic, simplified here
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
                  className="w-full border border-gray-300 rounded-md p-2 font-bold"
                  value={newExpense.amount_ttc}
                  onChange={e => handleCalculateTax(Number(e.target.value), 'ttc')}
                />
              </div>
            </div>

            {/* Fuel Liters Field (Conditional - only for FUEL category) */}
            {newExpense.category === ExpenseCategory.FUEL && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-orange-800 mb-2">
                  ⛽ Quantité de Carburant (Litres)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border border-orange-300 rounded-md p-2 bg-white"
                  placeholder="ex: 50.5"
                  value={newExpense.fuel_liters || ''}
                  onChange={e => setNewExpense({ ...newExpense, fuel_liters: e.target.value ? Number(e.target.value) : undefined })}
                />
                <p className="text-xs text-orange-700 mt-1">
                  Indiquez le nombre de litres pour suivre la consommation de carburant. Utile si vous avez un abonnement station-service.
                </p>
              </div>
            )}

            {/* Expiry Date Field (Conditional) */}
            {requiresExpiryDate(newExpense.category as ExpenseCategory) && newExpense.vehicle_id && (
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
                  Cette date sera automatiquement enregistrée dans le Parc Roulant pour le véhicule sélectionné.
                </p>
              </div>
            )}

            {/* Deductibility Toggle */}
            <div className="flex items-start space-x-3 bg-blue-50 p-3 rounded-md">
              <input
                type="checkbox"
                id="deductible"
                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded"
                checked={newExpense.is_deductible}
                onChange={e => setNewExpense({ ...newExpense, is_deductible: e.target.checked })}
              />
              <label htmlFor="deductible" className="text-sm text-gray-700">
                <span className="font-medium block text-gray-900">TVA Déductible / Récupérable</span>
                <span className="text-xs text-gray-500">
                  Décocher pour les dépenses non admises fiscalement (ex: carburant voiture de tourisme).
                </span>
              </label>
            </div>

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
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                        >
                          <span>Téléverser un fichier</span>
                          <input
                            id="file-upload"
                            name="file-upload"
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

            {renderAccountingEntry()}

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                onClick={() => setViewMode('journal')}
                className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                disabled={addExpenseMutation.isPending}
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={addExpenseMutation.isPending}
                className={`bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm ${addExpenseMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {addExpenseMutation.isPending ? 'Enregistrement...' : 'Enregistrer la Dépense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
