
import React, { useState, useEffect } from 'react';
import { Invoice, Expense, AccountingEntry, InvoiceStatus } from '../types';
import { calculateMonthlyFinancials } from '../utils/taxUtils';
import { runAccountingEngine, simulateVAT, VatSimulationResult } from '../services/accountingEngine';
import { useDatabase } from '../contexts/DatabaseContext';
import {
    generateTVADeclaration,
    generateRSDeclaration,
    generateCNSSDeclaration,
    generateISDeclaration,
    generateEtatClient,
    generateEtatFournisseur
} from '../services/fiscalMappingService';
import { BookOpen, PieChart, RefreshCw, FileText, Download, Calendar, Calculator, AlertTriangle, ArrowRight, Table, Landmark, Users, TrendingUp, TrendingDown, Search, ArrowDownRight, ArrowUpRight, Database } from 'lucide-react';

import { useInvoices } from '../src/hooks/useInvoices';
import { useExpenses } from '../src/hooks/useExpenses';
import { useEmployees } from '../src/hooks/useEmployees';

export const Accounting: React.FC = () => {
    const { data: invoices = [] } = useInvoices();
    const { data: expenses = [] } = useExpenses();
    const { coreAccounting, tvaEngine, refreshData, transactions, tvaJournal } = useDatabase();
    const [activeTab, setActiveTab] = useState<'declarations' | 'journal' | 'financial_engine'>('financial_engine');
    const [entries, setEntries] = useState<AccountingEntry[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [fiscalSubTab, setFiscalSubTab] = useState<'tva' | 'rs' | 'cnss' | 'is' | 'etat' | 'suivi_tva'>('tva');

    // Initial Financials for Dashboard View
    const financials = calculateMonthlyFinancials(invoices, expenses);

    // Auto-generate accounting entries whenever invoices or expenses change
    useEffect(() => {
        // Auto-generate entries from real data
        const generatedEntries = runAccountingEngine(invoices, expenses);
        setEntries(generatedEntries);
        
        // Refresh singleton data (transactions and TVA journal that were already recorded)
        refreshData();
    }, [invoices, expenses]); // Re-run when data changes

    const handleRunEngine = () => {
        setIsGenerating(true);
        refreshData(); // Refresh data from singletons
        setTimeout(() => {
            const generatedEntries = runAccountingEngine(invoices, expenses);
            setEntries(generatedEntries);
            setIsGenerating(false);
        }, 800);
    };

    // --- Real-Time Financial Engine View ---
    const FinancialEngineView = () => {
        // Calculate real-time stats from invoices and expenses
        const totalRevenue = invoices
            .filter(inv => inv.status === InvoiceStatus.PAID)
            .reduce((sum, inv) => sum + inv.net_to_pay, 0);
        
        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount_ttc, 0);
        
        const tvaCollectee = invoices
            .filter(inv => inv.status !== InvoiceStatus.DRAFT)
            .reduce((sum, inv) => sum + inv.tva_amount, 0);
        
        const tvaDeductible = expenses
            .filter(exp => exp.is_deductible)
            .reduce((sum, exp) => sum + exp.tva_amount, 0);
        
        const netVAT = tvaCollectee - tvaDeductible;
        
        return (
            <div className="space-y-6">
                {/* Info Banner */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-4">
                    <div className="flex items-start">
                        <div className="bg-indigo-600 p-2 rounded-lg text-white mr-3">
                            <Database size={20} />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-gray-800 mb-1">Moteur Comptable en Temps Réel</h4>
                            <p className="text-sm text-gray-600">
                                Les données ci-dessous sont automatiquement calculées à partir de vos <strong className="text-blue-600">{invoices.length} factures</strong> et <strong className="text-orange-600">{expenses.length} charges</strong>.
                                Chaque enregistrement met à jour instantanément les indicateurs financiers.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Real-time Financial Indicators */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-xs text-gray-500 font-medium">Recettes</div>
                            <TrendingUp className="text-green-500" size={16} />
                        </div>
                        <div className="text-2xl font-bold text-green-600">{totalRevenue.toFixed(3)}</div>
                        <div className="text-xs text-gray-400 mt-1">TND</div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-xs text-gray-500 font-medium">Dépenses</div>
                            <TrendingDown className="text-red-500" size={16} />
                        </div>
                        <div className="text-2xl font-bold text-red-600">{totalExpenses.toFixed(3)}</div>
                        <div className="text-xs text-gray-400 mt-1">TND</div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-xs text-gray-500 font-medium">TVA Collectée</div>
                            <ArrowUpRight className="text-blue-500" size={16} />
                        </div>
                        <div className="text-2xl font-bold text-blue-600">{tvaCollectee.toFixed(3)}</div>
                        <div className="text-xs text-gray-400 mt-1">TND</div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-xs text-gray-500 font-medium">TVA Déductible</div>
                            <ArrowDownRight className="text-green-500" size={16} />
                        </div>
                        <div className="text-2xl font-bold text-green-600">{tvaDeductible.toFixed(3)}</div>
                        <div className="text-xs text-gray-400 mt-1">TND</div>
                    </div>
                </div>

                {/* Net VAT Summary */}
                <div className="bg-white p-6 rounded-xl border-2 border-indigo-200 shadow-sm">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-1">TVA Net à Payer / Crédit</h3>
                            <p className="text-xs text-gray-400">TVA Collectée - TVA Déductible</p>
                        </div>
                        <div className="text-right">
                            <div className={`text-3xl font-bold ${netVAT > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {netVAT > 0 ? '+' : ''}{netVAT.toFixed(3)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {netVAT > 0 ? 'À payer' : 'Crédit TVA'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Central Ledger (Transactions) */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-800 flex items-center">
                                <Database className="mr-2 text-indigo-600" />
                                Grand Livre Financier (CoreAccounting)
                            </h3>
                            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full font-bold">
                                {transactions.length} Transactions
                            </span>
                        </div>

                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                            <table className="min-w-full text-xs">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Type</th>
                                        <th className="px-3 py-2 text-left">Description</th>
                                        <th className="px-3 py-2 text-right">Montant</th>
                                        <th className="px-3 py-2 text-left pl-4">Réf</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {transactions.length === 0 ? (
                                        <tr><td colSpan={4} className="p-4 text-center text-gray-400">Aucune transaction enregistrée.</td></tr>
                                    ) : (
                                        transactions.map(t => (
                                            <tr key={t.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-2">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.type === 'RECETTE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {t.type}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-gray-800">{t.description}</td>
                                                <td className={`px-3 py-2 text-right font-mono font-bold ${t.type === 'RECETTE' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {t.type === 'RECETTE' ? '+' : '-'}{t.amount.toFixed(3)}
                                                </td>
                                                <td className="px-3 py-2 pl-4 text-gray-500">{t.referenceType}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* VAT Journal (TVAEngine) */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-800 flex items-center">
                                <FileText className="mr-2 text-blue-600" />
                                Journal TVA (TVAEngine)
                            </h3>
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-bold">
                                {tvaJournal?.length || 0} Opérations
                            </span>
                        </div>

                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                            <table className="min-w-full text-xs">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Type</th>
                                        <th className="px-3 py-2 text-right">Base HT</th>
                                        <th className="px-3 py-2 text-right">Taux</th>
                                        <th className="px-3 py-2 text-right">TVA</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(!tvaJournal || tvaJournal.length === 0) ? (
                                        <tr><td colSpan={4} className="p-4 text-center text-gray-400">Aucune opération TVA.</td></tr>
                                    ) : (
                                        tvaJournal.map(e => (
                                            <tr key={e.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-2">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${e.type === 'COLLECTEE' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                        {e.type === 'COLLECTEE' ? 'VENTE' : 'ACHAT'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-right text-gray-600">{e.baseAmount.toFixed(3)}</td>
                                                <td className="px-3 py-2 text-right text-gray-500">{e.rate}%</td>
                                                <td className="px-3 py-2 text-right font-bold text-gray-800">{e.taxAmount.toFixed(3)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- Declaration Views ---

    const TVAPanel = () => {
        // Logic from fiscalMappingService
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const tvaData = generateTVADeclaration(entries, currentMonth, 0);

        if (entries.length === 0) {
            return (
                <div className="text-center p-12 bg-white rounded-xl border border-gray-200">
                    <div className="flex flex-col items-center">
                        <div className="bg-blue-100 p-4 rounded-full mb-4">
                            <FileText size={32} className="text-blue-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Aucune donnée comptable disponible</h3>
                        <p className="text-gray-500 mb-4">
                            Les déclarations TVA se génèrent automatiquement à partir de vos factures et charges.
                        </p>
                        <div className="text-sm text-gray-400 bg-gray-50 p-4 rounded-lg">
                            💡 Ajoutez des factures dans l'onglet "Factures" et des charges dans "Charges" pour voir les déclarations ici.
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-800 flex items-center"><FileText className="mr-2 text-blue-600" /> Déclaration Mensuelle TVA</h3>
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold">Période: {tvaData.period}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <h4 className="text-sm font-bold text-gray-500 uppercase mb-3">TVA Collectée (Ventes)</h4>
                            <div className="flex justify-between p-2 bg-gray-50 rounded">
                                <span>Base Imposable (701)</span>
                                <span className="font-mono">{tvaData.sales.base_ht.toFixed(3)}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-blue-50 rounded mt-2 border border-blue-100">
                                <span className="font-bold text-blue-800">TVA Due (44571)</span>
                                <span className="font-mono font-bold text-blue-800">{tvaData.sales.vat_collected.toFixed(3)}</span>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-500 uppercase mb-3">TVA Déductible (Achats)</h4>
                            <div className="flex justify-between p-2 bg-gray-50 rounded">
                                <span>Base Achats Taxables</span>
                                <span className="font-mono">{tvaData.purchases.base_ht.toFixed(3)}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-green-50 rounded mt-2 border border-green-100">
                                <span className="font-bold text-green-800">TVA Récupérable (44566)</span>
                                <span className="font-mono font-bold text-green-800">{tvaData.purchases.vat_deductible.toFixed(3)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
                        <div className="text-right">
                            <p className="text-sm text-gray-500 mb-1">Net à Payer / Crédit</p>
                            <p className={`text-3xl font-bold ${tvaData.vat_payable > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {tvaData.vat_payable > 0 ? tvaData.vat_payable.toFixed(3) : `(Crédit) ${tvaData.vat_credit.toFixed(3)}`} TND
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const SuiviTVAPanel = () => {
        const { tvaJournal } = useDatabase(); // Use direct source of truth
        const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

        // Filter by month
        const filteredEntries = tvaJournal.filter(e => e.period === selectedMonth);

        const collectedEntries = filteredEntries.filter(e => e.type === 'COLLECTEE');
        const deductibleEntries = filteredEntries.filter(e => e.type === 'DEDUCTIBLE');

        const totalCollected = collectedEntries.reduce((sum, e) => sum + e.taxAmount, 0);
        const totalDeductible = deductibleEntries.reduce((sum, e) => sum + e.taxAmount, 0);
        const netVat = totalCollected - totalDeductible;

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Header with Month Selector */}
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center">
                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 mr-3">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">Période de Suivi</h3>
                            <p className="text-xs text-gray-500">Sélectionnez le mois à analyser</p>
                        </div>
                    </div>
                    <div>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="border border-gray-300 rounded-lg px-4 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>

                {filteredEntries.length === 0 && (
                    <div className="bg-gray-50 border border-gray-200 text-gray-600 px-4 py-8 rounded-xl flex flex-col items-center justify-center text-sm shadow-sm text-center">
                        <div className="bg-gray-200 p-3 rounded-full mb-3">
                            <Database size={24} className="text-gray-500" />
                        </div>
                        <p className="font-bold text-lg text-gray-800">Aucune donnée pour cette période</p>
                        <p className="max-w-md mt-1">
                            Aucune opération de TVA (Facture ou Dépense) n'a été enregistrée pour {selectedMonth}.
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* TVA Collectée (Output) */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden group hover:border-blue-300 transition-colors">
                        <div className="bg-blue-50 p-4 border-b border-blue-100 flex justify-between items-center group-hover:bg-blue-100 transition-colors">
                            <div className="flex items-center text-blue-800">
                                <div className="p-2 bg-white rounded-lg mr-3 shadow-sm text-blue-600">
                                    <ArrowUpRight size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">TVA Collectée (Sortie)</h3>
                                    <p className="text-xs text-blue-600 opacity-80">Sur Factures de Vente</p>
                                </div>
                            </div>
                            <span className="text-xl font-bold text-blue-700">{totalCollected.toFixed(3)} <span className="text-xs">TND</span></span>
                        </div>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                            {collectedEntries.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 text-sm">
                                    Aucune écriture pour ce mois.
                                </div>
                            ) : (
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Réf Source</th>
                                            <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">Base HT</th>
                                            <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">TVA</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {collectedEntries.map((e, i) => (
                                            <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                                                <td className="px-4 py-2 text-gray-500 text-xs">{new Date(e.date).toLocaleDateString()}</td>
                                                <td className="px-4 py-2 text-gray-800 font-medium truncate max-w-[200px]" title={e.referenceSource}>{e.referenceSource}</td>
                                                <td className="px-4 py-2 text-right text-gray-500 font-mono">{e.baseAmount.toFixed(3)}</td>
                                                <td className="px-4 py-2 text-right font-mono text-blue-600 font-bold">{e.taxAmount.toFixed(3)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* TVA Déductible (Input) */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden group hover:border-green-300 transition-colors">
                        <div className="bg-green-50 p-4 border-b border-green-100 flex justify-between items-center group-hover:bg-green-100 transition-colors">
                            <div className="flex items-center text-green-800">
                                <div className="p-2 bg-white rounded-lg mr-3 shadow-sm text-green-600">
                                    <ArrowDownRight size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">TVA Déductible (Entrée)</h3>
                                    <p className="text-xs text-green-600 opacity-80">Sur Achats & Dépenses</p>
                                </div>
                            </div>
                            <span className="text-xl font-bold text-green-700">{totalDeductible.toFixed(3)} <span className="text-xs">TND</span></span>
                        </div>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                            {deductibleEntries.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 text-sm">
                                    Aucune écriture pour ce mois.
                                </div>
                            ) : (
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Réf Source</th>
                                            <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">Base HT</th>
                                            <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">TVA</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {deductibleEntries.map((e, i) => (
                                            <tr key={i} className="hover:bg-green-50/50 transition-colors">
                                                <td className="px-4 py-2 text-gray-500 text-xs">{new Date(e.date).toLocaleDateString()}</td>
                                                <td className="px-4 py-2 text-gray-800 font-medium truncate max-w-[200px]" title={e.referenceSource}>{e.referenceSource}</td>
                                                <td className="px-4 py-2 text-right text-gray-500 font-mono">{e.baseAmount.toFixed(3)}</td>
                                                <td className="px-4 py-2 text-right font-mono text-green-600 font-bold">{e.taxAmount.toFixed(3)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                {/* Total Card */}
                <div className="bg-gray-900 rounded-xl shadow-2xl p-6 text-white relative overflow-hidden transform transition-all hover:scale-[1.01]">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <Calculator size={150} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-300 uppercase tracking-widest mb-6 border-b border-gray-700 pb-2">Situation Nette TVA ({selectedMonth})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                        <div>
                            <p className="text-xs text-gray-400 uppercase mb-1">Total Collectée</p>
                            <p className="text-2xl font-mono text-blue-400 font-bold tracking-tight">+ {totalCollected.toFixed(3)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase mb-1">Total Déductible</p>
                            <p className="text-2xl font-mono text-green-400 font-bold tracking-tight">- {totalDeductible.toFixed(3)}</p>
                        </div>
                        <div className={`p-4 rounded-xl backdrop-blur-sm border ${netVat > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                            <p className="text-xs text-white uppercase font-bold mb-1">
                                {netVat > 0 ? "NET À PAYER (TVA DUE)" : "CRÉDIT TVA À REPORTER"}
                            </p>
                            <p className={`text-4xl font-extrabold font-mono ${netVat > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {Math.abs(netVat).toFixed(3)} <span className="text-sm font-sans font-normal opacity-70">TND</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const RSPanel = () => {
        const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
        const { data: employees = [] } = useEmployees();
        const rsData = generateRSDeclaration(expenses, selectedMonth, employees);

        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
                    <div className="flex items-center gap-3">
                        <h3 className="font-bold text-gray-800 flex items-center"><Landmark className="mr-2 text-purple-600" /> Retenue à la Source</h3>
                        <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-bold">
                            {employees.length} employé{employees.length > 1 ? 's' : ''}
                        </span>
                    </div>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="border border-gray-300 rounded-lg px-4 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                </div>
                {employees.length === 0 && (
                    <div className="bg-purple-50 border border-purple-200 text-purple-700 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
                        <AlertTriangle size={18} />
                        <p>Aucun employé enregistré. Les calculs utilisent des données simulées. Ajoutez des employés dans l'onglet "Paie & RH".</p>
                    </div>
                )}
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left">Type</th>
                                <th className="px-4 py-2 text-right">Base Imposable</th>
                                <th className="px-4 py-2 text-right">Bénéficiaires</th>
                                <th className="px-4 py-2 text-right">Retenue Effectuée</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {rsData.withholding.map((w, i) => (
                                <tr key={i}>
                                    <td className="px-4 py-3 font-medium text-gray-700">{w.type}</td>
                                    <td className="px-4 py-3 text-right">{w.base.toFixed(3)}</td>
                                    <td className="px-4 py-3 text-right">{w.beneficiary_count}</td>
                                    <td className="px-4 py-3 text-right font-bold text-purple-700">{w.withheld_amount.toFixed(3)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-purple-50 font-bold text-purple-900">
                            <tr>
                                <td colSpan={3} className="px-4 py-3 text-right">TOTAL À VERSER</td>
                                <td className="px-4 py-3 text-right">{rsData.total_withheld.toFixed(3)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        );
    };

    const CNSSPanel = () => {
        const currentYear = new Date().getFullYear();
        const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
        const [selectedQuarter, setSelectedQuarter] = useState(`${currentYear}-Q${currentQuarter}`);
        const { data: employees = [] } = useEmployees();
        const cnssData = generateCNSSDeclaration(selectedQuarter, employees);
        
        return (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <h3 className="font-bold text-gray-800 flex items-center"><Users className="mr-2 text-green-600" /> Déclaration CNSS (Trimestrielle)</h3>
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">
                                {employees.length} employé{employees.length > 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                value={selectedQuarter}
                                onChange={(e) => setSelectedQuarter(e.target.value)}
                                className="border border-gray-300 rounded-lg px-4 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-green-500 outline-none"
                            >
                                {[1, 2, 3, 4].map(q => (
                                    <option key={q} value={`${currentYear}-Q${q}`}>{currentYear} - T{q}</option>
                                ))}
                                {[1, 2, 3, 4].map(q => (
                                    <option key={q} value={`${currentYear - 1}-Q${q}`}>{currentYear - 1} - T{q}</option>
                                ))}
                            </select>
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold">Trimestre: {cnssData.quarter}</span>
                        </div>
                    </div>
                    {cnssData.employees.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                            <Users size={48} className="mx-auto mb-2 opacity-20" />
                            <p>Aucun employé enregistré</p>
                            <p className="text-xs mt-1">Ajoutez des employés dans l'onglet "Paie & RH"</p>
                        </div>
                    ) : (
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left">Matricule</th>
                                <th className="px-4 py-2 text-left">Nom Prénom</th>
                                <th className="px-4 py-2 text-right">Salaire Brut (Trim)</th>
                                <th className="px-4 py-2 text-right">Part Employé</th>
                                <th className="px-4 py-2 text-right">Part Employeur</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {cnssData.employees.map((e, i) => (
                                <tr key={i}>
                                    <td className="px-4 py-3 font-mono text-gray-600">{e.cnss_number}</td>
                                    <td className="px-4 py-3 text-gray-800">{e.full_name}</td>
                                    <td className="px-4 py-3 text-right">{e.gross_salary.toFixed(3)}</td>
                                    <td className="px-4 py-3 text-right text-gray-600">{e.employee_part.toFixed(3)}</td>
                                    <td className="px-4 py-3 text-right text-gray-600">{e.employer_part.toFixed(3)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-100 font-bold">
                            <tr>
                                <td colSpan={4} className="px-4 py-3 text-right text-gray-600">Total Cotisations</td>
                                <td className="px-4 py-3 text-right text-gray-900">{cnssData.total_due.toFixed(3)}</td>
                            </tr>
                        </tfoot>
                    </table>
                    )}
                </div>
            </div>
        );
    };

    const EtatsPanel = () => {
        const clients = generateEtatClient(invoices);
        const suppliers = generateEtatFournisseur(expenses);

        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="font-bold text-gray-800">État 930 (Clients)</h3>
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">
                            {clients.length} client{clients.length > 1 ? 's' : ''}
                        </span>
                    </div>
                    {clients.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            <FileText size={32} className="mx-auto mb-2 opacity-20" />
                            <p>Aucune facture client validée</p>
                        </div>
                    ) : (
                    <div className="space-y-2">
                        {clients.map(c => (
                            <div key={c.id} className="flex justify-between text-sm py-1">
                                <div>
                                    <div className="font-medium text-gray-700">{c.name}</div>
                                    <div className="text-xs text-gray-400 font-mono">{c.matricule_fiscal}</div>
                                </div>
                                <span className="font-bold text-gray-600">{c.total_ht.toFixed(3)}</span>
                            </div>
                        ))}
                    </div>
                    )}
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="font-bold text-gray-800">État 940 (Fournisseurs)</h3>
                        <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-bold">
                            {suppliers.length} fournisseur{suppliers.length > 1 ? 's' : ''}
                        </span>
                    </div>
                    {suppliers.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            <FileText size={32} className="mx-auto mb-2 opacity-20" />
                            <p>Aucune dépense enregistrée</p>
                        </div>
                    ) : (
                    <div className="space-y-2">
                        {suppliers.map(s => (
                            <div key={s.id} className="flex justify-between text-sm py-1">
                                <div>
                                    <div className="font-medium text-gray-700">{s.name}</div>
                                    <div className="text-xs text-gray-400 font-mono">{s.matricule_fiscal}</div>
                                </div>
                                <span className="font-bold text-gray-600">{s.total_ht.toFixed(3)}</span>
                            </div>
                        ))}
                    </div>
                    )}
                </div>
            </div>
        );
    };

    const JournalView = () => {
        // Calculate Ledger Balance
        const totalDebit = entries.reduce((acc, e) => acc + e.debit, 0);
        const totalCredit = entries.reduce((acc, e) => acc + e.credit, 0);
        const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001;

        const handleReset = () => {
            if (window.confirm('⚠️ Attention ! Cette action va supprimer toutes les écritures comptables et le journal TVA.\n\nLes factures et charges ne seront pas supprimées, mais devront être retraitées.\n\nVoulez-vous continuer ?')) {
                // Clear entries
                setEntries([]);
                
                // Clear singletons
                coreAccounting.transactions = [];
                tvaEngine.tvaJournal = [];
                
                // Refresh context data
                refreshData();
                
                alert('✅ Remise à zéro effectuée avec succès !');
            }
        };

        return (
            <div className="space-y-4">
                {/* Control Bar */}
                <div className={`rounded-lg p-4 flex justify-between items-center border ${isBalanced ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div>
                        <h4 className={`text-sm font-bold ${isBalanced ? 'text-green-800' : 'text-red-800'}`}>
                            {isBalanced ? 'Journal Équilibré' : 'Déséquilibre Détecté'}
                        </h4>
                        <p className="text-xs text-gray-600">
                            Total Débit: {totalDebit.toFixed(3)} | Total Crédit: {totalCredit.toFixed(3)}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleReset}
                            className="flex items-center text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded transition-colors"
                        >
                            <AlertTriangle size={14} className="mr-2" /> Remise à zéro
                        </button>
                        <button className="flex items-center text-sm bg-white border border-gray-300 px-3 py-1.5 rounded text-gray-700 hover:bg-gray-50">
                            <Download size={14} className="mr-2" /> Exporter FEC
                        </button>
                    </div>
                </div>

                {/* Ledger Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="min-w-full text-sm divide-y divide-gray-200">
                        <thead className="bg-gray-800 text-white">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium w-32">Date</th>
                                <th className="px-4 py-3 text-left font-medium w-16">Jrn</th>
                                <th className="px-4 py-3 text-left font-medium w-24">Compte</th>
                                <th className="px-4 py-3 text-left font-medium">Libellé de l'écriture</th>
                                <th className="px-4 py-3 text-right font-medium w-32">Débit</th>
                                <th className="px-4 py-3 text-right font-medium w-32">Crédit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white font-mono text-xs">
                            {entries.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">
                                        Aucune écriture générée. Cliquez sur "Exécuter Moteur Comptable".
                                    </td>
                                </tr>
                            ) : (
                                entries.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-blue-50">
                                        <td className="px-4 py-2 text-gray-600">{entry.date}</td>
                                        <td className="px-4 py-2 text-center">
                                            <span className="bg-gray-200 text-gray-700 px-1 rounded text-[10px] font-bold">{entry.journal_code}</span>
                                        </td>
                                        <td className="px-4 py-2 font-bold text-indigo-700" title={entry.account_label}>
                                            {entry.account_code}
                                        </td>
                                        <td className="px-4 py-2 text-gray-800">
                                            <div className="truncate">{entry.label}</div>
                                            <div className="text-[10px] text-gray-400">{entry.account_label}</div>
                                        </td>
                                        <td className="px-4 py-2 text-right text-gray-900 border-l border-gray-100 bg-gray-50/50">
                                            {entry.debit > 0 ? entry.debit.toFixed(3) : '-'}
                                        </td>
                                        <td className="px-4 py-2 text-right text-gray-900 border-l border-gray-100">
                                            {entry.credit > 0 ? entry.credit.toFixed(3) : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Comptabilité & Fisc</h2>
                    <p className="text-sm text-gray-500">
                        Supervision fiscale, moteur d'écritures et déclarations.
                        <span className="ml-2 inline-flex items-center text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                            Synchronisé en temps réel
                        </span>
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                            <FileText size={14} className="text-blue-500" />
                            {invoices.length} factures
                        </span>
                        <span className="flex items-center gap-1">
                            <Database size={14} className="text-orange-500" />
                            {expenses.length} charges
                        </span>
                        <span className="flex items-center gap-1">
                            <Users size={14} className="text-green-500" />
                            {useEmployees().data?.length || 0} employés
                        </span>
                    </div>
                </div>

                <div className="flex space-x-2">
                    <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm">
                        <div className="flex items-center space-x-4">
                            <div className="text-center">
                                <div className="text-xs text-gray-500">Factures</div>
                                <div className="text-lg font-bold text-blue-600">{invoices.length}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xs text-gray-500">Charges</div>
                                <div className="text-lg font-bold text-orange-600">{expenses.length}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xs text-gray-500">Écritures</div>
                                <div className="text-lg font-bold text-indigo-600">{entries.length}</div>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleRunEngine}
                        disabled={isGenerating}
                        className={`flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all ${isGenerating ? 'opacity-75 cursor-wait' : ''}`}
                        title="Recalculer manuellement les écritures comptables"
                    >
                        <RefreshCw size={16} className={`mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                        {isGenerating ? 'Traitement...' : 'Recalculer'}
                    </button>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('financial_engine')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === 'financial_engine' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Database size={16} className="mr-2" /> Moteur Financier (Live)
                    </button>
                    <button
                        onClick={() => setActiveTab('declarations')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === 'declarations' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <PieChart size={16} className="mr-2" /> Déclarations Fiscales
                    </button>
                    <button
                        onClick={() => setActiveTab('journal')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === 'journal' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <BookOpen size={16} className="mr-2" /> Grand Livre / Journal
                    </button>
                </nav>
            </div>

            {activeTab === 'financial_engine' && <FinancialEngineView />}

            {activeTab === 'declarations' && (
                <div className="space-y-6">
                    {/* Fiscal Sub-Tabs */}
                    <div className="flex space-x-2 overflow-x-auto pb-2">
                        <button onClick={() => setFiscalSubTab('tva')} className={`px-4 py-2 rounded-full text-xs font-bold ${fiscalSubTab === 'tva' ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-600 border border-gray-200'}`}>TVA (Mensuel)</button>
                        <button onClick={() => setFiscalSubTab('suivi_tva')} className={`px-4 py-2 rounded-full text-xs font-bold ${fiscalSubTab === 'suivi_tva' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-gray-600 border border-gray-200'}`}>Suivi TVA</button>
                        <button onClick={() => setFiscalSubTab('rs')} className={`px-4 py-2 rounded-full text-xs font-bold ${fiscalSubTab === 'rs' ? 'bg-purple-100 text-purple-700' : 'bg-white text-gray-600 border border-gray-200'}`}>Retenue Source</button>
                        <button onClick={() => setFiscalSubTab('cnss')} className={`px-4 py-2 rounded-full text-xs font-bold ${fiscalSubTab === 'cnss' ? 'bg-green-100 text-green-700' : 'bg-white text-gray-600 border border-gray-200'}`}>CNSS (Trim.)</button>
                        <button onClick={() => setFiscalSubTab('etat')} className={`px-4 py-2 rounded-full text-xs font-bold ${fiscalSubTab === 'etat' ? 'bg-gray-200 text-gray-800' : 'bg-white text-gray-600 border border-gray-200'}`}>États 930/940</button>
                        <button onClick={() => setFiscalSubTab('is')} className={`px-4 py-2 rounded-full text-xs font-bold ${fiscalSubTab === 'is' ? 'bg-red-100 text-red-700' : 'bg-white text-gray-600 border border-gray-200'}`}>Impôt Sociétés</button>
                    </div>

                    {fiscalSubTab === 'tva' && <TVAPanel />}
                    {fiscalSubTab === 'suivi_tva' && <SuiviTVAPanel />}
                    {fiscalSubTab === 'rs' && <RSPanel />}
                    {fiscalSubTab === 'cnss' && <CNSSPanel />}
                    {fiscalSubTab === 'etat' && <EtatsPanel />}
                    {fiscalSubTab === 'is' && (
                        <div className="bg-white p-6 rounded-xl border border-gray-200 text-center text-gray-500 py-12">
                            <Calculator size={48} className="mx-auto mb-4 opacity-20" />
                            <p>Module Impôt sur les Sociétés (IS) disponible en fin d'exercice.</p>
                            <button className="mt-4 text-blue-600 text-sm hover:underline">Simuler clôture exercice</button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'journal' && <JournalView />}

        </div>
    );
};
