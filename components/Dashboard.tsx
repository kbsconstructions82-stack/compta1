
import React, { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, AlertCircle, DollarSign, Activity, AlertTriangle, ArrowRight, Truck, Check, X, FileText, User, PieChart as PieChartIcon, Wallet, CheckCircle, Users, Landmark } from 'lucide-react';
import { analyzeFinancialHealth } from '../services/geminiService';
import { Invoice, Expense, Vehicle, InvoiceStatus, DriverState, TripRate } from '../types';
import { generateAlerts, generatePnL } from '../utils/analytics';
import { useLanguage } from '../contexts/LanguageContext';
import { calculateMonthlyFinancials, calculatePayroll, calculatePayrollFromNet } from '../utils/taxUtils';
import { getEmployeeRate } from '../src/utils/tariffs';

import { useInvoices } from '../src/hooks/useInvoices';
import { useExpenses } from '../src/hooks/useExpenses';
import { useVehicles, useUpdateVehicle } from '../src/hooks/useVehicles';
import { useMissions } from '../src/hooks/useMissions';
import { useEmployees } from '../src/hooks/useEmployees';
import { useTripRates } from '../src/hooks/useTripRates';
import { useActivity } from '../src/hooks/useActivity';


interface DashboardProps {
    onNavigate: (tab: string) => void;
}

const StatCard = ({ title, value, subtext, icon: Icon, gradientClass, onClick }: any) => (
    <div
        onClick={onClick}
        className="glass-panel rounded-xl p-5 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 cursor-pointer h-full flex flex-col justify-between"
    >
        {/* Background Icon - Simplified and positioned safely */}
        <div className="absolute -right-6 -top-6 opacity-[0.05] pointer-events-none transition-opacity group-hover:opacity-10">
            <Icon size={120} />
        </div>

        <div className="flex justify-between items-start relative z-10 mb-2">
            <div className={`w-12 h-12 rounded-xl ${gradientClass} flex items-center justify-center shadow-lg border border-white/20 flex-shrink-0`}>
                <Icon size={24} className="text-white" />
            </div>
             {/* Optional: Add a small arrow or indicator here if needed */}
        </div>

        <div className="relative z-10">
            <h3 className="text-2xl font-extrabold text-gray-800 tracking-tight mb-1">{value}</h3>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{title}</p>
            
            <div className="flex items-center text-xs font-medium text-gray-600 bg-white/50 w-fit px-2 py-1 rounded-lg backdrop-blur-sm border border-white/30">
                {subtext}
            </div>
        </div>
    </div>
);

