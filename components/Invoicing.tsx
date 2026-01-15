import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, InvoiceStatus, InvoiceItem, Mission, MissionStatus } from '../types';
import { TAX_CONFIG } from '../constants';
import { useDatabase } from '../contexts/DatabaseContext';
import { Plus, Trash2, Printer, Download, Eye, ArrowLeft, Send, Ban, Edit2, CheckCircle, Save, X, FileDown } from 'lucide-react';
import { generateInvoicePDF } from '../src/utils/invoicePDF';
import { generateMonthlyInvoicePDF } from '../src/utils/monthlyInvoicePDF';
import { calculateTTC, calculateTVA, calculateRS } from '../utils/taxUtils';
import { useInvoices, useAddInvoice, useUpdateInvoice, useDeleteInvoice } from '../src/hooks/useInvoices';
import { useClients, useAddClient } from '../src/hooks/useClients';
import { useMissions, useUpdateMission } from '../src/hooks/useMissions';

// DEFAULT_CLIENTS removed in favor of Database Clients via useClients hook

// Trajets prédéfinis basés sur tarif_facture et salarié.md
// Format: "Départ vers Destination"
const PREDEFINED_TRIPS = [
    "Kairouan vers Tunis",
    "Kairouan vers Bizerte",
    "Kairouan vers Sousse",
    "Kairouan vers Sfax",
    "Kairouan vers Sidi Lheni",
    "Kairouan vers Siliana",
    "Kairouan vers Bouarada",
    "Kairouan vers Tozeur",
    "Kairouan vers Gabes",
    "Kairouan vers Medjez el Bab",
    "Kairouan vers Grombalia",
    "Kairouan vers Beja",
    "Kairouan vers Le Kef",
    "Kairouan vers Tebourba",
    "Kairouan vers Hammam Zriba",
    "Kairouan vers Jemmal",
    "Kairouan vers El Jem",
    "Kairouan vers Kerker",
    "Kairouan vers Chebba",
    "Kairouan vers Djerba",
    "Kairouan vers Zarzis",
    "Kairouan vers Medenine",
    "Kairouan vers Douz",
    "Kairouan vers Nefta",
    "Kairouan vers Ras Jebel",
    "Kairouan vers Menzel Bourguiba",
    // Reverse routes (optionnel)
    "Tunis vers Kairouan",
    "Sfax vers Kairouan",
    "Sousse vers Kairouan"
];

