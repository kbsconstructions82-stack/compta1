import React, { useState, useMemo } from 'react';
import { Invoice, Expense, Vehicle, DriverState, TripRate, InvoiceStatus } from '../types';
import { generatePnL, generateKPIs } from '../utils/analytics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Printer, Download, FileText, ToggleLeft, ToggleRight } from 'lucide-react';

import { useInvoices } from '../src/hooks/useInvoices';
import { useExpenses } from '../src/hooks/useExpenses';
import { useVehicles } from '../src/hooks/useVehicles';
import { useEmployees } from '../src/hooks/useEmployees';
import { useTripRates } from '../src/hooks/useTripRates';
import { useActivity } from '../src/hooks/useActivity';

export const Reporting: React.FC = () => {
    const [activeReport, setActiveReport] = useState<'pnl' | 'kpi' | 'tax'>('pnl');
    const [useTTC, setUseTTC] = useState<boolean>(true);

    // Hooks
    const { data: invoices = [] } = useInvoices();
    const { data: expenses = [] } = useExpenses();
    const { data: vehicles = [] } = useVehicles();
    const { data: employees = [] } = useEmployees();
    const { data: tripRates = [] } = useTripRates();
    const { data: monthlyActivity = {} } = useActivity();

    // Pass real payroll data and TTC flag
    const pnl = generatePnL(invoices, expenses, employees, tripRates, monthlyActivity, useTTC);
    const kpis = generateKPIs(invoices, expenses, vehicles);

    // Data for charts
    const expenseDistribution = [
        { name: 'Achats Consommés (Carburant)', value: pnl.directCosts, color: '#f97316' },
        { name: 'Services Ext. (Entretien)', value: pnl.externalServices, color: '#3b82f6' },
        { name: 'Personnel', value: pnl.personnelCosts, color: '#10b981' },
        { name: 'Taxes', value: pnl.taxes, color: '#ef4444' },
    ];

    const formatCurrency = (val: number) => `${val.toFixed(3)} TND`;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Rapports & Décisionnel</h2>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setUseTTC(!useTTC)}
                        className={`flex items-center space-x-2 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 ${useTTC ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-300 text-gray-700'}`}
                    >
                        {useTTC ? <ToggleRight className="text-indigo-600" size={16} /> : <ToggleLeft className="text-gray-400" size={16} />}
                        <span>{useTTC ? 'Affichage TTC' : 'Affichage HT'}</span>
                    </button>
                    <button className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                        <Download size={16} /> <span>Excel</span>
                    </button>
                    <button className="flex items-center space-x-2 px-3 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900">
                        <Printer size={16} /> <span>Imprimer</span>
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveReport('pnl')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeReport === 'pnl' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        État de Résultat (P&L)
                    </button>
                    <button
                        onClick={() => setActiveReport('kpi')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeReport === 'kpi' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Indicateurs (KPI)
                    </button>
                    <button
                        onClick={() => setActiveReport('tax')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeReport === 'tax' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Situation Fiscale
                    </button>
                </nav>
            </div>

            {/* Content */}
            <div className="min-h-[500px]">
                {activeReport === 'pnl' && (
                    <div className="space-y-6">
                        {/* P&L Statement */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
                                <h3 className="text-xl font-bold">État de Résultat (Compte de Résultat)</h3>
                                <p className="text-sm opacity-90 mt-1">Période: {pnl.period} • Mode: {useTTC ? 'TTC' : 'HT'}</p>
                            </div>
                            
                            <div className="p-6 space-y-4">
                                {/* Revenue */}
                                <div className="border-b border-gray-200 pb-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm text-gray-500 uppercase tracking-wide">Chiffre d'Affaires (Classe 7)</p>
                                            <p className="text-xs text-gray-400 mt-1">{invoices.filter(i => i.status !== InvoiceStatus.DRAFT && i.status !== InvoiceStatus.CANCELLED).length} factures validées</p>
                                        </div>
                                        <span className="text-2xl font-bold text-green-600">{formatCurrency(pnl.turnover)}</span>
                                    </div>
                                </div>

                                {/* Operating Expenses */}
                                <div className="space-y-3">
                                    <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Charges d'Exploitation (Classe 6)</p>
                                    
                                    <div className="flex justify-between items-center pl-4 py-2 bg-gray-50 rounded">
                                        <div>
                                            <p className="text-sm text-gray-600">Achats Consommés (60)</p>
                                            <p className="text-xs text-gray-400">Carburant, Pièces</p>
                                        </div>
                                        <span className="font-mono text-gray-800">{formatCurrency(pnl.directCosts)}</span>
                                    </div>

                                    <div className="flex justify-between items-center pl-4 py-2 bg-gray-50 rounded">
                                        <div>
                                            <p className="text-sm text-gray-600">Services Extérieurs (61/62)</p>
                                            <p className="text-xs text-gray-400">Entretien, Assurance, Bureaux</p>
                                        </div>
                                        <span className="font-mono text-gray-800">{formatCurrency(pnl.externalServices)}</span>
                                    </div>

                                    <div className="flex justify-between items-center pl-4 py-2 bg-gray-50 rounded">
                                        <div>
                                            <p className="text-sm text-gray-600">Charges de Personnel (64)</p>
                                            <p className="text-xs text-gray-400">{employees.length} employé{employees.length > 1 ? 's' : ''}</p>
                                        </div>
                                        <span className="font-mono text-gray-800">{formatCurrency(pnl.personnelCosts)}</span>
                                    </div>

                                    <div className="flex justify-between items-center pl-4 py-2 bg-gray-50 rounded">
                                        <div>
                                            <p className="text-sm text-gray-600">Impôts et Taxes (66)</p>
                                            <p className="text-xs text-gray-400">Taxes, Vignettes</p>
                                        </div>
                                        <span className="font-mono text-gray-800">{formatCurrency(pnl.taxes)}</span>
                                    </div>
                                </div>

                                {/* Total Expenses */}
                                <div className="flex justify-between items-center pt-3 border-t border-gray-300">
                                    <p className="text-sm font-bold text-gray-700">TOTAL CHARGES</p>
                                    <span className="text-lg font-bold text-red-600">{formatCurrency(pnl.directCosts + pnl.externalServices + pnl.personnelCosts + pnl.taxes)}</span>
                                </div>

                                {/* EBITDA */}
                                <div className={`flex justify-between items-center p-4 rounded-xl ${pnl.ebitda >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                    <div>
                                        <p className="text-sm font-bold uppercase tracking-wide text-gray-700">Résultat d'Exploitation (EBITDA)</p>
                                        <p className="text-xs text-gray-500 mt-1">Chiffre d'Affaires - Charges d'Exploitation</p>
                                    </div>
                                    <span className={`text-3xl font-extrabold ${pnl.ebitda >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                        {formatCurrency(pnl.ebitda)}
                                    </span>
                                </div>

                                {/* Margin Percentage */}
                                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm font-medium text-indigo-900">Marge d'Exploitation</p>
                                        <span className="text-xl font-bold text-indigo-700">
                                            {pnl.turnover > 0 ? ((pnl.ebitda / pnl.turnover) * 100).toFixed(2) : '0.00'}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Expense Distribution Chart */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                            <h3 className="font-bold text-gray-800 mb-4">Répartition des Charges</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    {expenseDistribution.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center">
                                                <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }}></div>
                                                <span className="ml-3 text-sm text-gray-700">{item.name}</span>
                                            </div>
                                            <span className="font-bold text-gray-900">{formatCurrency(item.value)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center justify-center">
                                    <div className="text-center text-gray-400 text-sm">
                                        <FileText size={48} className="mx-auto mb-2 opacity-20" />
                                        <p>Graphique disponible prochainement</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeReport === 'kpi' && (
                    <div className="space-y-6">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                                <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">Kilomètres Totaux</p>
                                <p className="text-3xl font-bold text-gray-900">{kpis.totalKm.toLocaleString()}</p>
                                <p className="text-xs text-gray-400 mt-1">Estimé mensuel</p>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                                <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">Coût par KM</p>
                                <p className="text-3xl font-bold text-orange-600">{kpis.costPerKm.toFixed(3)}</p>
                                <p className="text-xs text-gray-400 mt-1">TND / km</p>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                                <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">Revenu par KM</p>
                                <p className="text-3xl font-bold text-green-600">{kpis.revenuePerKm.toFixed(3)}</p>
                                <p className="text-xs text-gray-400 mt-1">TND / km</p>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                                <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">Marge par KM</p>
                                <p className="text-3xl font-bold text-indigo-600">{(kpis.revenuePerKm - kpis.costPerKm).toFixed(3)}</p>
                                <p className="text-xs text-gray-400 mt-1">TND / km</p>
                            </div>
                        </div>

                        {/* Cost Breakdown */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                            <h3 className="font-bold text-gray-800 mb-4">Répartition des Coûts</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
                                    <span className="text-sm text-gray-700">Part Carburant</span>
                                    <span className="font-bold text-orange-700">{kpis.fuelPercentage.toFixed(1)}%</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <span className="text-sm text-gray-700">Part Entretien</span>
                                    <span className="font-bold text-blue-700">{kpis.maintenancePercentage.toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Performance Summary */}
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                            <h3 className="text-lg font-bold mb-4">Analyse de Performance</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-sm opacity-80">Flotte Active</p>
                                    <p className="text-2xl font-bold">{vehicles.length} véhicules</p>
                                </div>
                                <div>
                                    <p className="text-sm opacity-80">Factures du Mois</p>
                                    <p className="text-2xl font-bold">{invoices.length}</p>
                                </div>
                                <div>
                                    <p className="text-sm opacity-80">Charges du Mois</p>
                                    <p className="text-2xl font-bold">{expenses.length}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeReport === 'tax' && (
                    <div className="space-y-6">
                        {/* Tax Summary */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 text-white">
                                <h3 className="text-xl font-bold">Situation Fiscale Globale</h3>
                                <p className="text-sm opacity-90 mt-1">Vue d'ensemble des obligations fiscales</p>
                            </div>
                            
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {/* TVA */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                        <p className="text-xs text-blue-600 uppercase font-bold mb-2">TVA (Mensuelle)</p>
                                        <p className="text-2xl font-bold text-blue-900">À déclarer</p>
                                        <p className="text-xs text-gray-500 mt-2">Échéance: 28 de chaque mois</p>
                                    </div>

                                    {/* Retenue Source */}
                                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                                        <p className="text-xs text-purple-600 uppercase font-bold mb-2">Retenue à la Source</p>
                                        <p className="text-2xl font-bold text-purple-900">{employees.length} employés</p>
                                        <p className="text-xs text-gray-500 mt-2">Échéance: 15 de chaque mois</p>
                                    </div>

                                    {/* CNSS */}
                                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                        <p className="text-xs text-green-600 uppercase font-bold mb-2">CNSS (Trimestrielle)</p>
                                        <p className="text-2xl font-bold text-green-900">{employees.length} déclarants</p>
                                        <p className="text-xs text-gray-500 mt-2">Échéance: Fin de trimestre</p>
                                    </div>
                                </div>

                                {/* États Annuels */}
                                <div className="border-t border-gray-200 pt-4 mt-4">
                                    <p className="text-sm font-bold text-gray-700 mb-3">Déclarations Annuelles</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <span className="text-sm text-gray-700">État 930 (Clients)</span>
                                            <span className="text-sm font-bold text-gray-900">{invoices.filter(i => i.status !== InvoiceStatus.DRAFT && i.status !== InvoiceStatus.CANCELLED).length} factures</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <span className="text-sm text-gray-700">État 940 (Fournisseurs)</span>
                                            <span className="text-sm font-bold text-gray-900">{expenses.length} dépenses</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Impôt Sociétés */}
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                    <p className="text-sm font-bold text-red-900 mb-2">Impôt sur les Sociétés (IS)</p>
                                    <p className="text-sm text-gray-600">Déclaration annuelle • Échéance: 25 Mars N+1</p>
                                    <p className="text-xs text-gray-500 mt-2">Base: Résultat comptable + Réintégrations</p>
                                </div>

                                {/* Reminder */}
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                                    <FileText className="text-yellow-600 mt-0.5" size={20} />
                                    <div>
                                        <p className="text-sm font-bold text-yellow-900">Rappel Important</p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            Toutes les déclarations fiscales doivent être effectuées via le portail de la DGCF. 
                                            Conservez les justificatifs pour au moins 10 ans.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                            <h3 className="font-bold text-gray-800 mb-4">Accès Rapide</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <button className="flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors">
                                    <span className="text-sm font-medium text-blue-900">Déclaration TVA</span>
                                    <span className="text-blue-600">→</span>
                                </button>
                                <button className="flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors">
                                    <span className="text-sm font-medium text-purple-900">Retenue à la Source</span>
                                    <span className="text-purple-600">→</span>
                                </button>
                                <button className="flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors">
                                    <span className="text-sm font-medium text-green-900">Déclaration CNSS</span>
                                    <span className="text-green-600">→</span>
                                </button>
                                <button className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                                    <span className="text-sm font-medium text-gray-900">États 930/940</span>
                                    <span className="text-gray-600">→</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