const DetailModal = ({ title, onClose, children, colorClass = "bg-white" }: any) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div
            className={`${colorClass} w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col transform transition-all scale-100`}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white/50 backdrop-blur-md">
                <h3 className="text-xl font-bold text-gray-800 flex items-center">
                    {title}
                </h3>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-black/5 rounded-full text-gray-500 transition-colors"
                >
                    <X size={24} />
                </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                {children}
            </div>
        </div>
    </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
    // Hooks
    const { data: invoices = [] } = useInvoices();
    const { data: expenses = [] } = useExpenses();
    const { data: vehicles = [] } = useVehicles();
    const updateVehicleMutation = useUpdateVehicle();
    const { data: missions = [] } = useMissions();
    const { data: employees = [] } = useEmployees();
    const { data: tripRates = [] } = useTripRates();
    const { data: monthlyActivity = {} } = useActivity();

    const onUpdateVehicle = (v: Vehicle) => updateVehicleMutation.mutate(v);

    const [selectedDetail, setSelectedDetail] = useState<string | null>(null);
    const [selectedEmployeeDetail, setSelectedEmployeeDetail] = useState<any>(null); // For detailed cost view
    const [aiAnalysis, setAiAnalysis] = useState<string>("");
    const [loadingAi, setLoadingAi] = useState<boolean>(false);
    const { t } = useLanguage();

    const report = generatePnL(invoices, expenses, employees, tripRates, monthlyActivity, true); // Enable TTC
    const alerts = generateAlerts(invoices, vehicles, missions);
    const totalProfit = report.ebitda;
    const marginPct = (totalProfit / (report.turnover || 1)) * 100;

    // Chart Data (Financial) - Dynamic Aggregation
    const data = useMemo(() => {
        const monthlyData: Record<string, { revenu: number; depenses: number }> = {};
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

        // Initialize last 6 months window or full year
        months.forEach(m => monthlyData[m] = { revenu: 0, depenses: 0 });

        // Aggregate Invoices (Revenue)
        invoices.forEach(inv => {
            if (inv.status === InvoiceStatus.VALIDATED || inv.status === InvoiceStatus.PAID) {
                const date = new Date(inv.date);
                const monthName = months[date.getMonth()];
                monthlyData[monthName].revenu += inv.total_ttc;
            }
        });

        // Aggregate Expenses (Costs)
        expenses.forEach(exp => {
            const date = new Date(exp.date);
            const monthName = months[date.getMonth()];
            monthlyData[monthName].depenses += exp.amount_ttc;
        });

        // Return array for Recharts
        return months.map(m => ({ name: m, ...monthlyData[m] }));
    }, [invoices, expenses]);

    // --- VAT (TVA) Data Calculation ---
    const vatStats = useMemo(() => {
        const monthlyData: Record<string, { collected: number; deductible: number; due: number }> = {};
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        months.forEach(m => monthlyData[m] = { collected: 0, deductible: 0, due: 0 });

        let totalCollected = 0;
        let totalDeductible = 0;

        invoices.forEach(inv => {
            if (inv.status === InvoiceStatus.VALIDATED || inv.status === InvoiceStatus.PAID) {
                const date = new Date(inv.date);
                const monthName = months[date.getMonth()];
                const tva = inv.tva_amount || (inv.total_ttc - inv.total_ht) || 0;
                monthlyData[monthName].collected += tva;
                totalCollected += tva;
            }
        });

        expenses.forEach(exp => {
            const date = new Date(exp.date);
            const monthName = months[date.getMonth()];
            // Only count if deductible
            if (exp.is_deductible) {
                const tva = exp.tva_amount || (exp.amount_ttc - exp.amount_ht) || 0;
                monthlyData[monthName].deductible += tva;
                totalDeductible += tva;
            }
        });

        const chartData = months.map(m => ({
            name: m,
            collectee: monthlyData[m].collected,
            deductible: monthlyData[m].deductible,
            due: monthlyData[m].collected - monthlyData[m].deductible
        }));

        const currentMonthIndex = new Date().getMonth();
        const currentMonthName = months[currentMonthIndex];
        const currentMonthDue = monthlyData[currentMonthName].collected - monthlyData[currentMonthName].deductible;

        return {
            chartData,
            totalCollected,
            totalDeductible,
            netDueTotal: totalCollected - totalDeductible,
            currentMonthDue
        };
    }, [invoices, expenses]);



    // --- Payroll Data Calculation ---
    const payrollStats = useMemo(() => {
        const details: any[] = [];

        // Calculate using real data
        const aggregated = employees.reduce((acc, driver) => {
            // Calculate Bonus
            const activities = monthlyActivity[driver.id] || {};
            let totalBonus = 0;

            Object.entries(activities).forEach(([routeName, count]) => {
                // 1. Try exact match "Departure - Destination"
                const parts = routeName.split(' - ');
                let rateFound = false;

                if (parts.length >= 2) {
                    const dep = parts[0].trim();
                    const dest = parts[1].trim();
                    const autoRate = getEmployeeRate(dep, dest);
                    if (autoRate > 0) {
                        totalBonus += (count as number) * autoRate;
                        rateFound = true;
                    }
                }

                if (!rateFound) {
                    const rateConfig = tripRates.find(r => `${r.departure} - ${r.destination}` === routeName);
                    if (rateConfig) {
                        totalBonus += (count as number) * rateConfig.truck_price;
                    } else {
                        // 2. Fallback to legacy destination check
                        const legacy = tripRates.find(r => r.destination === routeName);
                        if (legacy) {
                            totalBonus += (count as number) * legacy.truck_price;
                        }
                    }
                }
            });
            // Fallback removed/zeroed to reflect real data
            if (totalBonus === 0 && Object.keys(activities).length === 0) totalBonus = 0;

            // NEW LOGIC: Treat Inputs as Net
            const res = calculatePayrollFromNet(
                driver.baseSalary,
                driver.maritalStatus,
                driver.childrenCount,
                totalBonus
            );

            // Add to details list
            details.push({
                name: driver.fullName || `Chauffeur ${driver.id}`,
                value: res.totalCost, // Keep for global sorting if needed
                baseNet: driver.baseSalary, // NET Input
                bonusNet: totalBonus,       // NET Input
                ...res
            });

            return {
                net: acc.net + res.netSalary,
                cnss: acc.cnss + (res.cnssEmployer + res.cnssEmployee),
                irpp: acc.irpp + res.irppMonthly,
                totalCost: acc.totalCost + res.totalCost,
                count: acc.count + 1
            };
        }, { net: 0, cnss: 0, irpp: 0, totalCost: 0, count: 0 });

        return { aggregated, details };
    }, [employees, tripRates, monthlyActivity]);

    // --- Employee Cost Breakdown (Pie Charts) ---
    const costBreakdownData = useMemo(() => {
        const charts = [];

        // 1. Employees
        // @ts-ignore
        if (payrollStats.details) {
            // @ts-ignore
            payrollStats.details.forEach(emp => {
                charts.push({
                    id: `emp-${emp.name}`,
                    title: emp.name,
                    subtitle: 'Salarié',
                    total: emp.baseNet + emp.bonusNet, // Display Total NET in center
                    data: [
                        { name: 'Salaire Base', value: emp.baseNet, color: '#10b981' }, // Green
                        { name: 'Primes', value: emp.bonusNet, color: '#3b82f6' }      // Blue
                    ],
                    ...emp // Pass all employee details for the modal
                });
            });
        }

        // 2. Other Expenses & Breakdown
        let otherExpenses = 0;
        const expensesByCategory: Record<string, number> = {};

        expenses.forEach(exp => {
            if (exp.category !== 'Salaires') {
                otherExpenses += exp.amount_ttc;
                // Aggregate by category
                expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + exp.amount_ttc;
            }
        });

        // Convert to array for modal
        const expensesDetails = Object.entries(expensesByCategory)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount);

        charts.push({
            id: 'other-expenses',
            title: 'Autres Dépenses',
            subtitle: 'Fonctionnement',
            total: otherExpenses,
            data: [
                { name: 'Dépenses', value: otherExpenses, color: '#ef4444' }
            ],
            isExpense: true,
            details: expensesDetails // Pass the list for the modal
        });

        // Add Empty slots if needed to fill grid or just let it flow
        return charts;
    }, [payrollStats, expenses]);

    const handleAiAnalysis = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setLoadingAi(true);
        const result = await analyzeFinancialHealth(invoices, expenses);
        setAiAnalysis(result);
        setLoadingAi(false);
    }

    const handleAlertAction = (alert: any, e?: React.MouseEvent) => {
        e?.stopPropagation(); // Prevent opening modal if button clicked
        if (alert.action === 'Renouveler' || alert.action === 'Préparer') {
            const vehicle = vehicles.find(v => alert.id.includes(`veh-${v.id}-`));
            if (vehicle) {
                const nextYear = new Date();
                nextYear.setFullYear(nextYear.getFullYear() + 1);
                const dateStr = nextYear.toISOString().split('T')[0];

                let updated = { ...vehicle };
                if (alert.id.includes('Assurance')) updated.insurance_expiry = dateStr;
                else if (alert.id.includes('Visite')) updated.technical_visit_expiry = dateStr;
                else if (alert.id.includes('Taxe')) updated.vignette_expiry = dateStr;

                onUpdateVehicle(updated);
            }
        } else if (alert.action === 'Relancer Client') {
            onNavigate('invoicing');
        } else if (alert.action === 'Déclarer') {
            onNavigate('accounting');
        }
    };

    // --- Calculations for Modals ---

    const revenueByClient = useMemo(() => {
        const clients: Record<string, number> = {};
        invoices.forEach(inv => {
            if (inv.status === InvoiceStatus.VALIDATED || inv.status === InvoiceStatus.PAID) {
                clients[inv.clientName || 'Inconnu'] = (clients[inv.clientName || 'Inconnu'] || 0) + inv.total_ttc;
            }
        });
        return Object.entries(clients)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [invoices]);

    const expensesByCategory = useMemo(() => {
        const cats: Record<string, number> = {};
        expenses.forEach(exp => {
            cats[exp.category] = (cats[exp.category] || 0) + exp.amount_ttc;
        });
        return Object.entries(cats)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [expenses]);

    const COLORS = ['#3b82f6', '#f97316', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

    const renderModalContent = () => {
        switch (selectedDetail) {
            case 'alerts':
                return (
                    <div className="space-y-4">
                        <div className="flex items-center p-4 bg-orange-50 border border-orange-100 rounded-xl mb-6">
                            <AlertCircle className="text-orange-500 mr-3" size={24} />
                            <div>
                                <h4 className="font-bold text-orange-900">État de Santé du Parc & Fiscalité</h4>
                                <p className="text-sm text-orange-700">Vous avez {alerts.length} alertes nécessitant une attention immédiate.</p>
                            </div>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {alerts.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 flex flex-col items-center">
                                    <CheckCircle size={48} className="text-green-200 mb-2" />
                                    <p>Aucune alerte active. Tout est en ordre !</p>
                                </div>
                            ) : alerts.map((alert) => (
                                <div key={alert.id} className="py-4 flex justify-between items-center hover:bg-gray-50 rounded-lg px-2 transition-colors">
                                    <div className="flex items-start">
                                        <div className={`mt-1 w-2.5 h-2.5 rounded-full mr-3 flex-shrink-0 ${alert.type === 'critical' ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                                        <div>
                                            <p className="font-medium text-gray-800">{alert.message}</p>
                                            <p className="text-xs text-gray-500">Détecté le {new Date().toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    {alert.action && (
                                        <button
                                            onClick={(e) => handleAlertAction(alert, e)}
                                            className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                                        >
                                            {alert.action}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'revenue':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h4 className="font-bold text-gray-800 mb-4 flex items-center"><User className="mr-2 text-blue-600" /> Top Clients (CA HT)</h4>
                            <div className="space-y-3">
                                {revenueByClient.map((c, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="flex items-center">
                                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mr-3">{i + 1}</div>
                                            <span className="font-medium text-gray-700">{c.name}</span>
                                        </div>
                                        <span className="font-bold text-gray-900">{c.value.toLocaleString()} TND</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800 mb-4">Répartition par Client</h4>
                            <div className="h-64 min-h-[256px]">
                                {revenueByClient && revenueByClient.length > 0 && (
                                <ResponsiveContainer width="100%" height={256} minHeight={256}>
                                    <PieChart>
                                        <Pie
                                            data={revenueByClient}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {revenueByClient.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => `${Number(value).toLocaleString()} TND`} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 'costs':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h4 className="font-bold text-gray-800 mb-4 flex items-center"><Wallet className="mr-2 text-orange-600" /> Répartition des Charges</h4>
                            <div className="h-64 w-full min-h-[256px]">
                                {expensesByCategory && expensesByCategory.length > 0 && (
                                <ResponsiveContainer width="100%" height={256} minHeight={256}>
                                    <PieChart>
                                        <Pie
                                            data={expensesByCategory}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            dataKey="value"
                                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                        >
                                            {expensesByCategory.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => `${Number(value).toLocaleString()} TND`} />
                                    </PieChart>
                                </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800 mb-4">Détail par Catégorie</h4>
                            <div className="space-y-2 overflow-y-auto max-h-64 pr-2 custom-scrollbar">
                                {expensesByCategory.map((cat, i) => (
                                    <div key={i} className="flex justify-between items-center p-2 border-b border-gray-50 hover:bg-gray-50">
                                        <div className="flex items-center">
                                            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                            <span className="text-sm text-gray-600">{cat.name}</span>
                                        </div>
                                        <span className="text-sm font-bold text-gray-800">{cat.value.toLocaleString()} TND</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 'net_result':
                return (
                    <div className="space-y-6">
                        <div className="bg-green-50 p-6 rounded-xl border border-green-100 text-center">
                            <h3 className="text-gray-500 text-sm font-bold uppercase">Résultat Net de l'Exercice</h3>
                            <p className="text-4xl font-extrabold text-green-700 mt-2">
                                {totalProfit > 0 ? '+' : ''}{totalProfit.toLocaleString()} <span className="text-lg text-green-600">TND</span>
                            </p>
                            <p className="text-green-600 text-sm mt-1">Marge Nette: {marginPct.toFixed(1)}%</p>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="min-w-full text-sm">
                                <tbody className="divide-y divide-gray-100">
                                    <tr className="bg-gray-50">
                                        <td className="px-4 py-3 font-bold text-gray-700">Produits d'Exploitation (CA)</td>
                                        <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">+{report.turnover.toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                        <td className="px-4 py-3 text-gray-600 pl-8">- Achats Consommés (Carburant...)</td>
                                        <td className="px-4 py-3 text-right font-mono text-red-500">-{report.directCosts.toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                        <td className="px-4 py-3 text-gray-600 pl-8">- Services Extérieurs (Entretien...)</td>
                                        <td className="px-4 py-3 text-right font-mono text-red-500">-{report.externalServices.toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                        <td className="px-4 py-3 text-gray-600 pl-8">- Charges Personnel</td>
                                        <td className="px-4 py-3 text-right font-mono text-red-500">-{report.personnelCosts.toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                        <td className="px-4 py-3 text-gray-600 pl-8">- Impôts & Taxes</td>
                                        <td className="px-4 py-3 text-right font-mono text-red-500">-{report.taxes.toLocaleString()}</td>
                                    </tr>
                                    <tr className="bg-gray-100 border-t-2 border-gray-200">
                                        <td className="px-4 py-4 font-bold text-gray-800">RÉSULTAT D'EXPLOITATION (EBITDA)</td>
                                        <td className={`px-4 py-4 text-right font-mono font-bold text-lg ${totalProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {totalProfit.toLocaleString()}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'vat':
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <h4 className="text-sm font-bold text-blue-800 uppercase mb-1">TVA Collectée (Ventes)</h4>
                                <p className="text-2xl font-extrabold text-blue-600">{vatStats.totalCollected.toLocaleString()} TND</p>
                            </div>
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                <h4 className="text-sm font-bold text-red-800 uppercase mb-1">TVA Déductible (Achats)</h4>
                                <p className="text-2xl font-extrabold text-red-600">{vatStats.totalDeductible.toLocaleString()} TND</p>
                            </div>
                            <div className={`p-4 rounded-xl border ${vatStats.netDueTotal > 0 ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'}`}>
                                <h4 className={`text-sm font-bold uppercase mb-1 ${vatStats.netDueTotal > 0 ? 'text-orange-800' : 'text-green-800'}`}>
                                    {vatStats.netDueTotal > 0 ? 'Reste à Payer (Solde)' : 'Crédit de TVA'}
                                </h4>
                                <p className={`text-2xl font-extrabold ${vatStats.netDueTotal > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                    {Math.abs(vatStats.netDueTotal).toLocaleString()} TND
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <h4 className="font-bold text-gray-800 mb-6 flex items-center">
                                <Activity className="mr-2 text-indigo-500" /> Évolution de la TVA (Mensuelle)
                            </h4>
                            <div className="h-80 w-full min-h-[320px]" style={{ direction: 'ltr' }}>
                                {vatStats.chartData && vatStats.chartData.length > 0 && (
                                <ResponsiveContainer width="100%" height={320} minHeight={320}>
                                    <BarChart data={vatStats.chartData} barGap={8}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: '1px solid rgba(209, 213, 219, 0.5)',
                                                background: 'rgba(255, 255, 255, 0.95)',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                                color: '#1f2937'
                                            }}
                                            formatter={(value) => [`${Number(value).toLocaleString()} TND`, '']}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        <Bar name="Collectée" dataKey="collectee" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                        <Bar name="Déductible" dataKey="deductible" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                    </BarChart>
                                </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        <div className="text-xs text-gray-500 italic text-center bg-gray-50 p-3 rounded-lg">
                            * Ce graphique présente la TVA issue des factures valid/payées et des dépenses marquées comme déductibles.
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-8">
            {/* Detail Modal */}
            {selectedDetail && (
                <DetailModal
                    title={
                        selectedDetail === 'alerts' ? "Centre de Notifications" :
                            selectedDetail === 'revenue' ? "Analyse du Chiffre d'Affaires" :
                                selectedDetail === 'net_result' ? "Détail du Résultat Net" :
                                    selectedDetail === 'costs' ? "Analyse des Charges" :
                                        "Données Graphiques"
                    }
                    onClose={() => setSelectedDetail(null)}
                    colorClass={selectedDetail === 'alerts' ? 'bg-orange-50' : 'bg-white'}
                >
                    {renderModalContent()}
                </DetailModal>
            )}

            {/* Alert Center - 3D Style */}
            {alerts.length > 0 && (
                <div
                    className="rounded-2xl bg-white/60 border border-white/60 shadow-lg backdrop-blur-md overflow-hidden relative cursor-pointer hover:shadow-xl transition-all hover:scale-[1.005]"
                    onClick={() => setSelectedDetail('alerts')}
                >
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-red-500 to-orange-500"></div>
                    <div className="px-6 py-4 flex justify-between items-center bg-white/40">
                        <div className="flex items-center text-red-800 font-bold text-sm">
                            <div className="bg-red-100 p-1.5 rounded-lg me-3 shadow-inner">
                                <AlertTriangle size={18} className="text-red-600" />
                            </div>
                            {t('activeAlerts')} ({alerts.length})
                        </div>
                        <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md border border-red-100">Actions requises</span>
                    </div>
                    <div className="divide-y divide-gray-100/50 max-h-40 overflow-y-auto pointer-events-none"> {/* Disable pointer events inside to treat whole block as click */}
                        {alerts.slice(0, 3).map(alert => ( // Only show top 3 in preview
                            <div key={alert.id} className="px-6 py-3 flex justify-between items-center transition-colors">
                                <div className="flex items-center">
                                    <div className={`w-2.5 h-2.5 rounded-full me-3 shadow-sm border border-white ${alert.type === 'critical' ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-orange-400 to-orange-500'}`}></div>
                                    <span className="text-sm font-medium text-gray-700">{alert.message}</span>
                                </div>
                            </div>
                        ))}
                        {alerts.length > 3 && (
                            <div className="px-6 py-2 text-center text-xs text-gray-500 bg-gray-50/50 italic">
                                + {alerts.length - 3} autres alertes... (Cliquez pour voir)
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* KPI Stats - Glassmorphism & 3D Icons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                <StatCard
                    title={t('turnover')}
                    value={`${report.turnover.toLocaleString()} TND`}
                    subtext={`${t('cumulEx')} 2024 (TTC)`}
                    icon={DollarSign}
                    gradientClass="grad-cyan"
                    onClick={() => setSelectedDetail('revenue')}
                />
                <StatCard
                    title={t('netResult')}
                    value={`${totalProfit.toLocaleString()} TND`}
                    subtext={`${marginPct.toFixed(1)}% ${t('netMargin')}`}
                    icon={TrendingUp}
                    gradientClass={totalProfit > 0 ? "grad-emerald" : "bg-gradient-to-br from-red-500 to-red-600"}
                    onClick={() => setSelectedDetail('net_result')}
                />
                <StatCard
                    title={vatStats.currentMonthDue >= 0 ? "TVA À PAYER" : "CRÉDIT TVA"}
                    value={`${Math.abs(vatStats.currentMonthDue).toLocaleString()} TND`}
                    subtext={vatStats.currentMonthDue >= 0 ? "À déclarer ce mois" : "Reportable mois prochain"}
                    icon={Landmark}
                    gradientClass={vatStats.currentMonthDue >= 0 ? "bg-gradient-to-br from-orange-400 to-orange-600" : "grad-emerald"}
                    onClick={() => setSelectedDetail('vat')}
                />
                <StatCard
                    title={t('directCosts')}
                    value={`${report.directCosts.toLocaleString()} TND`}
                    subtext={`${t('fuelParts')} (TTC)`}
                    icon={Truck}
                    gradientClass="grad-orange"
                    onClick={() => setSelectedDetail('costs')}
                />
                <StatCard
                    title={t('activeAlerts')}
                    value={alerts.length}
                    subtext={t('taxFleet')}
                    icon={AlertCircle}
                    gradientClass={alerts.length > 0 ? "bg-gradient-to-br from-red-400 to-red-600" : "grad-emerald"}
                    onClick={() => setSelectedDetail('alerts')}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart - Glass Panel */}
                <div className="lg:col-span-2 space-y-8">
                    <div
                        className="glass-panel p-6 rounded-2xl shadow-xl cursor-pointer hover:shadow-2xl transition-all duration-300"
                        onClick={() => setSelectedDetail('chart')}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-800">{t('financialEvolution')}</h3>
                            <div className="flex space-x-3 rtl:space-x-reverse text-sm">
                                <div className="flex items-center px-3 py-1 rounded-full bg-white/50 border border-white shadow-sm">
                                    <div className="w-3 h-3 rounded-full bg-blue-500 me-2 shadow-[0_0_5px_rgba(59,130,246,0.5)]"></div>
                                    <span className="font-medium text-gray-600">{t('revenue')}</span>
                                </div>
                                <div className="flex items-center px-3 py-1 rounded-full bg-white/50 border border-white shadow-sm">
                                    <div className="w-3 h-3 rounded-full bg-red-500 me-2 shadow-[0_0_5px_rgba(239,68,68,0.5)]"></div>
                                    <span className="font-medium text-gray-600">{t('charges')}</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-80 w-full min-h-[320px]" style={{ direction: 'ltr' }}>
                            {data && data.length > 0 && (
                                <ResponsiveContainer width="100%" height={320} minHeight={320}>
                                    <BarChart data={data} barGap={8}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.4)' }}
                                        contentStyle={{
                                            borderRadius: '12px',
                                            border: '1px solid rgba(209, 213, 219, 0.5)',
                                            background: 'rgba(255, 255, 255, 0.95)',
                                            backdropFilter: 'blur(4px)',
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                            color: '#1f2937' // Explicit dark text
                                        }}
                                        itemStyle={{ color: '#1f2937' }} // Explicit dark item text
                                        labelStyle={{ color: '#4b5563', fontWeight: 'bold' }} // Explicit dark label text
                                        formatter={(value) => [`${Number(value).toLocaleString()} TND`, ' (TTC)']}
                                    />
                                    <Bar dataKey="revenu" fill="url(#colorRevenue)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                                    <Bar dataKey="depenses" fill="url(#colorExpense)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        </linearGradient>
                                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
                                        </linearGradient>
                                    </defs>
                                </BarChart>
                            </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* NEW WIDGET: VAT CHART (Now visible directly) */}
                    <div
                        className="glass-panel p-6 rounded-2xl shadow-xl cursor-default hover:shadow-2xl transition-all duration-300"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center">
                                <Landmark className="mr-2 text-indigo-500" /> Suivi de la TVA (Mensuel)
                            </h3>
                            <button
                                onClick={() => setSelectedDetail('vat')}
                                className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 hover:bg-indigo-100"
                            >
                                Voir Détail Complet
                            </button>
                        </div>
                        <div className="h-64 w-full min-h-[256px]" style={{ direction: 'ltr' }}>
                            {vatStats.chartData && vatStats.chartData.length > 0 && (
                            <ResponsiveContainer width="100%" height={256} minHeight={256}>
                                <BarChart data={vatStats.chartData} barGap={8}> {/* Removed slice(-3) to show full history */}
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                        contentStyle={{
                                            borderRadius: '12px',
                                            border: '1px solid rgba(209, 213, 219, 0.5)',
                                            background: 'rgba(255, 255, 255, 0.95)',
                                            backdropFilter: 'blur(4px)',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                            color: '#1f2937'
                                        }}
                                        formatter={(value) => [`${Number(value).toLocaleString()} TND`, '']}
                                    />
                                    <Bar name="Collectée" dataKey="collectee" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                    <Bar name="Déductible" dataKey="deductible" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* NEW WIDGET: GLOBAL COSTS SUMMARY */}
                    {/* NEW WIDGET: COSTS BREAKDOWN GRID */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center">
                                <Users className="mr-2 text-purple-600" /> Répartition des Coûts par Salarié
                            </h3>
                            <button onClick={() => onNavigate('hr')} className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full hover:bg-purple-100">
                                Voir RH
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {costBreakdownData.map((chart: any) => (
                                <div
                                    key={chart.id}
                                    onClick={() => setSelectedEmployeeDetail(chart)}
                                    className="glass-panel p-4 rounded-xl shadow-md flex flex-col items-center hover:shadow-lg transition-all border border-white/40 cursor-pointer hover:border-indigo-400 group"
                                >
                                    <div className="w-full flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-sm">{chart.title}</h4>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">{chart.subtitle}</p>
                                        </div>
                                        <div className="text-xs font-bold bg-gray-50 px-2 py-0.5 rounded text-gray-600">
                                            {Number(chart.total).toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="h-32 w-32 min-h-[128px] relative my-2">
                                        {chart.data && chart.data.length > 0 && (
                                        <ResponsiveContainer width="100%" height={128} minHeight={128}>
                                            <PieChart>
                                                <Pie
                                                    data={chart.data}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={25}
                                                    outerRadius={40}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {chart.data.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value) => [`${Number(value).toLocaleString()} TND`, '']}
                                                    contentStyle={{ borderRadius: '8px', fontSize: '11px', padding: '4px 8px' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        )}
                                        {/* Center Total */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-[9px] text-gray-400">Total Net</span>
                                            <span className="text-[11px] font-bold text-indigo-600 group-hover:scale-110 transition-transform">TND</span>
                                        </div>
                                    </div>

                                    {/* Legend/Stats */}
                                    <div className="w-full mt-2 space-y-1.5 bg-gray-50/50 p-2 rounded-lg">
                                        {chart.data.map((d: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-[10px]">
                                                <div className="flex items-center">
                                                    <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: d.color }}></div>
                                                    <span className="text-gray-500">{d.name}</span>
                                                </div>
                                                <span className="font-bold text-gray-700">{d.value.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>


                {/* AI Insight Card - Premium Dark Glass */}
                <div className="relative rounded-2xl overflow-hidden shadow-2xl flex flex-col group h-full">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-purple-900 opacity-95"></div>
                    {/* Decorative gradients */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-overlay filter blur-[60px] opacity-40 animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-overlay filter blur-[60px] opacity-40"></div>

                    <div className="relative p-6 h-full flex flex-col z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                <div className="p-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
                                    <Activity className="text-purple-300" size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-white tracking-wide">{t('aiExpert')}</h3>
                            </div>
                            <button
                                onClick={handleAiAnalysis}
                                className="text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-full transition-all hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] backdrop-blur-sm"
                            >
                                {loadingAi ? t('analyzing') : t('refresh')}
                            </button>
                        </div>

                        <div className="flex-1 bg-black/20 rounded-xl p-5 text-sm leading-relaxed overflow-y-auto max-h-60 scrollbar-thin scrollbar-thumb-white/20 border border-white/5 text-indigo-50 shadow-inner">
                            {aiAnalysis ? (
                                <div className="whitespace-pre-line drop-shadow-sm">{aiAnalysis}</div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center text-indigo-200/60">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3 shadow-inner">
                                        <Activity size={32} className="opacity-50" />
                                    </div>
                                    <p className="italic font-light">
                                        {t('aiPrompt')}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 text-[10px] text-indigo-300/50 uppercase tracking-widest text-center">
                            {t('poweredBy')}
                        </div>
                    </div>
                </div>
            </div >
            {/* --- MODAL: Employee Cost Details --- */}
            {selectedEmployeeDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedEmployeeDetail(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden m-4" onClick={e => e.stopPropagation()}>
                        <div className="bg-indigo-50 p-4 border-b border-indigo-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-indigo-900">{selectedEmployeeDetail.title}</h3>
                                <p className="text-xs text-indigo-600">Détail des Coûts & Salaires</p>
                            </div>
                            <button onClick={() => setSelectedEmployeeDetail(null)}><X className="text-indigo-400 hover:text-indigo-600" /></button>
                        </div>

                        {selectedEmployeeDetail.isExpense ? (
                            // --- EXPENSES VIEW ---
                            <div className="p-0 overflow-y-auto max-h-[60vh] custom-scrollbar">
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catégorie</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Montant (TTC)</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">%</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {selectedEmployeeDetail.details.map((item: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-6 py-3 text-sm text-gray-700 font-medium">{item.category}</td>
                                                <td className="px-6 py-3 text-sm text-gray-900 font-bold text-right">{item.amount.toLocaleString()} DT</td>
                                                <td className="px-6 py-3 text-sm text-gray-400 text-right">
                                                    {((item.amount / selectedEmployeeDetail.total) * 100).toFixed(1)}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-red-50 border-t border-red-100">
                                        <tr>
                                            <td className="px-6 py-3 text-sm font-bold text-red-800">TOTAL</td>
                                            <td className="px-6 py-3 text-sm font-bold text-red-800 text-right">{selectedEmployeeDetail.total.toLocaleString()} DT</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ) : (
                            // --- EMPLOYEE VIEW ---
                            <div className="p-6 space-y-4">
                                {/* 1. NET Section */}
                                <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                                    <h4 className="text-xs font-bold text-green-700 uppercase mb-2 border-b border-green-200 pb-1">1. Ce que reçoit le salarié (NET)</h4>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Salaire Base Net</span>
                                            <span className="font-bold text-gray-800">{selectedEmployeeDetail.baseNet?.toFixed(3)} DT</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Primes Trajets Net</span>
                                            <span className="font-bold text-gray-800">{selectedEmployeeDetail.bonusNet?.toFixed(3)} DT</span>
                                        </div>
                                        <div className="flex justify-between text-sm pt-1 border-t border-green-200 mt-1">
                                            <span className="font-bold text-green-800">Total NET Reçu</span>
                                            <span className="font-bold text-green-800 text-base">{(selectedEmployeeDetail.baseNet + selectedEmployeeDetail.bonusNet).toFixed(3)} DT</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. EMPLOYER CHARGES Section */}
                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                    <h4 className="text-xs font-bold text-blue-700 uppercase mb-2 border-b border-blue-200 pb-1">2. Charges Entreprise (Calculées)</h4>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Salaire Brut Reconstitué</span>
                                            <span className="font-mono text-gray-500">{selectedEmployeeDetail.gross?.toFixed(3)} DT</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">CNSS Patronale (~19%)</span>
                                            <span className="font-bold text-red-600">+{selectedEmployeeDetail.cnssEmployer?.toFixed(3)} DT</span>
                                        </div>
                                        <div className="flex justify-between text-sm pt-1 border-t border-blue-200 mt-1">
                                            <span className="font-bold text-blue-800">Coût Total Entreprise (Super Brut)</span>
                                            <span className="font-bold text-blue-800 text-base">{selectedEmployeeDetail.value?.toFixed(3)} DT</span>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-[10px] text-gray-400 italic text-center">
                                    * Le système calcule automatiquement le Brut et les charges patronales à partir du Net saisi.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
