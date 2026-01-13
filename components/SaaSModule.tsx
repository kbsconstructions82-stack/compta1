
import React from 'react';
import { Tenant, SubscriptionPlan } from '../types';
import { SAAS_PLANS } from '../constants';
import { Building, Users, Database, CreditCard, CheckCircle, BarChart3, AlertCircle } from 'lucide-react';

interface SaaSModuleProps {
    currentTenant: Tenant;
    onSwitchTenant: (tenantId: string) => void;
    availableTenants: Tenant[];
}

export const SaaSModule: React.FC<SaaSModuleProps> = ({ currentTenant, onSwitchTenant, availableTenants }) => {
    
    const UsageBar = ({ label, current, max, unit }: { label: string, current: number, max: number, unit?: string }) => {
        const percentage = Math.min((current / max) * 100, 100);
        const isCritical = percentage > 90;
        
        return (
            <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{label}</span>
                    <span className="text-gray-500">{current} / {max} {unit}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                        className={`h-2.5 rounded-full ${isCritical ? 'bg-red-500' : 'bg-blue-600'}`} 
                        style={{ width: `${percentage}%` }}
                    ></div>
                </div>
                {isCritical && <p className="text-xs text-red-500 mt-1 flex items-center"><AlertCircle size={10} className="mr-1"/> Limite atteinte bientôt</p>}
            </div>
        );
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                        <Building className="mr-3 text-indigo-600"/> 
                        Administration SaaS
                    </h2>
                    <p className="text-gray-500">Gestion de votre abonnement et de vos ressources.</p>
                </div>
                <div className="flex items-center space-x-2">
                     <span className="text-sm text-gray-600">Société active:</span>
                     <select 
                        className="border border-gray-300 rounded-lg p-2 text-sm font-semibold text-gray-800 bg-white"
                        value={currentTenant.id}
                        onChange={(e) => onSwitchTenant(e.target.value)}
                     >
                         {availableTenants.map(t => (
                             <option key={t.id} value={t.id}>{t.name} ({t.plan})</option>
                         ))}
                     </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Subscription Card */}
                <div className="bg-white rounded-xl shadow-lg border border-indigo-100 overflow-hidden col-span-1 lg:col-span-2">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-6 text-white">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-indigo-200 text-sm font-medium uppercase tracking-wider mb-1">Abonnement Actuel</p>
                                <h3 className="text-3xl font-bold mb-2">{currentTenant.plan}</h3>
                                <p className="text-indigo-100 opacity-90 text-sm">Renouvellement le {new Date(currentTenant.next_billing_date).toLocaleDateString('fr-FR')}</p>
                            </div>
                            <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                                <CreditCard size={32} />
                            </div>
                        </div>
                    </div>
                    <div className="p-8">
                        <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
                             <div>
                                 <p className="text-gray-500 text-sm">Prix Mensuel</p>
                                 <p className="text-2xl font-bold text-gray-800">{SAAS_PLANS[currentTenant.plan].price} TND <span className="text-sm font-normal text-gray-500">/ mois</span></p>
                             </div>
                             <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm">
                                 Changer de Plan
                             </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div>
                                 <h4 className="font-bold text-gray-800 mb-4 flex items-center"><BarChart3 size={18} className="mr-2 text-indigo-500"/> Utilisation des Ressources</h4>
                                 <UsageBar label="Utilisateurs" current={currentTenant.current_users} max={currentTenant.max_users} />
                                 <UsageBar label="Véhicules" current={currentTenant.current_vehicles} max={currentTenant.max_vehicles} />
                                 <UsageBar label="Stockage (Documents)" current={currentTenant.storage_used_gb} max={currentTenant.storage_limit_gb} unit="GB" />
                             </div>
                             <div className="bg-gray-50 rounded-lg p-5">
                                 <h4 className="font-bold text-gray-800 mb-3 text-sm">Fonctionnalités incluses</h4>
                                 <ul className="space-y-2">
                                     {SAAS_PLANS[currentTenant.plan].features.map((feat: string, idx: number) => (
                                         <li key={idx} className="flex items-center text-sm text-gray-600">
                                             <CheckCircle size={14} className="mr-2 text-green-500 flex-shrink-0" />
                                             {feat}
                                         </li>
                                     ))}
                                 </ul>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Plan Comparison (Upsell) */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 flex flex-col">
                    <h3 className="font-bold text-gray-800 mb-4">Plans Disponibles</h3>
                    <div className="space-y-4 flex-1">
                        {Object.entries(SAAS_PLANS).map(([planName, details]) => {
                            const isCurrent = currentTenant.plan === planName;
                            return (
                                <div key={planName} className={`p-4 rounded-lg border ${isCurrent ? 'bg-white border-indigo-500 ring-1 ring-indigo-500' : 'bg-white border-gray-200 opacity-75 hover:opacity-100'}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-gray-800">{planName}</span>
                                        {isCurrent && <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-bold">Actuel</span>}
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900 mb-2">{details.price === 0 ? 'Gratuit' : `${details.price} TND`}</div>
                                    <p className="text-xs text-gray-500 mb-3">
                                        Jusqu'à {details.max_users} utilisateurs et {details.max_vehicles} véhicules.
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                            <Users size={16} className="mr-2"/> Besoin de plus ?
                        </div>
                        <p className="text-xs text-gray-500 mb-3">Contactez notre service commercial pour une offre sur mesure (Flotte {'>'} 50 camions).</p>
                        <button className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-white transition-colors">Contact Commercial</button>
                    </div>
                </div>
            </div>
            
            {/* Database Isolation Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
                 <Database className="text-blue-600 mt-1 mr-3" size={20}/>
                 <div>
                     <h4 className="font-bold text-blue-900 text-sm">Architecture Multi-Tenant (Isolation des Données)</h4>
                     <p className="text-blue-800 text-xs mt-1">
                         Vos données sont logiquement isolées. Chaque requête de base de données inclut automatiquement 
                         votre identifiant unique <code>tenant_id = {currentTenant.id}</code> pour garantir qu'aucune donnée 
                         ne fuite vers d'autres sociétés. Les sauvegardes sont également segmentées par locataire.
                     </p>
                 </div>
            </div>
        </div>
    );
};
