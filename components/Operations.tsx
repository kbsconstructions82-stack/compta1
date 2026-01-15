import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { TRIP_RATES_DEFAULT } from '../constants';
import { Vehicle, Expense, TripRate, Mission, MissionStatus, ExpenseCategory, DriverState, Invoice, InvoiceStatus } from '../types';
import { useAuth } from '../src/hooks/useAuth';
import { useVehicles, useUpdateVehicle } from '../src/hooks/useVehicles';
import { useMissions, useAddMission, useUpdateMission } from '../src/hooks/useMissions';
import { useExpenses, useAddExpense } from '../src/hooks/useExpenses';
import { useEmployees } from '../src/hooks/useEmployees';
import { useTripRates } from '../src/hooks/useTripRates';
import { useUpdateActivity } from '../src/hooks/useActivity';
import { useInvoices, useAddInvoice } from '../src/hooks/useInvoices';
import { NEW_BOX_RATES, FORMATTED_ROUTES, FORMATTED_ROUTES_WITHOUT_PRICE, AVAILABLE_DESTINATIONS, normalizeCity, getClientRate } from '../src/utils/tariffs';

import {
    Layout,
    Truck,
    MapPin,
    Calendar,
    CheckCircle,
    AlertTriangle,
    FileText,
    TrendingUp,
    Plus,
    Filter,
    Search,
    X,
    Save,
    Clock,
    DollarSign,
    MoreVertical,
    Navigation,
    Printer,
    Activity,
    User,
    Package,
    ArrowLeft,
    ArrowRight,
    Edit2,
} from 'lucide-react';


