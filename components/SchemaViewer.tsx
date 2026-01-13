
import React, { useState } from 'react';
import { Database, Key, Share2, Server, ArrowRight, Layers, FileText, ShieldCheck, Activity } from 'lucide-react';

// --- Architecture Components ---

const ModuleCard = ({ title, icon: Icon, color, features, accounting }: any) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
    <div className={`flex items-center mb-4 ${color}`}>
      <div className={`p-3 rounded-lg bg-opacity-10 bg-current mr-4`}>
        <Icon size={24} />
      </div>
      <h3 className="text-lg font-bold text-gray-800">{title}</h3>
    </div>
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Fonctionnalités Clés</h4>
        <ul className="space-y-1">
          {features.map((f: string, i: number) => (
            <li key={i} className="text-sm text-gray-600 flex items-start">
              <span className="mr-2 text-gray-400">•</span> {f}
            </li>
          ))}
        </ul>
      </div>
      <div className="pt-4 border-t border-gray-100">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Impact Comptable & Fiscal</h4>
        <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100 italic">
          {accounting}
        </p>
      </div>
    </div>
  </div>
);

const FlowStep = ({ number, title, desc }: any) => (
    <div className="flex flex-col items-center text-center w-48 relative">
        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mb-3 z-10 relative">
            {number}
        </div>
        <h4 className="font-bold text-gray-800 text-sm mb-1">{title}</h4>
        <p className="text-xs text-gray-500">{desc}</p>
    </div>
);

const FlowArrow = () => (
    <div className="flex-1 h-0.5 bg-gray-300 mx-2 self-start mt-5"></div>
);

// --- Schema Definitions ---