export const Invoicing: React.FC = () => {
    const { coreAccounting, tvaEngine, refreshData } = useDatabase();
    const [viewMode, setViewMode] = useState<'list' | 'edit' | 'preview'>('list');

    // Data Hooks
    const { data: invoices = [] } = useInvoices();
    const addInvoiceMutation = useAddInvoice();
    const updateInvoiceMutation = useUpdateInvoice();
    const deleteInvoiceMutation = useDeleteInvoice();

    const { data: missions = [] } = useMissions();
    const updateMissionMutation = useUpdateMission();

    // Clients Management
    const { data: clients = [] } = useClients();
    const addClientMutation = useAddClient();

    const [showNewClientForm, setShowNewClientForm] = useState(false);
    const [newClientData, setNewClientData] = useState({ name: '', matricule_fiscale: '', address: '', contact_phone: '', contact_email: '' });

    // Import Missions Modal
    const [isImportModalOpen, setImportModalOpen] = useState(false);
    const [selectedMissionIds, setSelectedMissionIds] = useState<string[]>([]);

    // Trips Management
    const [savedTrips, setSavedTrips] = useState<string[]>([]);

    useEffect(() => {
        // Load saved trips from localStorage
        const storedTrips = localStorage.getItem('custom_trips');
        if (storedTrips) {
            setSavedTrips(JSON.parse(storedTrips));
        }
    }, []);

    const allTrips = useMemo(() => {
        const unique = new Set([...PREDEFINED_TRIPS, ...savedTrips]);
        return Array.from(unique);
    }, [savedTrips]);

    const saveCustomTrip = (trip: string) => {
        if (trip && !PREDEFINED_TRIPS.includes(trip) && !savedTrips.includes(trip)) {
            const newSavedTrips = [...savedTrips, trip];
            setSavedTrips(newSavedTrips);
            localStorage.setItem('custom_trips', JSON.stringify(newSavedTrips));
        }
    };
    const [activeTab, setActiveTab] = useState<'individual' | 'monthly'>('individual');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [monthlyApplyRS, setMonthlyApplyRS] = useState(false);


    const [currentInvoice, setCurrentInvoice] = useState<Partial<Invoice> | null>(null);

    // --- Filters ---
    const [filterTrip, setFilterTrip] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            // 1. Date Filter
            if (filterStartDate && inv.date < filterStartDate) return false;
            if (filterEndDate && inv.date > filterEndDate) return false;

            // 2. Trip Filter
            if (filterTrip) {
                // Check if ANY item in the invoice matches the trip
                const hasTrip = inv.items?.some(item => item.trajet === filterTrip);
                if (!hasTrip) return false;
            }

            return true;
        });
    }, [invoices, filterTrip, filterStartDate, filterEndDate]);

    const resetFilters = () => {
        setFilterTrip('');
        setFilterStartDate('');
        setFilterEndDate('');
    };

    // --- Logic & Calculations ---

    const generateInvoiceNumber = () => {
        // In a real app, this comes from backend to ensure concurrency safety
        const count = invoices.filter(i => i.status !== InvoiceStatus.DRAFT).length;
        return `FAC-2026-${(count + 1).toString().padStart(3, '0')}`;
    };

    const calculateInvoiceTotals = (invoice: Partial<Invoice>) => {
        const items = invoice.items || [];
        const total_ht = items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);

        // Tax Logic
        const tva_rate = invoice.tva_rate || TAX_CONFIG.TVA_TRANSPORT;
        const tva_amount = calculateTVA(total_ht, tva_rate);

        // Timbre Fiscal is 0 for individual invoices (only on monthly statement)
        const timbre_fiscal = invoice.timbre_fiscal || 0;

        // Use Centralized TTC Logic
        const total_ttc = calculateTTC(total_ht, tva_rate, timbre_fiscal);

        // Retenue à la Source Logic (Tunisia)
        // Rule: 1% for Transport if TTC > 1000 TND (Commercial usage) or forced
        const rs_amount = calculateRS(total_ttc, invoice.rs_rate, invoice.apply_rs);

        const net_to_pay = total_ttc - rs_amount;

        return { total_ht, tva_amount, total_ttc, rs_amount, net_to_pay, timbre_fiscal };
    };

    // --- Actions ---

    const handleCreateNew = () => {
        // Initialize with first client if available, or empty
        const defaultClient = clients.length > 0 ? clients[0] : null;
        const today = new Date().toISOString().split('T')[0];
        // Default due date is 30 days from today
        const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        // Generate a simple UUID fallback
        const generateId = () => {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                return crypto.randomUUID();
            }
            return 'INV-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        };
        
        setCurrentInvoice({
            id: generateId(),
            status: InvoiceStatus.DRAFT,
            date: today,
            due_date: dueDate,
            items: [],
            tva_rate: TAX_CONFIG.TVA_TRANSPORT,
            timbre_fiscal: 0, // No timbre on individual invoices
            apply_rs: false, // Default to false (User must opt-in)
            rs_rate: 1,
            number: 'BROUILLON',
            client_id: defaultClient?.id || '',
            clientName: defaultClient?.name || ''
        });
        setViewMode('edit');
    };

    const handleImportMissions = () => {
        if (!selectedMissionIds.length) return;

        const missionsToImport = missions.filter(m => selectedMissionIds.includes(m.id));
        const newItems: InvoiceItem[] = missionsToImport.map(m => ({
            mission_id: m.id,
            description: `Mission #${m.missionNumber || m.id.slice(0, 8)} : ${m.departure} - ${m.destination}`,
            quantity: 1,
            unit_price: m.agreed_price_ttc || (m as any).price || 0, // Fallback
            trajet: `${m.departure} - ${m.destination}`,
            pref_p: 'ABLL',
            piece_no: m.piece_number || m.pieceNumber || m.waybill_number || `P-${m.missionNumber || 'XXX'}`,
            devise: 'TND'
        }));

        setCurrentInvoice(prev => ({
            ...prev,
            items: [...(prev?.items || []), ...newItems]
        }));

        setImportModalOpen(false);
        setSelectedMissionIds([]);
    };

    const handleSave = () => {
        if (!currentInvoice?.client_id || !currentInvoice.items?.length) {
            alert("Veuillez sélectionner un client et ajouter des lignes.");
            return;
        }

        // Save custom trips
        currentInvoice.items.forEach(item => {
            if (item.trajet) {
                saveCustomTrip(item.trajet);
            }
        });

        const totals = calculateInvoiceTotals(currentInvoice);

        // Auto-Validation Logic
        const isNew = !invoices.find(i => i.id === currentInvoice.id);
        const invoiceNumber = currentInvoice.number && currentInvoice.number !== 'BROUILLON' ? currentInvoice.number : generateInvoiceNumber();

        // Get client name for the invoice
        const selectedClient = clients.find(c => c.id === currentInvoice.client_id);
        const clientName = selectedClient?.name || currentInvoice.clientName || 'Client Inconnu';

        const updatedInvoice = {
            ...currentInvoice,
            clientName: clientName,
            items: currentInvoice.items || [],
            ...totals,
            status: InvoiceStatus.VALIDATED,
            number: invoiceNumber
        } as Invoice;

        // Validation for date
        if (!updatedInvoice.date) {
            alert("La date est obligatoire.");
            return;
        }
        
        // Ensure due_date is set
        if (!updatedInvoice.due_date) {
            // Default to 30 days from invoice date
            const invoiceDate = new Date(updatedInvoice.date);
            const dueDate = new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000);
            updatedInvoice.due_date = dueDate.toISOString().split('T')[0];
        }

        const handleSuccess = () => {
            // Trigger Financial Engine (TVA) immediately
            if (isNew) {
                tvaEngine.logOperation(
                    'COLLECTEE',
                    updatedInvoice.total_ht,
                    updatedInvoice.tva_rate,
                    `FACTURE-${updatedInvoice.number}`,
                    new Date(updatedInvoice.date)
                );
            }

            // Mark Linked Missions as BILLED
            updatedInvoice.items.forEach(item => {
                if (item.mission_id) {
                    const mission = missions.find(m => m.id === item.mission_id);
                    if (mission && mission.status !== MissionStatus.BILLED) {
                        updateMissionMutation.mutate({ ...mission, status: MissionStatus.BILLED } as any);
                    }
                }
            });

            refreshData();
            alert(isNew ? "Facture enregistrée avec succès !" : "Facture modifiée avec succès !");
            setViewMode('list');
        };

        const handleError = (error: any) => {
            console.error("Erreur facture complète:", error);
            console.error("Invoice data:", updatedInvoice);
            console.error("Stack:", error.stack);
            alert("Erreur lors de l'enregistrement : " + (error.message || JSON.stringify(error) || "Inconnue"));
        };

        // Persist via Mutation
        if (isNew) {
            addInvoiceMutation.mutate(updatedInvoice, {
                onSuccess: handleSuccess,
                onError: handleError
            });
        } else {
            updateInvoiceMutation.mutate(updatedInvoice, {
                onSuccess: (data) => handleSuccess(), // onSuccess returns data for update
                onError: handleError
            });
        }
    };

    const handleMarkPaid = (invoice: Invoice) => {
        if (!confirm("Confirmer le paiement de cette facture ?")) return;

        const updated = { ...invoice, status: InvoiceStatus.PAID };
        updateInvoiceMutation.mutate(updated, {
            onSuccess: () => {
                // Record Cash In
                coreAccounting.recordTransaction(
                    'RECETTE',
                    updated.net_to_pay, // Cash In is Net to Pay (after RS)
                    'Vente Transport',
                    'FACTURE',
                    updated.id,
                    `Paiement Facture ${updated.number} - ${(updated as any).clientName} `
                );
                refreshData(); // Sync Financial Engine
            }
        });
    };



    const handleAddItem = () => {
        if (!currentInvoice) return;
        const newItem: InvoiceItem = { description: '', quantity: 1, unit_price: 0 };
        setCurrentInvoice({
            ...currentInvoice,
            items: [...(currentInvoice.items || []), newItem]
        });
    };

    const handleUpdateItem = (index: number, field: string, value: any) => {
        if (!currentInvoice?.items) return;
        const newItems = [...currentInvoice.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setCurrentInvoice({ ...currentInvoice, items: newItems });
    };

    const handleRemoveItem = (index: number) => {
        if (!currentInvoice?.items) return;
        const newItems = currentInvoice.items.filter((_, i) => i !== index);
        setCurrentInvoice({ ...currentInvoice, items: newItems });
    };

    // --- Sub-Components ---

    const StatusBadge = ({ status }: { status: string }) => {
        const styles = {
            [InvoiceStatus.DRAFT]: 'bg-gray-100 text-gray-800',
            [InvoiceStatus.VALIDATED]: 'bg-blue-100 text-blue-800',
            [InvoiceStatus.PAID]: 'bg-green-100 text-green-800',
            [InvoiceStatus.CANCELLED]: 'bg-red-100 text-red-800',
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${(styles as any)[status] || 'bg-gray-100'}`}>
                {status}
            </span>
        );
    };

    // --- Views ---

    const [monthlyPreviewMode, setMonthlyPreviewMode] = useState(false);

    const renderMonthlyView = () => {
        const filteredInvoices = invoices.filter(inv => inv.date.startsWith(selectedMonth) && inv.status !== InvoiceStatus.CANCELLED);

        // Flatten items for the detailed table
        const allItems = filteredInvoices.flatMap(inv => (inv.items || []).map(item => {
            const ht = item.quantity * item.unit_price;
            const tva = ht * (inv.tva_rate / 100);
            const ttc = ht + tva;
            return {
                ...item,
                invoiceDate: inv.date,
                invoiceNumber: inv.number,
                ht,
                ttc
            };
        }));

        // Calculate totals for the Monthly Statement (Single Invoice logic)
        const rawTotals = filteredInvoices.reduce((acc, inv) => ({
            ht: acc.ht + inv.total_ht,
            tva: acc.tva + inv.tva_amount,
            // rs: acc.rs + (inv.rs_amount || 0) // We calculate RS globally based on toggle
        }), { ht: 0, tva: 0 });

        const monthlyTimbre = TAX_CONFIG.TIMBRE_FISCAL; // Fixed 1.000 for the global invoice
        const monthlyTTC = rawTotals.ht + rawTotals.tva + monthlyTimbre;

        const monthlyRS = monthlyApplyRS ? monthlyTTC * 0.01 : 0;
        const monthlyNet = monthlyTTC - monthlyRS;

        // Handler pour générer le PDF mensuel
        const handleGenerateMonthlyPDF = () => {
            generateMonthlyInvoicePDF({
                selectedMonth,
                items: allItems,
                totals: {
                    ht: rawTotals.ht,
                    tva: rawTotals.tva,
                    timbre: monthlyTimbre,
                    ttc: monthlyTTC,
                    rs: monthlyRS,
                    net: monthlyNet
                },
                applyRS: monthlyApplyRS
            });
        };

        if (monthlyPreviewMode) {
            // Preview of the Global Monthly Invoice
            return (
                <div className="max-w-4xl mx-auto space-y-4">
                    <div className="flex items-center justify-between no-print">
                        <button onClick={() => setMonthlyPreviewMode(false)} className="text-gray-500 hover:text-gray-700 flex items-center">
                            <ArrowLeft size={16} className="mr-1" /> Retour au tableau
                        </button>
                        <div className="flex items-center space-x-4">
                            <label className="flex items-center text-sm text-gray-700 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    className="mr-2 rounded border-gray-300"
                                    checked={monthlyApplyRS}
                                    onChange={(e) => setMonthlyApplyRS(e.target.checked)}
                                />
                                Appliquer Retenue à la Source (1%)
                            </label>
                            <button className="bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center shadow-sm hover:bg-gray-900">
                                <Printer size={16} className="mr-2" /> Imprimer
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-12 shadow-lg border border-gray-200 min-h-[800px] relative">
                        {/* Header */}
                        <div className="flex justify-between mb-12">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800 uppercase tracking-widest">Facture Mensuelle</h1>
                                <p className="text-gray-500 mt-2">Période : {selectedMonth}</p>
                                <p className="text-sm text-gray-500">Date d'émission : {new Date().toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-xl font-bold text-blue-800">TunisFret S.A.R.L</h2>
                                <p className="text-sm text-gray-600">15 Rue de l'Industrie</p>
                                <p className="text-sm text-gray-600">2014 Mégrine, Tunisie</p>
                                <p className="text-sm text-gray-600">MF: 1234567/A/M/000</p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <table className="w-full mb-12">
                            <thead>
                                <tr className="border-b-2 border-gray-800">
                                    <th className="text-left py-3 text-sm font-bold text-gray-600 uppercase">Date</th>
                                    <th className="text-left py-3 text-sm font-bold text-gray-600 uppercase">Trajet / Désignation</th>
                                    <th className="text-center py-3 text-sm font-bold text-gray-600 uppercase">Préf.P</th>
                                    <th className="text-center py-3 text-sm font-bold text-gray-600 uppercase">Pièce N°</th>
                                    <th className="text-center py-3 text-sm font-bold text-gray-600 uppercase">Devise</th>
                                    <th className="text-right py-3 text-sm font-bold text-gray-600 uppercase">Montant HT</th>
                                    <th className="text-right py-3 text-sm font-bold text-gray-600 uppercase">Montant TTC</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {allItems.map((item, i) => (
                                    <tr key={i}>
                                        <td className="py-4 text-gray-600 text-sm">{item.invoiceDate}</td>
                                        <td className="py-4 text-gray-800">
                                            <div className="font-bold">{item.trajet}</div>
                                            <div className="text-sm text-gray-500">{item.description}</div>
                                        </td>
                                        <td className="py-4 text-center text-gray-600 font-mono text-xs">
                                            {item.pref_p || 'ABLL'}
                                        </td>
                                        <td className="py-4 text-center text-gray-600 font-mono text-xs">
                                            {item.piece_no}
                                        </td>
                                        <td className="py-4 text-center text-gray-600 text-xs">
                                            {item.devise || 'TND'}
                                        </td>
                                        <td className="py-4 text-right text-gray-800 font-medium">
                                            {item.ht.toFixed(3)}
                                        </td>
                                        <td className="py-4 text-right text-gray-600 font-medium">
                                            {item.ttc.toFixed(3)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Totals */}
                        <div className="flex justify-end mb-16">
                            <div className="w-64 space-y-3">
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Total HT</span>
                                    <span>{rawTotals.ht.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>TVA (7%)</span>
                                    <span>{rawTotals.tva.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Timbre Fiscal</span>
                                    <span>{monthlyTimbre.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between font-bold text-gray-800 text-lg border-t border-gray-300 pt-2">
                                    <span>Total TTC</span>
                                    <span className="text-blue-600">{monthlyTTC.toFixed(2)} €</span>
                                </div>
                                {monthlyRS > 0 && (
                                    <>
                                        <div className="flex justify-between text-sm text-red-600 mt-2 border-t border-dashed border-gray-300 pt-2">
                                            <span>Retenue Source (1%)</span>
                                            <span>-{monthlyRS.toFixed(2)} €</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-gray-800 text-lg pt-1">
                                            <span>Net à Payer</span>
                                            <span>{monthlyNet.toFixed(2)} €</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="absolute bottom-12 left-12 right-12 text-center border-t border-gray-200 pt-8">
                            <p className="text-xs text-gray-500">
                                TunisFret S.A.R.L - RC: B1122332020 - RIB: 12 345 678 9012345678 99 (BIAT)
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center space-x-4">
                        <h3 className="font-bold text-gray-700">Période :</h3>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="border border-gray-300 rounded-md p-2 text-sm"
                        />
                        <span className="text-sm text-gray-500">
                            {filteredInvoices.length} factures trouvées
                        </span>
                    </div>
                    <div className="flex space-x-4 items-center">
                        <label className="flex items-center text-sm text-gray-700 cursor-pointer">
                            <input
                                type="checkbox"
                                className="mr-2 rounded border-gray-300"
                                checked={monthlyApplyRS}
                                onChange={(e) => setMonthlyApplyRS(e.target.checked)}
                            />
                            Retenue Source (1%)
                        </label>
                        <button
                            onClick={() => setMonthlyPreviewMode(true)}
                            className="text-gray-600 hover:text-blue-600 flex items-center text-sm font-medium border border-gray-300 px-3 py-2 rounded-lg bg-white hover:bg-blue-50"
                        >
                            <Eye size={16} className="mr-2" /> Prévisualiser
                        </button>
                        <button 
                            onClick={handleGenerateMonthlyPDF}
                            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors"
                        >
                            <FileDown size={16} className="mr-2" /> Télécharger PDF
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto max-h-[600px]">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Trajet</th>
                                    <th className="px-6 py-3 text-center font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-6 py-3 text-center font-medium text-gray-500 uppercase">Préf.P</th>
                                    <th className="px-6 py-3 text-center font-medium text-gray-500 uppercase">Pièce N°</th>
                                    <th className="px-6 py-3 text-center font-medium text-gray-500 uppercase">Devise</th>
                                    <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Montant HT</th>
                                    <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Montant TTC</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {allItems.length === 0 ? (
                                    <tr><td colSpan={7} className="p-8 text-center text-gray-400">Aucune donnée pour ce mois.</td></tr>
                                ) : (
                                    allItems.map((row, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 font-medium text-gray-800">{row.trajet || '-'}</td>
                                            <td className="px-6 py-3 text-center text-gray-500">{row.invoiceDate}</td>
                                            <td className="px-6 py-3 text-center font-mono text-xs text-gray-600">{row.pref_p || 'ABLL'}</td>
                                            <td className="px-6 py-3 text-center font-mono text-xs text-gray-600">{row.piece_no || '-'}</td>
                                            <td className="px-6 py-3 text-center text-gray-500">{row.devise || 'TND'}</td>
                                            <td className="px-6 py-3 text-right font-mono text-gray-800">{row.ht.toFixed(3)}</td>
                                            <td className="px-6 py-3 text-right font-mono text-gray-600">{row.ttc.toFixed(3)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-right text-gray-700">TOTAUX GLOBAUX</td>
                                    <td className="px-6 py-4 text-right text-blue-800">{rawTotals.ht.toFixed(3)}</td>
                                    <td className="px-6 py-4 text-right text-blue-800">{monthlyTTC.toFixed(3)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <p className="text-xs text-gray-500 uppercase">Total HT</p>
                        <p className="text-xl font-bold text-gray-800">{rawTotals.ht.toFixed(2)} €</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <p className="text-xs text-gray-500 uppercase">Total TTC</p>
                        <p className="text-xl font-bold text-gray-800">{monthlyTTC.toFixed(2)} €</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <p className="text-xs text-gray-500 uppercase">Timbre Fiscal</p>
                        <p className="text-xl font-bold text-orange-600">{monthlyTimbre.toFixed(2)} €</p>
                    </div>
                    <div className="bg-blue-600 p-4 rounded-xl shadow-md text-white">
                        <p className="text-xs text-blue-100 uppercase">Net à Payer</p>
                        <p className="text-2xl font-bold">{monthlyNet.toFixed(2)} <span className="text-sm">€</span></p>
                    </div>
                </div>
            </div>
        );
    };

    if (viewMode === 'list') {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800">Facturation</h2>
                    <button
                        onClick={handleCreateNew}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center shadow-sm"
                    >
                        <Plus size={16} className="mr-2" />
                        Nouvelle Facture
                    </button>
                </div>

                {/* Sub-Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('individual')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'individual'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } `}
                        >
                            Factures Individuelles
                        </button>
                        <button
                            onClick={() => setActiveTab('monthly')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'monthly'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } `}
                        >
                            Facturation de Mois
                        </button>
                    </nav>
                </div>

                {activeTab === 'monthly' ? renderMonthlyView() : (
                    <div className="space-y-4">
                        {/* Filters Bar */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-end gap-4 animate-in fade-in slide-in-from-top-2">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Filtrer par Trajet</label>
                                <select
                                    className="border border-gray-300 rounded-md p-2 text-sm w-64 bg-white"
                                    value={filterTrip}
                                    onChange={(e) => setFilterTrip(e.target.value)}
                                >
                                    <option value="">Tous les trajets</option>
                                    {allTrips.map((t, i) => <option key={i} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Du</label>
                                <input
                                    type="date"
                                    className="border border-gray-300 rounded-md p-2 text-sm"
                                    value={filterStartDate}
                                    onChange={(e) => setFilterStartDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Au</label>
                                <input
                                    type="date"
                                    className="border border-gray-300 rounded-md p-2 text-sm"
                                    value={filterEndDate}
                                    onChange={(e) => setFilterEndDate(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center space-x-2 pb-0.5 ml-auto">
                                <button
                                    onClick={() => { /* Reactivity handles apply, button is visual reinforcement or could trigger specific fetch if server-side */ }}
                                    className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-900 shadow-sm transition-colors"
                                >
                                    Appliquer
                                </button>
                                <button
                                    onClick={resetFilters}
                                    className="bg-white text-gray-600 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Réinitialiser
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Numéro</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Client</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">BL</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">TTC</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Net à Payer</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Statut</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap sticky right-0 bg-gray-50 shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">Actions</th>
                                        </tr>
                                    </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredInvoices.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <Ban size={48} className="text-gray-300 mb-4" />
                                                    <p className="text-lg font-medium">Aucune facture trouvée</p>
                                                    <p className="text-sm">Essayez de modifier vos critères de recherche.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredInvoices.map((inv) => {
                                            // Récupérer le numéro de BL depuis les missions associées
                                            const waybillNumbers = inv.items
                                                ?.filter(item => item.mission_id)
                                                .map(item => {
                                                    const mission = missions.find(m => m.id === item.mission_id);
                                                    return mission?.waybill_number;
                                                })
                                                .filter((bl): bl is string => !!bl) || [];
                                            const uniqueWaybills = [...new Set(waybillNumbers)];
                                            const waybillDisplay = uniqueWaybills.length > 0 
                                                ? uniqueWaybills.join(', ') 
                                                : (inv.items?.[0]?.piece_no || '-');

                                            return (
                                            <tr key={inv.id} className="hover:bg-gray-50 group">
                                                <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-blue-600">{inv.number}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 max-w-[150px] truncate">{(inv as any).clientName}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{inv.date}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                                                    <span className="font-mono text-xs">{waybillDisplay}</span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs text-right text-gray-900 font-medium">
                                                    {inv.total_ttc?.toFixed(3)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs text-right text-green-700 font-bold">
                                                    {inv.net_to_pay?.toFixed(3)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                                    <StatusBadge status={inv.status} />
                                                </td>
                                                <td className="px-3 py-3 whitespace-nowrap text-center text-sm font-medium sticky right-0 bg-white group-hover:bg-gray-50 shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                                                    <div className="flex justify-center space-x-1 items-center">
                                                        {/* Edit Button - Available for all invoices */}
                                                        <button
                                                            onClick={() => { setCurrentInvoice(inv); setViewMode('edit'); }}
                                                            className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all p-1.5 rounded"
                                                            title="Modifier"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>

                                                        {/* PDF Download - Available for ALL invoices */}
                                                        <button
                                                            onClick={() => generateInvoicePDF(inv, {
                                                                name: "Entreprise Moulahi Mohamed Yahia",
                                                                address: "Rue Habib Thamer - Sbeitla 1250",
                                                                matriculeFiscale: "1234567/A/M/000",
                                                                phone: "+216 99.861.021",
                                                                email: "societemoulahi@gmail.com"
                                                            })}
                                                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-all p-1.5 rounded"
                                                            title="Télécharger PDF"
                                                        >
                                                            <FileDown size={14} />
                                                        </button>

                                                        {/* View/Action Buttons for non-drafts */}
                                                        {inv.status !== InvoiceStatus.DRAFT && (
                                                            <>
                                                                <button
                                                                    onClick={() => { setCurrentInvoice(inv); setViewMode('preview'); }}
                                                                    className="text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all p-1.5 rounded"
                                                                    title="Voir / Imprimer"
                                                                >
                                                                    <Eye size={14} />
                                                                </button>
                                                                {inv.status === InvoiceStatus.VALIDATED && (
                                                                    <button
                                                                        onClick={() => handleMarkPaid(inv)}
                                                                        className="text-green-600 hover:text-green-800 hover:bg-green-50 transition-all p-1.5 rounded"
                                                                        title="Marquer Payée"
                                                                    >
                                                                        <CheckCircle size={14} />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                        
                                                        {/* Delete Button - Visible for all, but with warnings */}
                                                        <button
                                                            onClick={() => {
                                                                // Stronger warning for validated/paid invoices
                                                                const isValidatedOrPaid = inv.status === InvoiceStatus.VALIDATED || inv.status === InvoiceStatus.PAID;
                                                                const message = isValidatedOrPaid 
                                                                    ? `⚠️ ATTENTION : Cette facture est ${inv.status}.\nLa supprimer peut affecter votre comptabilité.\n\nÊtes-vous ABSOLUMENT sûr de vouloir supprimer la facture ${inv.number} ?`
                                                                    : `Êtes-vous sûr de vouloir supprimer la facture ${inv.number} ?`;
                                                                
                                                                if (confirm(message)) {
                                                                    deleteInvoiceMutation.mutate(inv.id, {
                                                                        onSuccess: () => {
                                                                            alert('Facture supprimée avec succès !');
                                                                        },
                                                                        onError: (error: any) => {
                                                                            alert('Erreur lors de la suppression : ' + (error.message || 'Inconnue'));
                                                                        }
                                                                    });
                                                                }
                                                            }}
                                                            className="text-red-600 hover:text-red-800 hover:bg-red-50 transition-all p-1.5 rounded"
                                                            title="Supprimer"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (viewMode === 'edit' && currentInvoice) {
        const totals = calculateInvoiceTotals(currentInvoice);

        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <button onClick={() => setViewMode('list')} className="text-gray-500 hover:text-gray-700 flex items-center">
                        <ArrowLeft size={16} className="mr-1" /> Retour
                    </button>
                    <div className="flex space-x-2">
                        <button
                            onClick={handleSave}
                            disabled={addInvoiceMutation.isPending || updateInvoiceMutation.isPending}
                            className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm ${(addInvoiceMutation.isPending || updateInvoiceMutation.isPending) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Save size={16} className="mr-2" />
                            {(addInvoiceMutation.isPending || updateInvoiceMutation.isPending) ? 'Enregistrement...' : 'Enregistrer'}
                        </button>

                    </div>
                </div>

                <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                    <div className="grid grid-cols-2 gap-8 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                            {!showNewClientForm ? (
                                <div className="flex gap-2">
                                    <select
                                        className="w-full border border-gray-300 rounded-md p-2 text-sm"
                                        value={currentInvoice.client_id || ''}
                                        onChange={(e) => {
                                            if (e.target.value === 'NEW_CLIENT') {
                                                setShowNewClientForm(true);
                                            } else {
                                                const client = clients.find(c => c.id === e.target.value);
                                                setCurrentInvoice({ ...currentInvoice, client_id: e.target.value, clientName: client?.name });
                                            }
                                        }}
                                    >
                                        <option value="">Sélectionner un client...</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        <option value="NEW_CLIENT" className="font-bold text-blue-600">+ Nouveau Client...</option>
                                    </select>
                                </div>
                            ) : (
                                <div className="bg-gray-50 p-3 rounded border border-gray-200 space-y-2">
                                    <p className="text-xs font-bold text-gray-600 uppercase">Nouveau Client</p>
                                    <input
                                        type="text"
                                        placeholder="Nom du Client (ex: STE ABC)"
                                        className="w-full border border-gray-300 rounded-md p-2 text-sm"
                                        value={newClientData.name}
                                        onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            placeholder="Matricule Fiscale"
                                            className="w-full border border-gray-300 rounded-md p-2 text-sm"
                                            value={newClientData.matricule_fiscale}
                                            onChange={(e) => setNewClientData({ ...newClientData, matricule_fiscale: e.target.value })}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Adresse"
                                            className="w-full border border-gray-300 rounded-md p-2 text-sm"
                                            value={newClientData.address}
                                            onChange={(e) => setNewClientData({ ...newClientData, address: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="tel"
                                            placeholder="Téléphone"
                                            className="w-full border border-gray-300 rounded-md p-2 text-sm"
                                            value={newClientData.contact_phone}
                                            onChange={(e) => setNewClientData({ ...newClientData, contact_phone: e.target.value })}
                                        />
                                        <input
                                            type="email"
                                            placeholder="Email"
                                            className="w-full border border-gray-300 rounded-md p-2 text-sm"
                                            value={newClientData.contact_email}
                                            onChange={(e) => setNewClientData({ ...newClientData, contact_email: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                if (newClientData.name) {
                                                    const newId = `C${Math.floor(Math.random() * 10000)}`;
                                                    const newClient = {
                                                        id: newId,
                                                        name: newClientData.name,
                                                        matricule_fiscale: newClientData.matricule_fiscale,
                                                        address: newClientData.address,
                                                        contact_phone: newClientData.contact_phone,
                                                        contact_email: newClientData.contact_email
                                                    };

                                                    addClientMutation.mutate(newClient, {
                                                        onSuccess: () => {
                                                            alert("Client créé avec succès !");
                                                            setShowNewClientForm(false);
                                                            setNewClientData({ name: '', matricule_fiscale: '', address: '', contact_phone: '', contact_email: '' });
                                                            // Auto-select the new client
                                                            setCurrentInvoice({ ...currentInvoice, client_id: newId, clientName: newClient.name });
                                                        },
                                                        onError: (error: any) => {
                                                            alert("Erreur création client: " + error.message);
                                                        }
                                                    });
                                                } else {
                                                    alert("Le nom du client est obligatoire");
                                                }
                                            }}
                                            disabled={addClientMutation.isPending}
                                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium"
                                        >
                                            {addClientMutation.isPending ? "..." : "Ajouter"}
                                        </button>
                                        <button
                                            onClick={() => setShowNewClientForm(false)}
                                            className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-1 rounded text-xs font-medium"
                                        >
                                            Annuler
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date Facture</label>
                                <input type="date" className="w-full border border-gray-300 rounded-md p-2 text-sm"
                                    value={currentInvoice.date}
                                    onChange={(e) => setCurrentInvoice({ ...currentInvoice, date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Échéance</label>
                                <input type="date" className="w-full border border-gray-300 rounded-md p-2 text-sm"
                                    value={currentInvoice.due_date || ''}
                                    onChange={(e) => setCurrentInvoice({ ...currentInvoice, due_date: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="mb-6 overflow-x-auto">
                        <table className="w-full text-sm min-w-[1000px]">
                            <thead className="bg-gray-50 border-y border-gray-200">
                                <tr>
                                    <th className="py-2 text-left pl-2 w-48">Trajet *</th>
                                    <th className="py-2 text-left w-24">Pièce N°</th>
                                    <th className="py-2 text-center w-16">Préf.P</th>
                                    <th className="py-2 text-left w-48">Désignation</th>
                                    <th className="py-2 text-center w-20">Devise</th>
                                    <th className="py-2 w-16 text-center">Qté</th>
                                    <th className="py-2 w-28 text-right">P.U (HT)</th>
                                    <th className="py-2 w-28 text-right">Total (HT)</th>
                                    <th className="py-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {currentInvoice.items?.map((item, idx) => (
                                    <tr key={idx}>
                                        {/* Trajet */}
                                        <td className="py-2 pl-2">
                                            <input
                                                list={`trajets-list-${idx}`}
                                                type="text"
                                                className="w-full border-gray-300 rounded-md text-sm p-1"
                                                value={item.trajet || ''}
                                                placeholder="Ville Départ - Arrivée"
                                                onChange={(e) => handleUpdateItem(idx, 'trajet', e.target.value)}
                                            />
                                            <datalist id={`trajets-list-${idx}`}>
                                                {allTrips.map((t, i) => <option key={i} value={t} />)}
                                            </datalist>
                                        </td>
                                        {/* Pièce N° */}
                                        <td className="py-2">
                                            <input type="text" className="w-full border-gray-300 rounded-md text-sm p-1"
                                                value={item.piece_no || ''}
                                                placeholder="N°..."
                                                onChange={(e) => handleUpdateItem(idx, 'piece_no', e.target.value)}
                                            />
                                        </td>
                                        {/* Préf.P (Fixed) */}
                                        <td className="py-2 text-center">
                                            <input type="text" className="w-full bg-gray-100 text-gray-500 border-gray-300 rounded-md text-sm p-1 text-center cursor-not-allowed"
                                                value="ABLL"
                                                readOnly
                                            />
                                        </td>
                                        {/* Désignation */}
                                        <td className="py-2">
                                            <input type="text" className="w-full border-gray-300 rounded-md text-sm p-1"
                                                value={item.description}
                                                placeholder="Détails..."
                                                onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                                            />
                                        </td>
                                        {/* Devise */}
                                        <td className="py-2">
                                            <select
                                                className="w-full border-gray-300 rounded-md text-sm p-1"
                                                value={item.devise || 'TND'}
                                                onChange={(e) => handleUpdateItem(idx, 'devise', e.target.value)}
                                            >
                                                <option value="TND">TND</option>
                                                <option value="EUR">EUR</option>
                                                <option value="USD">USD</option>
                                            </select>
                                        </td>
                                        {/* Qté */}
                                        <td className="py-2 text-center">
                                            <input type="number" className="w-14 text-center border-gray-300 rounded-md text-sm p-1 mx-auto"
                                                value={item.quantity}
                                                onChange={(e) => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                                            />
                                        </td>
                                        {/* P.U */}
                                        <td className="py-2 text-right">
                                            <input type="number" className="w-24 text-right border-gray-300 rounded-md text-sm p-1 ml-auto"
                                                value={item.unit_price}
                                                onChange={(e) => handleUpdateItem(idx, 'unit_price', Number(e.target.value))}
                                            />
                                        </td>
                                        {/* Total HT */}
                                        <td className="py-2 text-right font-mono text-gray-700 pr-2">
                                            {(item.quantity * item.unit_price).toFixed(3)}
                                        </td>
                                        <td className="py-2 text-center">
                                            <button onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-600">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="flex justify-between items-center mt-2">
                            <button onClick={handleAddItem} className="text-blue-600 text-sm font-medium hover:underline flex items-center">
                                <Plus size={14} className="mr-1" /> Ajouter une ligne
                            </button>
                            <button onClick={() => setImportModalOpen(true)} className="text-green-600 text-sm font-medium hover:underline flex items-center bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                                <Download size={14} className="mr-1" /> Importer Missions Livrées
                            </button>
                        </div>
                    </div>

                    {/* Totals & Options */}
                    <div className="grid grid-cols-2 gap-8 border-t border-gray-200 pt-4">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Taux de TVA</label>
                                <div className="flex space-x-4">
                                    <label className="flex items-center text-sm">
                                        <input type="radio" name="tva" className="mr-2"
                                            checked={currentInvoice.tva_rate === 7}
                                            onChange={() => setCurrentInvoice({ ...currentInvoice, tva_rate: 7 })}
                                        />
                                        7% (Transport)
                                    </label>
                                    <label className="flex items-center text-sm">
                                        <input type="radio" name="tva" className="mr-2"
                                            checked={currentInvoice.tva_rate === 19}
                                            onChange={() => setCurrentInvoice({ ...currentInvoice, tva_rate: 19 })}
                                        />
                                        19% (Services/Autre)
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="flex items-center text-sm text-gray-700">
                                    <input type="checkbox" className="mr-2 rounded border-gray-300"
                                        checked={!!currentInvoice.apply_rs}
                                        onChange={(e) => setCurrentInvoice({ ...currentInvoice, apply_rs: e.target.checked })}
                                    />
                                    Appliquer Retenue à la Source (1%)
                                </label>
                                <p className="text-xs text-gray-500 mt-1 ml-6">Requis pour les factures {'>'} 1000 TND TTC (État/Sociétés).</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Total HT</span>
                                <span className="font-medium">{totals.total_ht.toFixed(2)} TND</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">TVA ({currentInvoice.tva_rate}%)</span>
                                <span className="font-medium">{totals.tva_amount.toFixed(2)} TND</span>
                            </div>
                            {totals.timbre_fiscal > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Timbre Fiscal</span>
                                    <span className="font-medium">{totals.timbre_fiscal.toFixed(2)} TND</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                                <span className="text-gray-800">Total TTC</span>
                                <span className="text-blue-600">{totals.total_ttc.toFixed(2)} TND</span>
                            </div>
                            {totals.rs_amount > 0 && (
                                <div className="flex justify-between text-sm text-red-600 mt-2 border-t border-dashed border-gray-300 pt-2">
                                    <span>Retenue Source (1%)</span>
                                    <span>-{totals.rs_amount.toFixed(2)} TND</span>
                                </div>
                            )}
                            {totals.rs_amount > 0 && (
                                <div className="flex justify-between text-lg font-bold text-gray-800 pt-1">
                                    <span>Net à Payer</span>
                                    <span>{totals.net_to_pay.toFixed(2)} €</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- IMPORT MISSIONS MODAL --- */}
                {
                    isImportModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[85vh] flex flex-col">
                                <div className="bg-green-600 p-4 border-b border-green-700 flex justify-between items-center text-white">
                                    <h3 className="text-lg font-bold flex items-center">
                                        <Download size={20} className="mr-2" /> Importer des Missions Livrées
                                    </h3>
                                    <button onClick={() => setImportModalOpen(false)} className="text-green-100 hover:text-white">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                                    {missions.filter(m => (m.status === MissionStatus.DELIVERED || m.status === MissionStatus.COMPLETED || m.status === MissionStatus.IN_PROGRESS)).length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="bg-gray-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-500">
                                                <Ban size={32} />
                                            </div>
                                            <h3 className="text-lg font-medium text-gray-900">Aucune mission à facturer</h3>
                                            <p className="text-gray-500">Seules les missions avec le statut "Livrée" ou "Terminée" apparaissent ici.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {missions.filter(m => (m.status === MissionStatus.DELIVERED || m.status === MissionStatus.COMPLETED || m.status === MissionStatus.IN_PROGRESS) && !m.invoice_id)
                                                .map((mission) => (
                                                    <div
                                                        key={mission.id}
                                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${selectedMissionIds.includes(mission.id)
                                                            ? 'bg-green-50 border-green-500'
                                                            : 'bg-white border-gray-200 hover:border-green-300'
                                                            }`}
                                                        onClick={() => {
                                                            if (selectedMissionIds.includes(mission.id)) {
                                                                setSelectedMissionIds(prev => prev.filter(id => id !== mission.id));
                                                            } else {
                                                                setSelectedMissionIds(prev => [...prev, mission.id]);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center">
                                                            <div className={`w-5 h-5 rounded border mr-4 flex items-center justify-center ${selectedMissionIds.includes(mission.id)
                                                                ? 'bg-green-600 border-green-600 text-white'
                                                                : 'bg-white border-gray-300'
                                                                }`}>
                                                                {selectedMissionIds.includes(mission.id) && <CheckCircle size={14} />}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-gray-800">Mission #{mission.missionNumber}</p>
                                                                <p className="text-sm text-gray-500">{mission.departure} ➝ {mission.destination}</p>
                                                                <p className="text-xs text-gray-400 mt-1">Client: {mission.client}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-bold text-green-700">{typeof mission.agreed_price_ttc === 'number' ? mission.agreed_price_ttc.toFixed(3) : (mission as any).price || '0.000'} TND</p>
                                                            <p className="text-xs text-gray-500">{mission.date}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 bg-white border-t border-gray-200 flex justify-end space-x-2">
                                    <button onClick={() => setImportModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">Annuler</button>
                                    <button
                                        onClick={handleImportMissions}
                                        disabled={selectedMissionIds.length === 0}
                                        className={`px-4 py-2 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center ${selectedMissionIds.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                                            }`}
                                    >
                                        <Download size={16} className="mr-2" /> Importer Selection ({selectedMissionIds.length})
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >
        );
    }

    if (viewMode === 'preview' && currentInvoice) {
        const client = clients.find(c => c.id === currentInvoice.client_id);
        return (
            <div className="max-w-4xl mx-auto space-y-4 px-2 sm:px-4">
                <div className="flex items-center justify-between no-print">
                    <button onClick={() => setViewMode('list')} className="text-gray-500 hover:text-gray-700 flex items-center px-3 py-2 rounded-lg border border-gray-200">
                        <ArrowLeft size={16} className="mr-1" /> Retour
                    </button>
                    <button className="bg-gray-800 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center shadow-sm hover:bg-gray-900 text-sm sm:text-base">
                        <Printer size={16} className="mr-2" /> Imprimer
                    </button>
                </div>

                {/* Invoice Paper Layout */}
                <div className="bg-white p-4 sm:p-12 shadow-lg border border-gray-200 min-h-[800px] relative">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between gap-4 mb-8 sm:mb-12">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 uppercase tracking-widest">Facture</h1>
                            <p className="text-gray-500 mt-2">N° {currentInvoice.number}</p>
                            <p className="text-sm text-gray-500">Date: {currentInvoice.date}</p>
                        </div>
                        <div className="sm:text-right">
                            <h2 className="text-lg sm:text-xl font-bold text-blue-800">TunisFret S.A.R.L</h2>
                            <p className="text-sm text-gray-600">15 Rue de l'Industrie</p>
                            <p className="text-sm text-gray-600">2014 Mégrine, Tunisie</p>
                            <p className="text-sm text-gray-600">MF: 1234567/A/M/000</p>
                        </div>
                    </div>

                    {/* Client Info */}
                    <div className="mb-8 sm:mb-12 border-l-4 border-blue-600 pl-4 sm:pl-6 py-2">
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Facturer à</p>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-800">{client?.name}</h3>
                        <p className="text-sm sm:text-base text-gray-600">{client?.address}</p>
                        <p className="text-gray-600 text-xs sm:text-sm mt-1">Matricule Fiscale: {client?.matricule_fiscale}</p>
                    </div>

                    {/* Items Table */}
                    <div className="overflow-x-auto mb-8 sm:mb-12 -mx-4 sm:mx-0">
                    <table className="w-full min-w-[600px]">
                        <thead>
                            <tr className="border-b-2 border-gray-800">
                                <th className="text-left py-3 px-2 text-xs sm:text-sm font-bold text-gray-600 uppercase">Trajet / Désignation</th>
                                <th className="text-center py-3 px-2 text-xs sm:text-sm font-bold text-gray-600 uppercase">Préf.P</th>
                                <th className="text-center py-3 px-2 text-xs sm:text-sm font-bold text-gray-600 uppercase">Pièce N°</th>
                                <th className="text-center py-3 px-2 text-xs sm:text-sm font-bold text-gray-600 uppercase">Qté</th>
                                <th className="text-right py-3 px-2 text-xs sm:text-sm font-bold text-gray-600 uppercase">P.U (HT)</th>
                                <th className="text-right py-3 px-2 text-xs sm:text-sm font-bold text-gray-600 uppercase">Total (HT)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {currentInvoice.items?.map((item, i) => (
                                <tr key={i}>
                                    <td className="py-3 px-2 text-gray-800">
                                        <div className="font-bold text-xs sm:text-sm">{item.trajet}</div>
                                        <div className="text-xs text-gray-500">{item.description}</div>
                                    </td>
                                    <td className="py-3 px-2 text-center text-gray-600 font-mono text-xs">
                                        {item.pref_p || 'ABLL'}
                                    </td>
                                    <td className="py-3 px-2 text-center text-gray-600 font-mono text-xs">
                                        {item.piece_no}
                                    </td>
                                    <td className="py-3 px-2 text-center text-gray-600 text-xs sm:text-sm">{item.quantity}</td>
                                    <td className="py-3 px-2 text-right text-gray-600 text-xs sm:text-sm">
                                        {item.unit_price.toFixed(3)}
                                        <span className="text-[10px] ml-1">{item.devise || 'TND'}</span>
                                    </td>
                                    <td className="py-3 px-2 text-right text-gray-800 font-medium text-xs sm:text-sm">
                                        {(item.quantity * item.unit_price).toFixed(3)}
                                        <span className="text-[10px] ml-1">{item.devise || 'TND'}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end mb-12 sm:mb-16">
                        <div className="w-full sm:w-64 space-y-3">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Total HT</span>
                                <span>{currentInvoice.total_ht?.toFixed(2)} €</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>TVA ({currentInvoice.tva_rate}%)</span>
                                <span>{currentInvoice.tva_amount?.toFixed(2)} €</span>
                            </div>
                            {currentInvoice.timbre_fiscal && currentInvoice.timbre_fiscal > 0 ? (
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Timbre Fiscal</span>
                                    <span>{currentInvoice.timbre_fiscal?.toFixed(2)} €</span>
                                </div>
                            ) : null}
                            <div className="flex justify-between font-bold text-gray-800 text-lg border-t border-gray-300 pt-2">
                                <span>Total TTC</span>
                                <span className="text-blue-600">{currentInvoice.total_ttc?.toFixed(2)} €</span>
                            </div>
                            {currentInvoice.rs_amount && currentInvoice.rs_amount > 0 ? (
                                <>
                                    <div className="flex justify-between text-sm text-red-600 mt-2 border-t border-dashed border-gray-300 pt-2">
                                        <span>Retenue Source (1%)</span>
                                        <span>-{currentInvoice.rs_amount?.toFixed(2)} €</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-gray-800 text-lg pt-1">
                                        <span>Net à Payer</span>
                                        <span>{currentInvoice.net_to_pay?.toFixed(2)} €</span>
                                    </div>
                                </>
                            ) : null}
                        </div>
                    </div>

                    {/* Legal Footer */}
                    <div className="mt-8 sm:mt-12 text-center border-t border-gray-200 pt-6 sm:pt-8">
                        <p className="text-[10px] sm:text-xs text-gray-500">
                            Arrêté la présente facture à la somme de : <span className="italic font-medium text-gray-700"> ... (Somme en toutes lettres) ... </span>
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-3 sm:mt-4">
                            TunisFret S.A.R.L - RC: B1122332020 - RIB: 12 345 678 9012345678 99 (BIAT)
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};