export const Operations: React.FC = () => {

    // --- QUERY HOOKS (Replaces props) ---
    const { currentUser } = useAuth();
    const userRole = currentUser?.role || 'ADMIN';
    const currentUserId = currentUser?.id;

    const { data: vehicles = [] } = useVehicles();
    const { data: missions = [] } = useMissions(); // Fetched from centralized mockData
    const { data: employees = [] } = useEmployees();
    const { data: tripRates = [] } = useTripRates();
    const { data: invoices = [] } = useInvoices(); // Pour générer le numéro de facture séquentiel

    // Trouver le véhicule du chauffeur connecté
    const currentDriver = employees.find(e => e.id === currentUser?.id);
    const userVehicleId = vehicles.find(v => v.matricule === currentDriver?.vehicleMatricule)?.id || '';

    // --- MUTATIONS ---
    const addMissionMutation = useAddMission();
    const updateMissionMutation = useUpdateMission();
    const updateVehicleMutation = useUpdateVehicle();
    const addExpenseMutation = useAddExpense();
    const updateActivityMutation = useUpdateActivity();
    const addInvoiceMutation = useAddInvoice();

    const onAddExpense = (expense: Expense) => addExpenseMutation.mutate(expense);
    const onUpdateVehicle = (vehicle: Vehicle) => updateVehicleMutation.mutate(vehicle);
    const onUpdateActivity = (driverId: string, routeName: string, count: number) => updateActivityMutation.mutate({ driverId, routeName, count });

    // Local state removed, using props
    const [selectedMission, setSelectedMission] = useState<any>(null);
    const [isEditingDriver, setIsEditingDriver] = useState(false);
    const [editDriverId, setEditDriverId] = useState('');

    // Modal States
    const [isIncidentModalOpen, setIncidentModalOpen] = useState(false);
    const [isCloseModalOpen, setCloseModalOpen] = useState(false);
    const [isPlanMissionModalOpen, setPlanMissionModalOpen] = useState(false);

    // Forms
    const [incidentForm, setIncidentForm] = useState({ type: 'Panne Mécanique', description: '', cost: 0, immobilized: false });
    const [closeForm, setCloseForm] = useState({
        date: new Date().toISOString().split('T')[0],
        km: 0,
        note: '',
        hoursWorked: 0,
        hourlyRate: 0,
        calculatedBonus: 0,
        isDelivered: true // New field for delivery status
    });

    const [newMissionForm, setNewMissionForm] = useState({
        client: 'NEW BOX TUNISIA', // Client par défaut
        departure: 'Kairouan', // Départ par défaut changé pour correspondre aux tarifs
        destination: '',
        cargo: '',
        date: new Date().toISOString().split('T')[0],
        vehicleId: '',
        driverId: (userRole === 'CHAUFFEUR' && currentUser?.id) ? currentUser.id : '', // Auto-assigner le chauffeur si rôle CHAUFFEUR
        price: 0, // Prix HT qui sera rempli automatiquement depuis le tarif (masqué pour les chauffeurs)
        waybillNumber: '', // Numéro de BL (Bon de Livraison)
        waybillDate: '', // Date de BL (Bon de Livraison)
        pieceNumber: '' // Pièce N° (référence pièce pour facture, distincte du BL)
    });

    // Mettre à jour driverId si le rôle est CHAUFFEUR lors de l'ouverture du modal
    useEffect(() => {
        if (isPlanMissionModalOpen && userRole === 'CHAUFFEUR' && currentUser?.id && newMissionForm.driverId !== currentUser.id) {
            setNewMissionForm(prev => ({ ...prev, driverId: currentUser.id }));
        }
    }, [isPlanMissionModalOpen, userRole, currentUser?.id]);

    // Auto-remplir le vehicleId pour les chauffeurs
    useEffect(() => {
        if (isPlanMissionModalOpen && userRole === 'CHAUFFEUR' && userVehicleId && newMissionForm.vehicleId !== userVehicleId) {
            setNewMissionForm(prev => ({ ...prev, vehicleId: userVehicleId }));
        }
    }, [isPlanMissionModalOpen, userRole, userVehicleId]);





    // Detect rate when opening close modal
    useEffect(() => {
        if (isCloseModalOpen && selectedMission) {
            // Logic to find rate based on destination keyword
            const dest = selectedMission.destination.toLowerCase();
            const dep = selectedMission.departure.toLowerCase();
            let foundRate = 0;

            // Try to find exact match in tripRates prop
            const exactRoute = tripRates.find(r => r.departure.toLowerCase() === dep && r.destination.toLowerCase() === dest);

            if (exactRoute) {
                foundRate = exactRoute.truck_price;
            } else {
                // Fallback: Simple keyword matching against constants if no exact match found
                const rateConfig = TRIP_RATES_DEFAULT.find(r => dest.includes(r.destination.toLowerCase()));
                if (rateConfig) {
                    foundRate = rateConfig.truck_price;
                } else if (dest.includes('sousse') || dest.includes('monastir')) {
                    foundRate = 20; // Sahel
                } else if (dest.includes('gabes') || dest.includes('gafsa') || dest.includes('sud')) {
                    foundRate = 50; // Sud
                }
            }

            setCloseForm(prev => ({ ...prev, hourlyRate: foundRate, isDelivered: false })); // Force reset to false
        }
    }, [isCloseModalOpen, selectedMission, tripRates]);

    // Recalculate bonus when hours or rate changes
    useEffect(() => {
        setCloseForm(prev => ({
            ...prev,
            calculatedBonus: prev.hoursWorked * prev.hourlyRate
        }));
    }, [closeForm.hoursWorked, closeForm.hourlyRate]);


    const getVehicle = (id: string) => vehicles.find(v => v.id === id);
    const getDriver = (id: string) => employees.find(d => d.id === id);

    const handleSubmitIncident = () => {
        if (!selectedMission) return;

        // 1. Create Expense if cost > 0
        if (incidentForm.cost > 0 && onAddExpense) {
            onAddExpense({
                category: ExpenseCategory.MAINTENANCE,
                amount_ht: incidentForm.cost,
                tva_amount: incidentForm.cost * 0.19,
                amount_ttc: incidentForm.cost * 1.19,
                tva_rate: 19,
                is_deductible: true,
                date: new Date().toISOString().split('T')[0],
                description: `Incident Mission ${selectedMission.missionNumber}: ${incidentForm.type}`,
                vehicle_id: selectedMission.vehicleId,
                payment_status: 'Unpaid'
            } as any);
        }

        // 2. Update Status
        if (incidentForm.immobilized) {
            const updated = { ...selectedMission, status: MissionStatus.INCOMPLETE };
            updateMissionMutation.mutate(updated, {
                onError: (error: any) => {
                    console.error("Erreur incident:", error);
                    alert("Erreur lors de la mise à jour : " + (error.message || "Inconnue"));
                }
            });
            setSelectedMission(updated);
        }

        alert("Incident signalé avec succès.");
        setIncidentModalOpen(false);
        setIncidentForm({ type: 'Panne Mécanique', description: '', cost: 0, immobilized: false });
    };


    const handleSubmitClose = () => {
        if (!selectedMission) return;

        const newStatus = closeForm.isDelivered ? MissionStatus.DELIVERED : MissionStatus.INCOMPLETE;
        const updated = { ...selectedMission, status: newStatus };
        updateMissionMutation.mutate(updated, {
            onError: (error: any) => {
                console.error("Erreur clôture:", error);
                alert("Erreur lors de la clôture : " + (error.message || "Inconnue"));
            }
        });
        setSelectedMission(updated);
        setCloseModalOpen(false);

        // --- GÉNÉRATION AUTOMATIQUE DE FACTURE POUR TOUTES LES MISSIONS LIVRÉES ---
        if (closeForm.isDelivered && selectedMission.departure && selectedMission.destination) {
            import('../src/utils/tariffs').then(async ({ getClientRate }) => {
                // Normaliser les villes pour la recherche (kairouan en minuscules)
                const dep = selectedMission.departure.toLowerCase().trim();
                const dest = selectedMission.destination.toLowerCase().trim();

                // Chercher le tarif dans la table (normalise automatiquement)
                const rate = getClientRate(selectedMission.client || '', dep, dest);

                if (rate && rate > 0) {
                    // Utiliser "NEW BOX TUNISIA" comme client par défaut si vide ou générique
                    const defaultClientName = 'NEW BOX TUNISIA';
                    let clientId = selectedMission.client_id || '';
                    let clientName = selectedMission.client || '';

                    // Normaliser le nom du client : utiliser "NEW BOX TUNISIA" si vide ou générique
                    if (!clientName || clientName.trim() === '' || clientName.trim().toLowerCase() === 'client' || clientName.trim() === 'Client') {
                        clientName = defaultClientName;
                        console.log(`ℹ️ Client vide ou générique détecté, utilisation du client par défaut: ${defaultClientName}`);
                    } else {
                        clientName = clientName.trim();
                    }

                    // Chercher ou créer le client dans la table companies
                    if (!clientId) {
                        try {
                            const { supabase } = await import('../src/lib/supabase');
                            const { getValidTenantUUID, cacheTenantUUID } = await import('../src/utils/tenantUtils');
                            const tenantUUID = await getValidTenantUUID(currentUser?.tenant_id);

                            if (!tenantUUID) {
                                alert(`⚠️ Problème de tenant UUID. Veuillez créer le client "${clientName}" manuellement dans le module Facturation.`);
                                return;
                            }

                            cacheTenantUUID(tenantUUID);

                            // Chercher le client par nom dans la table companies
                            const { data: existingClient, error: searchError } = await supabase
                                .from('companies')
                                .select('id')
                                .eq('name', clientName)
                                .eq('is_client', true)
                                .maybeSingle();

                            if (existingClient?.id) {
                                clientId = existingClient.id;
                                console.log(`✅ Client trouvé: ${clientName} (ID: ${clientId})`);
                            } else if (!searchError || searchError.code === 'PGRST116') {
                                // Client n'existe pas, le créer automatiquement
                                console.log(`⚠️ Client non trouvé, création automatique: ${clientName}`);

                                // Générer un ID manuel au format C{timestamp}_{random}
                                // Le schéma companies.id est TEXT PRIMARY KEY sans DEFAULT, donc on doit fournir l'ID
                                const generatedClientId = `C${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

                                const { data: newClient, error: createError } = await supabase
                                    .from('companies')
                                    .insert([{
                                        id: generatedClientId, // ID manuel requis (TEXT PRIMARY KEY sans DEFAULT)
                                        name: clientName,
                                        tenant_id: tenantUUID,
                                        is_client: true,
                                        is_supplier: false
                                    }])
                                    .select('id')
                                    .single();

                                if (newClient?.id) {
                                    clientId = newClient.id;
                                    console.log(`✅ Client créé automatiquement: ${clientName} (ID: ${clientId})`);
                                } else if (createError) {
                                    console.error('Erreur création client:', createError);
                                    alert(`⚠️ Impossible de créer le client automatiquement.\n` +
                                        `Client: ${clientName}\n` +
                                        `Erreur: ${createError.message}\n\n` +
                                        `Veuillez créer le client manuellement dans le module Facturation avant de générer la facture.`);
                                    return;
                                }
                            } else {
                                console.error('Erreur recherche client:', searchError);
                                alert(`⚠️ Erreur lors de la recherche du client.\n` +
                                    `Client: ${clientName}\n` +
                                    `Erreur: ${searchError.message}\n\n` +
                                    `Veuillez créer le client manuellement dans le module Facturation.`);
                                return;
                            }
                        } catch (err: any) {
                            console.error('Erreur lors de la recherche/création du client:', err);
                            alert(`⚠️ Erreur lors de la gestion du client.\n` +
                                `Client: ${clientName}\n` +
                                `Erreur: ${err.message || 'Erreur inconnue'}\n\n` +
                                `Veuillez créer le client "${defaultClientName}" manuellement dans le module Facturation.`);
                            return;
                        }
                    }

                    if (!clientId) {
                        alert(`⚠️ Impossible de déterminer un ID client pour: ${clientName}\n\n` +
                            `Veuillez créer le client "${defaultClientName}" manuellement dans le module Facturation avant de générer la facture.`);
                        return;
                    }

                    // Générer le numéro de facture séquentiel (format: FAC-YYYY-XXX)
                    const year = new Date().getFullYear();
                    // Compter les factures de l'année en cours pour générer le numéro séquentiel
                    const invoicesThisYear = invoices.filter(inv =>
                        inv.number && inv.number.includes(`FAC-${year}`) && inv.status !== InvoiceStatus.DRAFT && inv.status !== InvoiceStatus.CANCELLED
                    ).length;
                    const invoiceNumber = `FAC-${year}-${String(invoicesThisYear + 1).padStart(3, '0')}`;

                    // Calculer les montants avec TVA Transport 7%
                    const totalHT = rate;
                    const tvaRate = 7; // TVA Transport en Tunisie (régime réel)
                    const tvaAmount = totalHT * (tvaRate / 100);
                    const timbreFiscal = 1.000; // Timbre fiscal obligatoire
                    const totalTTC = totalHT + tvaAmount + timbreFiscal;

                    // Créer la facture avec statut "Validée" directement
                    const newInvoice: Invoice = {
                        id: '', // Sera généré par le backend
                        number: invoiceNumber,
                        client_id: clientId, // Utiliser l'ID trouvé ou créé
                        clientName: clientName,
                        date: closeForm.date || new Date().toISOString().split('T')[0],
                        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +30 jours
                        status: InvoiceStatus.VALIDATED, // Validation automatique
                        items: [
                            {
                                id: `item-${Date.now()}`,
                                description: `Transport de marchandises : ${selectedMission.departure} → ${selectedMission.destination}`,
                                quantity: 1,
                                unit_price: totalHT,
                                trajet: `${selectedMission.departure} - ${selectedMission.destination}`,
                                mission_id: selectedMission.id,
                                piece_no: selectedMission.piece_number || selectedMission.pieceNumber || selectedMission.waybill_number || selectedMission.missionNumber || `P-AUTO-${Date.now()}`,
                                devise: 'TND'
                            }
                        ],
                        total_ht: totalHT,
                        tva_rate: tvaRate,
                        tva_amount: tvaAmount,
                        timbre_fiscal: timbreFiscal,
                        apply_rs: false, // Par défaut, peut être activé manuellement après
                        rs_rate: 0,
                        rs_amount: 0,
                        total_ttc: totalTTC,
                        net_to_pay: totalTTC
                    };

                    // Ajouter la facture automatiquement
                    addInvoiceMutation.mutate(newInvoice, {
                        onSuccess: (invoice) => {
                            // Mettre à jour la mission avec l'ID de la facture créée
                            if (invoice?.id) {
                                const missionWithInvoice = {
                                    ...selectedMission,
                                    invoice_id: invoice.id,
                                    status: newStatus
                                };
                                updateMissionMutation.mutate(missionWithInvoice);
                            }

                            alert(`✅ Facture automatique générée!\n` +
                                `Numéro: ${invoiceNumber}\n` +
                                `Client: ${clientName}\n` +
                                `Trajet: ${selectedMission.departure} → ${selectedMission.destination}\n` +
                                `Montant HT: ${totalHT.toFixed(3)} TND\n` +
                                `TVA (7%): ${tvaAmount.toFixed(3)} TND\n` +
                                `Total TTC: ${totalTTC.toFixed(3)} TND`);
                        },
                        onError: (e: any) => {
                            console.error("Erreur génération facture automatique:", e);
                            alert(`❌ Erreur lors de la génération de la facture: ${e.message || 'Erreur inconnue'}`);
                        }
                    });
                } else {
                    console.warn(`⚠️ Aucun tarif trouvé pour le trajet: ${dep} → ${dest}`);
                    alert(`⚠️ Aucun tarif trouvé pour ce trajet.\n` +
                        `Départ: ${selectedMission.departure}\n` +
                        `Arrivée: ${selectedMission.destination}\n\n` +
                        `La facture devra être créée manuellement dans le module Facturation.`);
                }
            });
        }
        // --------------------------------------------

        // Logic: Update Vehicle Odometer
        if (closeForm.km && onUpdateVehicle) {
            const vehicle = vehicles.find(v => v.id === selectedMission.vehicleId);
            if (vehicle) {
                const updatedVehicle = { ...vehicle, mileage: closeForm.km } as any;
                onUpdateVehicle(updatedVehicle);
            }
        }

        // --- AJOUT AUTOMATIQUE DE LA PRIME DE TRAJET POUR LE CHAUFFEUR ---
        if (onUpdateActivity && selectedMission.driverId && closeForm.isDelivered) {
            import('../src/utils/tariffs').then(({ getEmployeeRate }) => {
                // Normaliser les villes (convertir en minuscules pour la recherche)
                const dep = (selectedMission.departure || '').toLowerCase().trim();
                const dest = (selectedMission.destination || '').toLowerCase().trim();

                // Obtenir la prime automatiquement depuis la table des tarifs
                const bonus = getEmployeeRate(dep, dest);

                if (bonus > 0) {
                    // Formater le nom de la route pour la cohérence (départ - destination)
                    const routeName = `${selectedMission.departure || dep} - ${selectedMission.destination || dest}`;

                    // Mettre à jour l'activité du chauffeur (ajoute 1 trajet pour ce mois)
                    onUpdateActivity(selectedMission.driverId, routeName, 1);

                    console.log(`✅ Prime de trajet ajoutée: ${bonus} TND pour ${routeName}`);

                    // Ne pas afficher d'alert ici pour ne pas spammer, mais logger
                    // L'utilisateur verra la prime dans le module Paie
                } else {
                    // Si aucune prime trouvée automatiquement, essayer avec la valeur manuelle du formulaire
                    if (closeForm.hourlyRate > 0) {
                        const routeName = `${selectedMission.departure || dep} - ${selectedMission.destination || dest}`;
                        onUpdateActivity(selectedMission.driverId, routeName, 1);
                        console.log(`⚠️ Prime manuelle utilisée: ${closeForm.hourlyRate} TND pour ${routeName}`);
                    } else {
                        console.warn(`⚠️ Aucune prime trouvée pour le trajet: ${dep} → ${dest}`);
                        alert(`⚠️ Aucune prime de trajet trouvée automatiquement pour:\n` +
                            `Départ: ${selectedMission.departure}\n` +
                            `Arrivée: ${selectedMission.destination}\n\n` +
                            `La prime devra être ajoutée manuellement dans le module Paie.`);
                    }
                }
            });
        }
        // --------------------------------------------
    };

    // Fonction helper pour générer automatiquement la facture et la prime
    // Cette fonction met à jour automatiquement la mission avec le statut DELIVERED après génération de la facture
    const generateInvoiceAndBonus = async (mission: any, isDelivered: boolean = true): Promise<void> => {
        if (!isDelivered || !mission.departure || !mission.destination) {
            return Promise.resolve();
        }

        // Génération de facture
        const { getClientRate } = await import('../src/utils/tariffs');
        const dep = mission.departure.toLowerCase().trim();
        const dest = mission.destination.toLowerCase().trim();
        const rate = getClientRate(mission.client || '', dep, dest);

        if (rate && rate > 0) {
            const defaultClientName = 'NEW BOX TUNISIA';
            let clientId = mission.client_id || '';
            let clientName = mission.client || '';

            if (!clientName || clientName.trim() === '' || clientName.trim().toLowerCase() === 'client' || clientName.trim() === 'Client') {
                clientName = defaultClientName;
            } else {
                clientName = clientName.trim();
            }

            // Chercher ou créer le client
            if (!clientId) {
                try {
                    const { supabase } = await import('../src/lib/supabase');
                    const { getValidTenantUUID, cacheTenantUUID } = await import('../src/utils/tenantUtils');
                    const tenantUUID = await getValidTenantUUID(currentUser?.tenant_id);

                    if (!tenantUUID) {
                        console.error('⚠️ Problème de tenant UUID pour génération facture');
                        return Promise.reject(new Error('Problème de tenant UUID'));
                    }

                    cacheTenantUUID(tenantUUID);

                    const { data: existingClient } = await supabase
                        .from('companies')
                        .select('id')
                        .eq('name', clientName)
                        .eq('is_client', true)
                        .maybeSingle();

                    if (existingClient?.id) {
                        clientId = existingClient.id;
                    } else {
                        const generatedClientId = `C${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
                        const { data: newClient } = await supabase
                            .from('companies')
                            .insert([{
                                id: generatedClientId,
                                name: clientName,
                                tenant_id: tenantUUID,
                                is_client: true,
                                is_supplier: false
                            }])
                            .select('id')
                            .single();

                        if (newClient?.id) {
                            clientId = newClient.id;
                        }
                    }
                } catch (err: any) {
                    console.error('Erreur lors de la gestion du client:', err);
                    return Promise.reject(err);
                }
            }

            if (!clientId) {
                return Promise.reject(new Error('Impossible de déterminer un ID client'));
            }

            // Générer le numéro de facture
            const year = new Date().getFullYear();
            const invoicesThisYear = invoices.filter(inv =>
                inv.number && inv.number.includes(`FAC-${year}`) && inv.status !== InvoiceStatus.DRAFT && inv.status !== InvoiceStatus.CANCELLED
            ).length;
            const invoiceNumber = `FAC-${year}-${String(invoicesThisYear + 1).padStart(3, '0')}`;

            // Calculer les montants
            const totalHT = rate;
            const tvaRate = 7;
            const tvaAmount = totalHT * (tvaRate / 100);
            const timbreFiscal = 1.000;
            const totalTTC = totalHT + tvaAmount + timbreFiscal;

            // Créer la facture
            const newInvoice: Invoice = {
                id: '',
                number: invoiceNumber,
                client_id: clientId,
                clientName: clientName,
                date: new Date().toISOString().split('T')[0],
                due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: InvoiceStatus.VALIDATED,
                items: [{
                    id: `item-${Date.now()}`,
                    description: `Transport de marchandises : ${mission.departure} → ${mission.destination}`,
                    quantity: 1,
                    unit_price: totalHT,
                    trajet: `${mission.departure} - ${mission.destination}`,
                    mission_id: mission.id,
                    piece_no: mission.piece_number || mission.pieceNumber || mission.waybill_number || mission.missionNumber || `P-AUTO-${Date.now()}`,
                    devise: 'TND'
                }],
                total_ht: totalHT,
                tva_rate: tvaRate,
                tva_amount: tvaAmount,
                timbre_fiscal: timbreFiscal,
                apply_rs: false,
                rs_rate: 0,
                rs_amount: 0,
                total_ttc: totalTTC,
                net_to_pay: totalTTC
            };

            return new Promise<void>((resolve, reject) => {
                addInvoiceMutation.mutate(newInvoice, {
                    onSuccess: (invoice) => {
                        if (invoice?.id) {
                            // Générer la prime du chauffeur en parallèle (avant de mettre à jour la mission)
                            if (onUpdateActivity && mission.driverId) {
                                import('../src/utils/tariffs').then(({ getEmployeeRate }) => {
                                    const bonus = getEmployeeRate(dep, dest);
                                    if (bonus > 0) {
                                        const routeName = `${mission.departure || dep} - ${mission.destination || dest}`;
                                        onUpdateActivity(mission.driverId, routeName, 1);
                                        console.log(`✅ Prime de trajet ajoutée: ${bonus} TND pour ${routeName}`);
                                    }
                                }).catch(err => {
                                    console.warn('⚠️ Erreur lors de l\'ajout de la prime:', err);
                                });
                            }

                            // Mettre à jour la mission avec l'ID de la facture et le statut DELIVERED
                            const missionWithInvoice = {
                                ...mission,
                                invoice_id: invoice.id,
                                status: MissionStatus.DELIVERED
                            };
                            updateMissionMutation.mutate(missionWithInvoice, {
                                onSuccess: () => {
                                    setSelectedMission(missionWithInvoice);
                                    console.log(`✅ Facture automatique générée: ${invoiceNumber}`);
                                    console.log(`✅ Mission livrée avec statut: DELIVERED`);
                                    // La Promise est résolue ici, le message sera affiché dans handleStartMission
                                    resolve();
                                },
                                onError: (updateError: any) => {
                                    console.error("Erreur mise à jour mission:", updateError);
                                    reject(updateError);
                                }
                            });
                        } else {
                            reject(new Error('Facture générée mais ID manquant'));
                        }
                    },
                    onError: (e: any) => {
                        console.error("Erreur génération facture:", e);
                        reject(e);
                    }
                });
            });
        } else {
            // Si aucun tarif trouvé, ajouter quand même la prime si possible, et marquer la mission comme livrée
            // (la facture devra être créée manuellement dans le module Facturation)
            if (onUpdateActivity && mission.driverId) {
                const { getEmployeeRate } = await import('../src/utils/tariffs');
                const bonus = getEmployeeRate(dep, dest);
                if (bonus > 0) {
                    const routeName = `${mission.departure || dep} - ${mission.destination || dest}`;
                    onUpdateActivity(mission.driverId, routeName, 1);
                    console.log(`✅ Prime de trajet ajoutée: ${bonus} TND pour ${routeName}`);
                }
            }
            console.warn(`⚠️ Aucun tarif trouvé pour le trajet: ${dep} → ${dest}`);
            // Marquer la mission comme livrée même sans facture (la facture devra être créée manuellement)
            return new Promise<void>((resolve) => {
                const missionDelivered = { ...mission, status: MissionStatus.DELIVERED };
                updateMissionMutation.mutate(missionDelivered, {
                    onSuccess: () => {
                        setSelectedMission(missionDelivered);
                        resolve();
                    },
                    onError: (error: any) => {
                        console.error("Erreur mise à jour mission (sans facture):", error);
                        resolve(); // Résoudre quand même pour ne pas bloquer
                    }
                });
            });
        }
    };

    const handleStartMission = async () => {
        if (!selectedMission) return;

        // Date Check
        const today = new Date().setHours(0, 0, 0, 0);
        const missionDate = new Date(selectedMission.date).setHours(0, 0, 0, 0);

        if (missionDate > today) {
            alert("Impossible de démarrer une mission future.");
            return;
        }

        // Pour les chauffeurs : démarrage = livraison directe + facture + prime automatiques
        if (userRole === 'CHAUFFEUR') {
            // Générer directement la facture et la prime (le statut sera mis à DELIVERED dans generateInvoiceAndBonus)
            generateInvoiceAndBonus(selectedMission, true).then(() => {
                // Succès : message de confirmation
                alert("✅ Mission livrée avec succès !\n\n" +
                    "• La facture a été générée automatiquement\n" +
                    "• Votre prime de trajet a été ajoutée\n" +
                    "• Consultez le module Paie pour voir votre prime");
            }).catch((error) => {
                console.error("Erreur lors de la livraison automatique:", error);
                alert(`❌ Erreur lors de la livraison automatique:\n${error.message || "Erreur inconnue"}\n\nLa mission n'a pas été livrée.`);
            });
        } else {
            // Pour les autres rôles : comportement normal (démarrage seulement)
            const updated = { ...selectedMission, status: MissionStatus.IN_PROGRESS };
            updateMissionMutation.mutate(updated, {
                onError: (error: any) => {
                    console.error("Erreur démarrage:", error);
                    alert("Erreur démarrage mission : " + (error.message || "Inconnue"));
                }
            });
            setSelectedMission(updated);
            alert("Bonne route ! Mission démarrée.");
        }
    };

    const isFutureDate = (dateStr: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        return d > today;
    };

    const handleCreateMission = () => {
        if (!newMissionForm.destination || !newMissionForm.vehicleId) {
            alert("Veuillez remplir tous les champs obligatoires (Destination, Véhicule).");
            return;
        }

        // Pour les chauffeurs, s'assurer qu'ils sont assignés comme chauffeur de la mission
        let driverIdToUse = newMissionForm.driverId;
        if (userRole === 'CHAUFFEUR' && currentUser?.id) {
            // Si le chauffeur planifie une mission, il est automatiquement assigné
            driverIdToUse = currentUser.id;
        } else if (!driverIdToUse) {
            alert("Veuillez sélectionner un chauffeur.");
            return;
        }

        // Utiliser "NEW BOX TUNISIA" comme client par défaut si vide ou générique
        const defaultClient = 'NEW BOX TUNISIA';
        const missionClient = (newMissionForm.client && newMissionForm.client.trim() !== '' && newMissionForm.client !== 'Client')
            ? newMissionForm.client.trim()
            : defaultClient;

        const newMission: Omit<Mission, 'id'> = {
            // id: auto-generated by DB
            vehicle_id: newMissionForm.vehicleId,
            driver_id: driverIdToUse, // Utiliser le chauffeur connecté si rôle CHAUFFEUR
            client_id: missionClient, // Utiliser "NEW BOX TUNISIA" si vide

            departure_location: newMissionForm.departure,
            destination_location: newMissionForm.destination,
            distance_km: 150, // Mock distance
            cargo_weight_tonnes: 0, // Mock

            start_date: newMissionForm.date,
            status: MissionStatus.PLANNED,

            agreed_price_ttc: newMissionForm.price, // Mapped to agreed_price_ttc

            // Legacy / UI Compat
            vehicleId: newMissionForm.vehicleId, // Used from form
            driverId: driverIdToUse, // Utiliser le chauffeur connecté si rôle CHAUFFEUR
            departure: newMissionForm.departure, // Sync legacy fields if needed
            destination: newMissionForm.destination,
            client: missionClient, // Utiliser le client par défaut si vide
            waybill_number: newMissionForm.waybillNumber || undefined,
            waybill_date: newMissionForm.waybillDate || undefined,
            waybillDate: newMissionForm.waybillDate || undefined, // Legacy alias
            piece_number: newMissionForm.pieceNumber || undefined,
            pieceNumber: newMissionForm.pieceNumber || undefined // Legacy alias
        };
        addMissionMutation.mutate(newMission as Mission, {
            onSuccess: () => {
                alert("Mission planifiée avec succès !");
                setPlanMissionModalOpen(false);
                setNewMissionForm({
                    client: 'NEW BOX TUNISIA', // Client par défaut
                    departure: 'Kairouan', // Départ par défaut
                    destination: '',
                    cargo: '',
                    date: new Date().toISOString().split('T')[0],
                    vehicleId: '',
                    driverId: (userRole === 'CHAUFFEUR' && currentUser?.id) ? currentUser.id : '', // Réinitialiser avec le chauffeur connecté si rôle CHAUFFEUR
                    price: 0,
                    waybillNumber: '',
                    waybillDate: '',
                    pieceNumber: ''
                });
            },
            onError: (error: any) => {
                console.error("Erreur création mission:", error);
                alert("Erreur lors de la création : " + (error.message || "Inconnue"));
            }
        });
    };

    // Removed redundant useEffect that was causing race conditions with rate detection


    // Date Filter State
    const [selectedDate, setSelectedDate] = useState<string>('');

    return (
        <div className="space-y-6 relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-800">Exploitation & Missions</h2>
                    <div className="flex items-center bg-white border border-gray-300 rounded-lg px-3 py-1.5 shadow-sm">
                        <Filter size={16} className="text-gray-500 mr-2" />
                        <input
                            type="date"
                            className="text-sm text-gray-700 outline-none bg-transparent"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                        {selectedDate && (
                            <button
                                onClick={() => setSelectedDate('')}
                                className="ml-2 text-gray-400 hover:text-red-500"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
                {!selectedMission && (
                    <button
                        onClick={() => setPlanMissionModalOpen(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center w-full md:w-auto justify-center"
                    >
                        <Plus size={16} className="mr-2" /> Planifier Mission
                    </button>
                )}
            </div>

            <div className="w-full">
                {/* Main Content Area (List or Details) */}
                <div className="">
                    {selectedMission ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Detail Header */}
                            <div className="bg-gray-50 p-6 border-b border-gray-100 flex justify-between items-start">
                                <div>
                                    <button
                                        onClick={() => setSelectedMission(null)}
                                        className="text-gray-500 hover:text-gray-800 text-sm flex items-center mb-4 transition-colors"
                                    >
                                        <ArrowLeft size={16} className="mr-1" /> Retour à la liste
                                    </button>
                                    <h3 className="text-2xl font-bold text-gray-800">Mission #{selectedMission.missionNumber}</h3>
                                    <p className="text-gray-500 text-sm mt-1 flex items-center">
                                        <Calendar size={14} className="mr-1" /> {selectedMission.date}
                                        <span className="mx-2">•</span>
                                        <span className="font-medium text-blue-600">{selectedMission.client}</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${[MissionStatus.IN_PROGRESS, 'En Route'].includes(selectedMission.status) ? 'bg-blue-100 text-blue-800' :
                                        selectedMission.status === MissionStatus.DELIVERED ? 'bg-green-100 text-green-800' :
                                            [MissionStatus.INCOMPLETE, 'Incomplète', 'Interrompue'].includes(selectedMission.status) ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                        }`}>
                                        {selectedMission.status}
                                    </span>
                                    <div className="mt-3">
                                        <button className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100" title="Imprimer Ordre de Mission">
                                            <Printer size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Route & Progress */}
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-center justify-between mb-8 relative">
                                    {/* Progress Line */}
                                    <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-100 -z-10"></div>
                                    <div className={`absolute left-0 right-0 top-1/2 h-1 -z-10 w-1/2 ${selectedMission.status === 'Incomplète' || selectedMission.status === 'Interrompue' ? 'bg-red-500' : 'bg-blue-500'}`}></div>

                                    <div className={`${selectedMission.status === 'Incomplète' || selectedMission.status === 'Interrompue' ? 'bg-red-600 shadow-red-200' : 'bg-blue-600 shadow-blue-200'} text-white p-2 rounded-full shadow-lg`}>
                                        <MapPin size={20} />
                                    </div>
                                    <div className={`${selectedMission.status === 'Incomplète' || selectedMission.status === 'Interrompue' ? 'bg-red-600 shadow-red-200 animate-pulse' : 'bg-blue-600 shadow-blue-200 animate-pulse'} text-white p-2 rounded-full shadow-lg`}>
                                        <Truck size={20} />
                                    </div>
                                    <div className={`${selectedMission.status === 'Livrée' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-400'} p-2 rounded-full`}>
                                        <CheckCircle size={20} />
                                    </div>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <div>
                                        <p className="font-bold text-gray-800">{selectedMission.departure}</p>
                                        <p className="text-xs text-gray-500">Départ 08:00</p>
                                    </div>
                                    <div className="text-center">
                                        <p className={`font-bold ${selectedMission.status === 'Interrompue' ? 'text-red-600' : 'text-blue-600'}`}>{selectedMission.distance} km</p>
                                        <p className="text-xs text-gray-500">{selectedMission.status === 'Interrompue' ? 'Arrêt' : 'En transit'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-800">{selectedMission.destination}</p>
                                        <p className="text-xs text-gray-500">Arrivée estimée 14:30</p>
                                    </div>
                                </div>
                            </div>

                            {/* Bon de Livraison (BL) Info */}
                            {(selectedMission.waybill_number || selectedMission.waybillDate || selectedMission.waybillDate) && (
                                <div className="p-6 border-b border-gray-100 bg-blue-50/50">
                                    <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center">
                                        <FileText size={14} className="mr-2" /> Bon de Livraison (BL)
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-xs text-gray-500">Numéro de BL:</span>
                                            <p className="font-bold text-gray-800 mt-1">{selectedMission.waybill_number || selectedMission.waybillNumber || 'Non renseigné'}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500">Date de BL:</span>
                                            <p className="font-bold text-gray-800 mt-1">{selectedMission.waybill_date || selectedMission.waybillDate || 'Non renseignée'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-6 p-6 bg-gray-50/50">
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Véhicule & Chauffeur</h4>
                                    <div className="flex items-center mb-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mr-3">
                                            <Truck size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{getVehicle(selectedMission.vehicleId)?.matricule}</p>
                                            <p className="text-xs text-gray-500">{getVehicle(selectedMission.vehicleId)?.brand} {getVehicle(selectedMission.vehicleId)?.model}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 mr-3">
                                            <User size={18} />
                                        </div>
                                        <div>
                                            <div>
                                                {isEditingDriver ? (
                                                    <div className="flex items-center space-x-2">
                                                        <select
                                                            className="text-sm border rounded p-1"
                                                            value={editDriverId}
                                                            onChange={(e) => setEditDriverId(e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {employees.map(e => (
                                                                <option key={e.id} value={e.id}>{e.fullName}</option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const updated = { ...selectedMission, driverId: editDriverId };
                                                                updateMissionMutation.mutate(updated);
                                                                setSelectedMission(updated);
                                                                setIsEditingDriver(false);
                                                            }}
                                                            className="text-green-600 hover:bg-green-50 p-1 rounded"
                                                        >
                                                            <CheckCircle size={14} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setIsEditingDriver(false);
                                                            }}
                                                            className="text-red-600 hover:bg-red-50 p-1 rounded"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="group flex items-center">
                                                        <p className="text-sm font-bold text-gray-800 mr-2">{getDriver(selectedMission.driverId)?.fullName}</p>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditDriverId(selectedMission.driverId);
                                                                setIsEditingDriver(true);
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity"
                                                            title="Changer de chauffeur"
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                                <p className="text-xs text-gray-500">Tel: +216 99 123 456</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Cargaison</h4>
                                    <div className="flex items-start mb-2">
                                        <Package size={16} className="text-gray-400 mr-2 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{selectedMission.cargo}</p>
                                            <p className="text-xs text-gray-500">Marchandise conventionnelle</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                                        <span className="text-xs text-gray-500">Tarif Convenu (TTC)</span>
                                        {userRole !== 'CHAUFFEUR' ? (
                                            <span className="text-lg font-bold text-green-600">{selectedMission.price} TND</span>
                                        ) : (
                                            <span className="text-sm font-bold text-gray-400">Non Visible</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action Footer */}
                            <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end space-x-3">
                                <button
                                    onClick={() => setIncidentModalOpen(true)}
                                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors flex items-center"
                                >
                                    <AlertTriangle size={16} className="mr-2" /> Signaler Incident
                                </button>
                                {[MissionStatus.PLANNED, 'Planifiée'].includes(selectedMission.status) && (
                                    <button
                                        onClick={handleStartMission}
                                        disabled={isFutureDate(selectedMission.date)}
                                        title={
                                            isFutureDate(selectedMission.date)
                                                ? "Impossible de démarrer une mission future"
                                                : userRole === 'CHAUFFEUR'
                                                    ? "Démarrer et livrer la mission (facture et prime automatiques)"
                                                    : "Démarrer la mission"
                                        }
                                        className={`px-4 py-2 text-white rounded-lg text-sm font-medium shadow-sm flex items-center transition-colors ${isFutureDate(selectedMission.date)
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : userRole === 'CHAUFFEUR'
                                                ? 'bg-green-600 hover:bg-green-700'
                                                : 'bg-blue-600 hover:bg-blue-700'
                                            }`}
                                    >
                                        {userRole === 'CHAUFFEUR' ? (
                                            <>
                                                <CheckCircle size={16} className="mr-2" /> Démarrer & Livrer
                                            </>
                                        ) : (
                                            <>
                                                <Truck size={16} className="mr-2" /> Démarrer
                                            </>
                                        )}
                                    </button>
                                )}

                                {/* Pour les non-chauffeurs : afficher le bouton Clôturer/Livrer seulement si mission en cours */}
                                {userRole !== 'CHAUFFEUR' && ['En Route', 'En cours', MissionStatus.IN_PROGRESS, MissionStatus.INCOMPLETE, 'Incomplète'].includes(selectedMission.status) && (
                                    <button
                                        onClick={() => setCloseModalOpen(true)}
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 shadow-sm flex items-center"
                                    >
                                        <CheckCircle size={16} className="mr-2" /> Clôturer / Livrer
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="font-semibold text-gray-800">Missions en cours</h3>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                    {missions.filter(m => (!selectedDate || m.date === selectedDate) && (userRole !== 'CHAUFFEUR' || m.driverId === currentUserId)).length} Actives
                                </span>
                            </div>
                            <div className="p-4 space-y-4">
                                {missions
                                    .filter(m => userRole !== 'CHAUFFEUR' || m.driverId === currentUserId)
                                    .filter(m => !selectedDate || m.date === selectedDate)
                                    .map((mission) => {
                                        const vehicle = getVehicle(mission.vehicleId);
                                        const driver = getDriver(mission.driverId);

                                        const cardStyle = (() => {
                                            switch (mission.status) {
                                                case MissionStatus.IN_PROGRESS:
                                                    return 'bg-white border-gray-100';
                                                case MissionStatus.INCOMPLETE:
                                                    return 'bg-red-50 border-red-200';
                                                case MissionStatus.DELIVERED:
                                                    return 'bg-green-50 border-green-200';
                                                default:
                                                    return 'bg-white border-gray-100';
                                            }
                                        })();

                                        return (
                                            <div
                                                key={mission.id}
                                                onClick={() => setSelectedMission(mission)}
                                                className={`group border rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer ${cardStyle}`}
                                            >
                                                <div className="flex justify-between mb-3">
                                                    <div>
                                                        <span className="font-bold text-lg text-gray-800 group-hover:text-blue-600 transition-colors">Mission #{mission.missionNumber}</span>
                                                        <p className="text-xs text-gray-400 mt-1">Ref Client: {mission.client}</p>
                                                    </div>
                                                    <span className={`h-fit text-xs font-bold px-2 py-1 rounded ${mission.status === MissionStatus.IN_PROGRESS ? 'bg-blue-50 text-blue-600' :
                                                        mission.status === MissionStatus.INCOMPLETE ? 'bg-red-100 text-red-800' :
                                                            mission.status === MissionStatus.DELIVERED ? 'bg-green-100 text-green-800' :
                                                                'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {mission.status}
                                                    </span>
                                                </div>

                                                <div className="flex items-center text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-lg">
                                                    <MapPin size={16} className="mr-2 text-red-500" />
                                                    <span className="font-medium">{mission.departure}</span>
                                                    <ArrowRight size={14} className="mx-3 text-gray-400" />
                                                    <MapPin size={16} className="mr-2 text-green-500" />
                                                    <span className="font-medium">{mission.destination}</span>
                                                </div>

                                                {(mission.waybill_number || mission.waybillDate) && (
                                                    <div className="flex items-center text-xs text-gray-600 mb-3 bg-blue-50 p-2 rounded border border-blue-100">
                                                        <FileText size={14} className="mr-2 text-blue-600" />
                                                        <span className="font-medium text-blue-800">BL: {mission.waybill_number || 'N/A'}</span>
                                                        {mission.waybillDate && (
                                                            <>
                                                                <span className="mx-2 text-gray-400">•</span>
                                                                <span className="text-gray-600">{mission.waybillDate}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-50 pt-3">
                                                    <div className="flex items-center">
                                                        <Calendar size={14} className="mr-1.5 text-gray-400" /> {mission.date}
                                                    </div>
                                                    <div className="flex items-center space-x-3">
                                                        <span className="flex items-center bg-gray-100 px-2 py-1 rounded text-gray-700">
                                                            <Truck size={12} className="mr-1.5" /> {vehicle?.matricule}
                                                        </span>
                                                        <span className="flex items-center bg-gray-100 px-2 py-1 rounded text-gray-700">
                                                            <User size={12} className="mr-1.5" /> {driver?.fullName}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- INCIDENT MODAL --- */}
            {isIncidentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center flex-shrink-0">
                            <h3 className="text-lg font-bold text-red-800 flex items-center">
                                <AlertTriangle size={20} className="mr-2" /> Signaler un Incident
                            </h3>
                            <button onClick={() => setIncidentModalOpen(false)} className="text-red-400 hover:text-red-600 min-h-[48px] min-w-[48px] flex items-center justify-center">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type d'incident</label>
                                <select
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                                    value={incidentForm.type}
                                    onChange={(e) => setIncidentForm({ ...incidentForm, type: e.target.value })}
                                >
                                    <option value="Panne Mécanique">Panne Mécanique</option>
                                    <option value="Accident">Accident de la route</option>
                                    <option value="Crevaison">Crevaison</option>
                                    <option value="Retard Client">Retard chez Client</option>
                                    <option value="Autre">Autre</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                                    rows={3}
                                    value={incidentForm.description}
                                    onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                                    placeholder="Détails de l'événement..."
                                ></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Coût Estimatif (HT)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 pl-8 text-sm"
                                        value={incidentForm.cost}
                                        onChange={(e) => setIncidentForm({ ...incidentForm, cost: Number(e.target.value) })}
                                    />
                                    <span className="absolute left-3 top-2.5 text-gray-400 text-xs font-bold">DT</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Si renseigné, une dépense sera créée automatiquement.</p>
                            </div>
                            <div className="flex items-center space-x-2 bg-red-50 p-3 rounded-lg border border-red-100">
                                <input
                                    type="checkbox"
                                    id="immobilized"
                                    className="rounded border-red-300 text-red-600 focus:ring-red-500"
                                    checked={incidentForm.immobilized}
                                    onChange={(e) => setIncidentForm({ ...incidentForm, immobilized: e.target.checked })}
                                />
                                <label htmlFor="immobilized" className="text-sm font-bold text-red-800 cursor-pointer">
                                    Véhicule Immobilisé (Arrêt Mission)
                                </label>
                            </div>
                            
                            {/* Boutons */}
                            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
                                <button onClick={() => setIncidentModalOpen(false)} className="px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-300 rounded-lg min-h-[48px]">Annuler</button>
                                <button onClick={handleSubmitIncident} className="px-6 py-3 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 shadow-sm min-h-[48px]">
                                    Confirmer l'Incident
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CLOSE MISSION MODAL --- */}
            {isCloseModalOpen && selectedMission && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="bg-blue-50 p-4 border-b border-blue-100 flex justify-between items-center flex-shrink-0">
                            <h3 className="text-lg font-bold text-blue-800 flex items-center">
                                <CheckCircle size={20} className="mr-2" /> Clôturer la Mission
                            </h3>
                            <button onClick={() => setCloseModalOpen(false)} className="text-blue-400 hover:text-blue-600 min-h-[48px] min-w-[48px] flex items-center justify-center">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date de Fin</label>
                                    <input
                                        type="date"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                                        value={closeForm.date}
                                        onChange={(e) => setCloseForm({ ...closeForm, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Km Compteur</label>
                                    <input
                                        type="number"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                                        placeholder="ex: 124500"
                                        value={closeForm.km || ''}
                                        onChange={(e) => setCloseForm({ ...closeForm, km: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${closeForm.isDelivered
                                ? 'bg-green-50 border-green-500 shadow-md'
                                : 'bg-gray-50 border-gray-300 hover:border-gray-400'
                                }`}
                                onClick={() => setCloseForm({ ...closeForm, isDelivered: !closeForm.isDelivered })}
                            >
                                <div className={`w-6 h-6 rounded border flex items-center justify-center mr-3 transition-colors ${closeForm.isDelivered ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-400'
                                    }`}>
                                    {closeForm.isDelivered && <CheckCircle size={16} strokeWidth={3} />}
                                </div>
                                <div>
                                    <label className="text-base font-bold text-gray-800 cursor-pointer select-none">
                                        Marchandise Livrée (Succès)
                                    </label>
                                    <p className="text-xs text-gray-500 mt-0.5">Cochez cette case pour valider la livraison</p>
                                </div>
                            </div>

                            {/* Driver Pay Calculation */}
                            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                                <div className="flex items-center text-green-800 font-bold mb-3 text-sm">
                                    <DollarSign size={16} className="mr-2" /> Calcul Prime Chauffeur
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-3">
                                    <div>
                                        <label className="block text-xs font-medium text-green-700 mb-1">Destination</label>
                                        <input
                                            type="text"
                                            className="w-full bg-white border border-green-200 rounded p-1.5 text-sm font-medium text-gray-700"
                                            value={selectedMission.destination}
                                            disabled
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-green-700 mb-1">Tarif Hor. (Est.)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-white border border-green-200 rounded p-1.5 text-sm"
                                            value={closeForm.hourlyRate}
                                            onChange={(e) => setCloseForm({ ...closeForm, hourlyRate: Number(e.target.value) })}
                                            disabled={userRole === 'CHAUFFEUR'}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-green-700 mb-1">Durée Trajet (Heures)</label>
                                    <div className="relative">
                                        <Clock size={16} className="absolute left-2.5 top-2 text-green-500" />
                                        <input
                                            type="number"
                                            className="w-full pl-8 border border-green-300 rounded-md p-1.5 text-sm focus:ring-green-500"
                                            placeholder="ex: 8"
                                            value={closeForm.hoursWorked || ''}
                                            onChange={(e) => setCloseForm({ ...closeForm, hoursWorked: Number(e.target.value) })}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="mt-3 pt-2 border-t border-green-200 flex justify-between items-center">
                                    <span className="text-xs text-green-800 font-medium">Prime Calculée:</span>
                                    <span className="text-lg font-bold text-green-700">{closeForm.calculatedBonus.toFixed(3)} TND</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
                                <textarea
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                                    rows={2}
                                    placeholder="Remarques..."
                                    value={closeForm.note}
                                    onChange={(e) => setCloseForm({ ...closeForm, note: e.target.value })}
                                ></textarea>
                            </div>
                            
                            {/* Boutons */}
                            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200 pb-20">
                                <button onClick={() => setCloseModalOpen(false)} className="px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-300 rounded-lg min-h-[48px]">Annuler</button>
                                <button onClick={handleSubmitClose} className="px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm flex items-center min-h-[48px]">
                                    <Save size={16} className="mr-2" /> Enregistrer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PLAN MISSION MODAL --- */}
            {isPlanMissionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="bg-blue-600 p-4 border-b border-blue-700 flex justify-between items-center text-white flex-shrink-0">
                            <h3 className="text-lg font-bold flex items-center">
                                <MapPin size={20} className="mr-2" /> Planifier Nouvelle Mission
                            </h3>
                            <button onClick={() => setPlanMissionModalOpen(false)} className="text-blue-200 hover:text-white min-h-[48px] min-w-[48px] flex items-center justify-center">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            {/* Client & Date */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg p-2.5 text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="NEW BOX TUNISIA (client par défaut)"
                                        value={newMissionForm.client}
                                        onChange={(e) => setNewMissionForm({ ...newMissionForm, client: e.target.value })}
                                    />
                                    {!newMissionForm.client || newMissionForm.client.trim() === '' ? (
                                        <p className="text-xs text-blue-400 mt-1">
                                            💡 Le client par défaut "NEW BOX TUNISIA" sera utilisé si vide
                                        </p>
                                    ) : null}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newMissionForm.date}
                                        onChange={(e) => setNewMissionForm({ ...newMissionForm, date: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Route Selection - TOUS les trajets depuis Kairouan */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Trajet (Kairouan → Destination)</label>
                                <select
                                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={`${newMissionForm.departure}-${newMissionForm.destination}`}
                                    onChange={(e) => {
                                        if (e.target.value === 'CUSTOM') {
                                            // Trajet personnalisé - laisser les champs manuels ouverts
                                            setNewMissionForm({
                                                ...newMissionForm,
                                                departure: 'Kairouan',
                                                destination: '',
                                                price: 0
                                            });
                                            return;
                                        }

                                        if (e.target.value === '') {
                                            // Reset si aucune sélection
                                            setNewMissionForm({
                                                ...newMissionForm,
                                                departure: 'Kairouan',
                                                destination: '',
                                                price: 0
                                            });
                                            return;
                                        }

                                        // Utiliser FORMATTED_ROUTES (avec prix) pour trouver la route, peu importe le rôle
                                        // Car on a besoin du prix pour le calcul en arrière-plan
                                        const selectedRoute = FORMATTED_ROUTES.find(r => r.value === e.target.value);

                                        if (selectedRoute) {
                                            // Obtenir le tarif exact (peut être null si pas trouvé, utiliser le prix par défaut)
                                            // Calcul en arrière-plan même pour les chauffeurs (juste masqué dans l'UI)
                                            const rate = getClientRate(
                                                newMissionForm.client || '',
                                                selectedRoute.departure,
                                                selectedRoute.destination
                                            );

                                            setNewMissionForm({
                                                ...newMissionForm,
                                                departure: selectedRoute.departure,
                                                destination: selectedRoute.destination,
                                                price: rate || selectedRoute.price // Utiliser le tarif trouvé ou le prix par défaut
                                            });
                                        }
                                    }}
                                >
                                    <option value="">Sélectionner un trajet...</option>
                                    {/* Afficher les routes avec ou sans prix selon le rôle */}
                                    {(userRole === 'CHAUFFEUR' ? FORMATTED_ROUTES_WITHOUT_PRICE : FORMATTED_ROUTES).map((route, idx) => (
                                        <option key={`route-${idx}`} value={route.value}>
                                            {route.label}
                                        </option>
                                    ))}
                                    {/* Option pour trajet personnalisé */}
                                    <option value="CUSTOM" className="font-bold text-blue-600 border-t border-gray-300 mt-2">+ Trajet personnalisé...</option>
                                </select>

                                {/* Si trajet personnalisé sélectionné, afficher les champs manuels */}
                                {/* Masquer le message de tarif pour les chauffeurs */}
                                {userRole !== 'CHAUFFEUR' && newMissionForm.departure.toLowerCase() === 'kairouan' && newMissionForm.destination && (() => {
                                    // Utiliser normalizeCity pour une comparaison robuste
                                    const normDest = normalizeCity(newMissionForm.destination);
                                    const isKnownRoute = FORMATTED_ROUTES.some(r => normalizeCity(r.destination) === normDest);

                                    return !isKnownRoute ? (
                                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                                            ⚠️ Trajet personnalisé sélectionné. Le tarif devra être saisi manuellement ou vérifié dans la table des tarifs.
                                        </div>
                                    ) : null;
                                })()}
                            </div>

                            {/* Champs manuels pour trajet personnalisé */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Départ (modifiable)</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newMissionForm.departure}
                                        onChange={(e) => setNewMissionForm({ ...newMissionForm, departure: e.target.value })}
                                        placeholder="Kairouan"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Destination (modifiable)</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newMissionForm.destination}
                                        onChange={(e) => {
                                            const dest = e.target.value;
                                            setNewMissionForm({ ...newMissionForm, destination: dest });

                                            // Auto-remplir le prix si un tarif existe (calcul en arrière-plan même pour les chauffeurs)
                                            if (dest && newMissionForm.departure) {
                                                import('../src/utils/tariffs').then(({ getClientRate }) => {
                                                    const rate = getClientRate(newMissionForm.client || '', newMissionForm.departure.toLowerCase(), dest.toLowerCase());
                                                    if (rate && rate > 0) {
                                                        setNewMissionForm(prev => ({ ...prev, price: rate }));
                                                    }
                                                });
                                            }
                                        }}
                                        placeholder="Tunis, Sfax, etc."
                                        list="destinations-list"
                                    />
                                    <datalist id="destinations-list">
                                        {AVAILABLE_DESTINATIONS.map((dest, idx) => (
                                            <option key={`dest-${idx}`} value={dest} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>

                            {/* Hidden Fields for Compatibility/Edit if needed, or visual confirmation */}
                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <div>
                                    <span className="block text-xs text-gray-400 uppercase font-bold">Départ</span>
                                    <span className="font-medium text-gray-800">{newMissionForm.departure || '-'}</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xs text-gray-400 uppercase font-bold">Destination</span>
                                    <span className="font-medium text-gray-800">{newMissionForm.destination || '-'}</span>
                                </div>
                            </div>

                            {/* Cargo */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Marchandise / Cargaison</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg p-2.5 text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Ex: Ciment 30T"
                                    value={newMissionForm.cargo}
                                    onChange={(e) => setNewMissionForm({ ...newMissionForm, cargo: e.target.value })}
                                />
                            </div>

                            {/* Bon de Livraison (BL) */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de BL (Bon de Livraison)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg p-2.5 text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Ex: BL-2025-001"
                                        value={newMissionForm.waybillNumber}
                                        onChange={(e) => setNewMissionForm({ ...newMissionForm, waybillNumber: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date de BL</label>
                                    <input
                                        type="date"
                                        className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg p-2.5 text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newMissionForm.waybillDate}
                                        onChange={(e) => setNewMissionForm({ ...newMissionForm, waybillDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Pièce N° (distincte du BL) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pièce N° <span className="text-xs text-gray-500">(pour facture, distincte du BL)</span></label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg p-2.5 text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Ex: P-2025-001 ou référence pièce"
                                    value={newMissionForm.pieceNumber}
                                    onChange={(e) => setNewMissionForm({ ...newMissionForm, pieceNumber: e.target.value })}
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    💡 Cette référence apparaîtra dans la facture comme "Pièce N°" (différente du numéro de BL)
                                </p>
                            </div>

                            {/* Resources */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Véhicule</label>
                                    {userRole === 'CHAUFFEUR' && userVehicleId ? (
                                        <div className="w-full bg-gray-100 border border-gray-300 text-gray-700 rounded-lg p-2.5 text-sm">
                                            {vehicles.find(v => v.id === userVehicleId)?.matricule || 'Véhicule assigné'}
                                        </div>
                                    ) : (
                                        <select
                                            className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newMissionForm.vehicleId}
                                            onChange={(e) => setNewMissionForm({ ...newMissionForm, vehicleId: e.target.value })}
                                        >
                                            <option value="">Sélectionner...</option>
                                            {vehicles.map(v => (
                                                <option key={v.id} value={v.id}>{v.matricule}</option>
                                            ))}
                                        </select>
                                    )}
                                    {userRole === 'CHAUFFEUR' && (
                                        <p className="text-xs text-blue-600 mt-1">
                                            💡 Votre véhicule est automatiquement assigné
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Chauffeur</label>
                                    {userRole === 'CHAUFFEUR' && currentUser?.id ? (
                                        // Si le rôle est CHAUFFEUR, afficher le nom du chauffeur connecté (non modifiable)
                                        <div className="w-full bg-gray-100 border border-gray-300 text-gray-700 rounded-lg p-2.5 text-sm">
                                            {currentUser.full_name || employees.find(e => e.id === currentUser.id)?.fullName || 'Vous'}
                                        </div>
                                    ) : (
                                        <select
                                            className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newMissionForm.driverId}
                                            onChange={(e) => setNewMissionForm({ ...newMissionForm, driverId: e.target.value })}
                                        >
                                            <option value="">Sélectionner...</option>
                                            {employees.map(d => (
                                                <option key={d.id} value={d.id}>{d.fullName}</option>
                                            ))}
                                        </select>
                                    )}
                                    {userRole === 'CHAUFFEUR' && (
                                        <p className="text-xs text-blue-600 mt-1">
                                            💡 Vous êtes automatiquement assigné comme chauffeur
                                        </p>
                                    )}
                                </div>
                            </div>
                            
                            {/* Boutons */}
                            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200 pb-20">
                                <button onClick={() => setPlanMissionModalOpen(false)} className="px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-300 rounded-lg min-h-[48px]">Annuler</button>
                                <button onClick={handleCreateMission} className="px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm min-h-[48px]">
                                    Confirmer la Mission
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