const TableDefinition = ({ name, description, fields }: any) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Database size={16} className="text-indigo-600" />
        <h3 className="font-bold text-gray-800 font-mono text-sm">{name}</h3>
      </div>
      <span className="text-xs text-gray-500 italic">{description}</span>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-gray-50 text-gray-500 font-medium">
          <tr>
            <th className="px-4 py-2 w-10"></th>
            <th className="px-4 py-2">Champ (Field)</th>
            <th className="px-4 py-2">Type (SQL)</th>
            <th className="px-4 py-2">Règles & Contraintes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {fields.map((field: any, idx: number) => (
            <tr key={idx} className="hover:bg-gray-50">
               <td className="px-4 py-2 text-center">
                  {field.pk && <Key size={12} className="text-yellow-600" />}
                  {field.fk && <Share2 size={12} className="text-blue-500" />}
               </td>
              <td className="px-4 py-2 font-mono font-medium text-gray-700">{field.name}</td>
              <td className="px-4 py-2 text-purple-600 font-mono">{field.type}</td>
              <td className="px-4 py-2 text-gray-600">
                {field.pk && <span className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded mr-2 text-[10px] font-bold">PK</span>}
                {field.fk && <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded mr-2 text-[10px] font-bold">FK</span>}
                {field.desc}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const SchemaViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'functional' | 'flows' | 'schema'>('functional');

  // --- SQL Schema Data (Matches User Request) ---
  const schema = {
    companies: [
      { name: 'id', type: 'SERIAL', pk: true, desc: 'Primary Key' },
      { name: 'tax_id', type: 'VARCHAR(50)', desc: 'Matricule Fiscale (Unique)' },
      { name: 'name', type: 'VARCHAR(255)', desc: 'Raison Sociale' },
      { name: 'address', type: 'TEXT', desc: 'Siège Social' },
    ],
    trucks: [
      { name: 'id', type: 'SERIAL', pk: true, desc: 'PK' },
      { name: 'company_id', type: 'INT', fk: true, desc: 'FK -> companies' },
      { name: 'plate_number', type: 'VARCHAR(50)', desc: 'Matricule (Unique)' },
      { name: 'brand', type: 'VARCHAR(100)', desc: 'Marque' },
    ],
    employees: [
        { name: 'id', type: 'SERIAL', pk: true, desc: 'PK' },
        { name: 'company_id', type: 'INT', fk: true, desc: 'FK -> companies' },
        { name: 'full_name', type: 'VARCHAR(255)', desc: 'Nom Prénom' },
        { name: 'cnss_number', type: 'VARCHAR(50)', desc: 'Matricule CNSS' },
        { name: 'base_salary', type: 'NUMERIC(12,3)', desc: 'Salaire Base (TND)' }
    ],
    invoices: [
        { name: 'id', type: 'SERIAL', pk: true, desc: 'PK' },
        { name: 'client_id', type: 'INT', fk: true, desc: 'FK -> clients' },
        { name: 'invoice_number', type: 'VARCHAR(100)', desc: 'Séquentiel Unique' },
        { name: 'status', type: 'VARCHAR(20)', desc: 'DRAFT/VALIDATED/PAID' },
        { name: 'total_ht', type: 'NUMERIC(12,3)', desc: 'Base Imposable' },
        { name: 'total_vat', type: 'NUMERIC(12,3)', desc: 'Montant TVA' },
        { name: 'total_ttc', type: 'NUMERIC(12,3)', desc: 'Net TTC' }
    ],
    expenses: [
        { name: 'id', type: 'SERIAL', pk: true, desc: 'PK' },
        { name: 'category', type: 'VARCHAR(50)', desc: 'FUEL, MAINT, TOLL...' },
        { name: 'amount_ht', type: 'NUMERIC(12,3)', desc: 'Montant HT' },
        { name: 'vat_amount', type: 'NUMERIC(12,3)', desc: 'TVA Récupérable' },
        { name: 'deductible', type: 'BOOLEAN', desc: 'Admis fiscalement' }
    ],
    vat_records: [
        { name: 'id', type: 'SERIAL', pk: true, desc: 'PK' },
        { name: 'period_start', type: 'DATE', desc: 'Début mois' },
        { name: 'vat_collected', type: 'NUMERIC(12,3)', desc: 'TVA Ventes (7%/19%)' },
        { name: 'vat_deductible', type: 'NUMERIC(12,3)', desc: 'TVA Achats' },
        { name: 'vat_payable', type: 'NUMERIC(12,3)', desc: 'Net à Payer' }
    ],
    users: [
        { name: 'id', type: 'SERIAL', pk: true, desc: 'PK' },
        { name: 'email', type: 'VARCHAR(255)', desc: 'Identifiant unique' },
        { name: 'role', type: 'VARCHAR(20)', desc: 'ADMIN, COMPTABLE, VIEWER' },
    ],
    audit_logs: [
        { name: 'id', type: 'SERIAL', pk: true, desc: 'PK' },
        { name: 'user_id', type: 'INT', fk: true, desc: 'FK -> users' },
        { name: 'action', type: 'VARCHAR(100)', desc: 'Action métier' },
        { name: 'entity', type: 'VARCHAR(50)', desc: 'Type entité cible' },
        { name: 'old_value', type: 'JSONB', desc: 'Snapshot avant modif' },
        { name: 'new_value', type: 'JSONB', desc: 'Snapshot après modif' },
        { name: 'created_at', type: 'TIMESTAMP', desc: 'Horodatage immuable' }
    ]
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end mb-6">
        <div>
           <h2 className="text-3xl font-bold text-gray-800">Architecture Système</h2>
           <p className="text-gray-500">Spécifications fonctionnelles et techniques pour TunisFret</p>
        </div>
        <div className="bg-white p-1 rounded-lg border border-gray-200 inline-flex">
            <button 
                onClick={() => setActiveTab('functional')}
                className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${activeTab === 'functional' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
            >
                <Layers size={16} className="mr-2"/> Modules & Responsabilités
            </button>
            <button 
                onClick={() => setActiveTab('flows')}
                className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${activeTab === 'flows' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
            >
                <Activity size={16} className="mr-2"/> Flux de Données
            </button>
            <button 
                onClick={() => setActiveTab('schema')}
                className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${activeTab === 'schema' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
            >
                <Database size={16} className="mr-2"/> Schéma SQL
            </button>
        </div>
      </div>

      {/* --- FUNCTIONAL ARCHITECTURE --- */}
      {activeTab === 'functional' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ModuleCard 
                title="1. Exploitation (TMS)" 
                icon={ArrowRight} 
                color="text-blue-600"
                features={['Gestion Parc (Camions/Remorques)', 'Planning Missions', 'Suivi Chauffeurs', 'Entretien & Alertes']}
                accounting="Génère les coûts variables (Carburant, Pièces) et les données de pré-facturation."
            />
             <ModuleCard 
                title="2. Facturation & Ventes" 
                icon={FileText} 
                color="text-green-600"
                features={['Devis & Commandes', 'Factures Clients', 'Gestion Clients', 'Recouvrement']}
                accounting="CA (Classe 7), TVA Collectée (7% Transport), Retenue à la Source (1%)."
            />
             <ModuleCard 
                title="3. Achats & Dépenses" 
                icon={Layers} 
                color="text-orange-600"
                features={['Factures Fournisseurs', 'Caisse & Notes de Frais', 'Stock Pièces', 'Fournisseurs']}
                accounting="Charges (Classe 6), TVA Déductible, Amortissements."
            />
             <ModuleCard 
                title="4. RH & Paie" 
                icon={ShieldCheck} 
                color="text-purple-600"
                features={['Fiches Employés', 'Calcul Paie (IRPP/CNSS)', 'Congés & Absences', 'Primes Rendement']}
                accounting="Charges Personnel (Cl. 64), Dettes Sociales (CNSS 16.57% + 9.18%)."
            />
             <ModuleCard 
                title="5. Comptabilité & Fisc" 
                icon={Activity} 
                color="text-red-600"
                features={['Journaux & Grand Livre', 'Déclarations Mensuelles', 'Bilan & Compte Résultat', 'Audit Log']}
                accounting="Centralisation de toutes les écritures, conformité légale et liasse fiscale."
            />
             <ModuleCard 
                title="6. SaaS & Sécurité" 
                icon={Server} 
                color="text-gray-600"
                features={['Isolation Multi-Tenant', 'Rôles & Permissions', 'Audit Trail Immutable', 'Backup']}
                accounting="Garantie d'intégrité (Art 62 TVA), Non-répudiation."
            />
        </div>
      )}

      {/* --- DATA FLOWS --- */}
      {activeTab === 'flows' && (
        <div className="space-y-12">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-6 border-b pb-2">Cycle Revenus (Order-to-Cash) - Spécificité Transport</h3>
                <div className="flex justify-between items-start">
                    <FlowStep number="1" title="Exploitation" desc="Mission terminée & Lettre de Voiture signée" />
                    <FlowArrow />
                    <FlowStep number="2" title="Facturation" desc="Génération Facture (TVA 7% / Timbre)" />
                    <FlowArrow />
                    <FlowStep number="3" title="Validation" desc="Verrouillage & Numérotation Séquentielle" />
                    <FlowArrow />
                    <FlowStep number="4" title="Comptabilité" desc="Écriture Vente (411 / 704 / 4457)" />
                    <FlowArrow />
                    <FlowStep number="5" title="Trésorerie" desc="Encaissement (Chèque/Virement) & RS" />
                </div>
                <div className="mt-8 bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
                    <strong>Point de Contrôle Fiscal :</strong> La facture doit être validée chronologiquement. Si le montant TTC {'>'} 1000 TND, le système doit anticiper une <strong>Retenue à la Source de 1%</strong> lors du paiement.
                </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-6 border-b pb-2">Cycle Dépenses (Procure-to-Pay) - Gestion Flotte</h3>
                <div className="flex justify-between items-start">
                    <FlowStep number="1" title="Achat" desc="Plein Carburant ou Pièces (Bon de livraison)" />
                    <FlowArrow />
                    <FlowStep number="2" title="Saisie" desc="Enregistrement Dépense & Affectation Véhicule" />
                    <FlowArrow />
                    <FlowStep number="3" title="Qualification" desc="Vérification Déductibilité TVA (Camion vs Tourisme)" />
                    <FlowArrow />
                    <FlowStep number="4" title="Comptabilité" desc="Écriture Achat (606 / 4456 / 401)" />
                    <FlowArrow />
                    <FlowStep number="5" title="Analytique" desc="Calcul Coût de Revient Kilométrique (CRK)" />
                </div>
            </div>
        </div>
      )}

      {/* --- SQL SCHEMA --- */}
      {activeTab === 'schema' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="col-span-1 lg:col-span-2 bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <p className="text-sm text-yellow-800">
                    <strong>Note Technique :</strong> Schéma conçu pour <strong>PostgreSQL</strong> (recommandé pour la production). 
                    Les types monétaires utilisent <code>NUMERIC(12,3)</code> pour gérer les 3 décimales du Dinar Tunisien.
                </p>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4 border-l-4 border-blue-500 pl-3">Entités Métier</h3>
                <TableDefinition name="companies" description="Tenants & Tiers" fields={schema.companies} />
                <TableDefinition name="trucks" description="Flotte (Actifs)" fields={schema.trucks} />
                <TableDefinition name="employees" description="Ressources Humaines" fields={schema.employees} />
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4 border-l-4 border-green-500 pl-3">Transactions Financières</h3>
                <TableDefinition name="invoices" description="Facturation Client" fields={schema.invoices} />
                <TableDefinition name="expenses" description="Charges & Achats" fields={schema.expenses} />
                <TableDefinition name="vat_records" description="Agrégats Fiscaux" fields={schema.vat_records} />
            </div>

             <div className="col-span-1 lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 border-l-4 border-purple-500 pl-3">Sécurité & Audit</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   <TableDefinition name="users" description="Gestion des Accès" fields={schema.users} />
                   <TableDefinition name="audit_logs" description="Traçabilité Immuable" fields={schema.audit_logs} />
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
