
import React, { useState, useEffect } from 'react';
import { Shield, FileText, Lock, Users, Activity, CheckCircle, Download, Search, AlertTriangle, Clock, ChevronRight, Eye } from 'lucide-react';
import { AuditLog, FiscalPeriod } from '../types';
import { getAuditLogs, checkDataIntegrity, exportFiscalData, getFiscalPeriods, closeFiscalPeriod } from '../services/auditService';

export const SecurityAudit: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'audit' | 'roles' | 'compliance' | 'periods'>('audit');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [integrityStatus, setIntegrityStatus] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
      getAuditLogs().then(setLogs);
      getFiscalPeriods().then(setPeriods);
  };

  const runIntegrityCheck = async () => {
    setIsChecking(true);
    setIntegrityStatus(null);
    const result = await checkDataIntegrity();
    setIntegrityStatus(result);
    setIsChecking(false);
  };

  const handleClosePeriod = async (year: number) => {
      if (confirm(`ATTENTION: La clôture de l'exercice ${year} est IRRÉVERSIBLE.\n\nToutes les écritures seront verrouillées.\nConfirmez-vous ?`)) {
          await closeFiscalPeriod(year, "Ahmed Admin"); // Simulated user
          refreshData();
      }
  };

  const StatusBadge = ({ action }: { action: string }) => {
    const colors: Record<string, string> = {
      LOGIN: 'bg-gray-100 text-gray-800',
      CREATE: 'bg-blue-100 text-blue-800',
      UPDATE: 'bg-orange-100 text-orange-800',
      DELETE: 'bg-red-100 text-red-800',
      VALIDATE: 'bg-green-100 text-green-800',
      EXPORT: 'bg-purple-100 text-purple-800',
      CLOSE_PERIOD: 'bg-gray-800 text-white'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-bold ${colors[action] || 'bg-gray-100'}`}>
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 flex items-center">
             <Shield className="mr-2 text-blue-600"/> Sécurité & Audit Fiscal
           </h2>
           <p className="text-sm text-gray-500">Traçabilité, Conformité et Clôtures</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 inline-flex overflow-x-auto max-w-full">
          <button 
             onClick={() => setActiveTab('audit')}
             className={`px-4 py-2 rounded-md text-sm font-medium flex items-center whitespace-nowrap ${activeTab === 'audit' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
             <Activity size={16} className="mr-2"/> Journal d'Audit
          </button>
           <button 
             onClick={() => setActiveTab('periods')}
             className={`px-4 py-2 rounded-md text-sm font-medium flex items-center whitespace-nowrap ${activeTab === 'periods' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
             <Clock size={16} className="mr-2"/> Périodes Fiscales
          </button>
          <button 
             onClick={() => setActiveTab('roles')}
             className={`px-4 py-2 rounded-md text-sm font-medium flex items-center whitespace-nowrap ${activeTab === 'roles' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
             <Users size={16} className="mr-2"/> Rôles & Permissions
          </button>
          <button 
             onClick={() => setActiveTab('compliance')}
             className={`px-4 py-2 rounded-md text-sm font-medium flex items-center whitespace-nowrap ${activeTab === 'compliance' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
             <Lock size={16} className="mr-2"/> Conformité & Exports
          </button>
      </div>

      {/* --- AUDIT TRAIL TAB --- */}
      {activeTab === 'audit' && (
        <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"/>
                        <input type="text" placeholder="Rechercher..." className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                    </div>
                    <button className="flex items-center text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-300 px-3 py-2 rounded-lg">
                        <Download size={16} className="mr-2"/> Export CSV
                    </button>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horodatage</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entité</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase"></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {logs.map(log => (
                            <tr 
                                key={log.id} 
                                className={`hover:bg-gray-50 cursor-pointer ${selectedLog?.id === log.id ? 'bg-blue-50' : ''}`}
                                onClick={() => setSelectedLog(log)}
                            >
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(log.timestamp).toLocaleString('fr-TN')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{log.user_name}</div>
                                    <div className="text-xs text-gray-500">{log.role}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <StatusBadge action={log.action} />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">{log.entity}</span>
                                    {log.entity_ref && <span className="ml-2 text-xs text-gray-500">#{log.entity_ref}</span>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-400">
                                    <ChevronRight size={16} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* Detail View (Diff) */}
            {selectedLog && (
                <div className="w-full lg:w-96 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-fit">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-gray-800">Détail de l'événement</h3>
                        <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-600"><Eye size={16}/></button>
                    </div>
                    
                    <div className="space-y-4 text-sm">
                        <div>
                            <span className="text-gray-500 text-xs uppercase font-bold">Message</span>
                            <p className="text-gray-800 mt-1">{selectedLog.details}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <span className="text-gray-500 text-xs uppercase font-bold">IP Source</span>
                                <p className="font-mono text-gray-700">{selectedLog.ip_address}</p>
                            </div>
                            <div>
                                <span className="text-gray-500 text-xs uppercase font-bold">Hash</span>
                                <p className="font-mono text-xs text-gray-400 truncate" title={selectedLog.hash || 'N/A'}>{selectedLog.hash || 'N/A'}</p>
                            </div>
                        </div>

                        {(selectedLog.old_value || selectedLog.new_value) && (
                            <div className="border-t border-gray-100 pt-4 mt-2">
                                <h4 className="font-bold text-gray-700 mb-2 text-xs uppercase">Modifications</h4>
                                {selectedLog.old_value && (
                                    <div className="mb-3">
                                        <div className="text-xs text-red-500 font-bold mb-1">- Ancienne Valeur</div>
                                        <pre className="bg-red-50 p-2 rounded text-xs text-red-800 overflow-x-auto border border-red-100">
                                            {JSON.stringify(selectedLog.old_value, null, 2)}
                                        </pre>
                                    </div>
                                )}
                                {selectedLog.new_value && (
                                    <div>
                                        <div className="text-xs text-green-600 font-bold mb-1">+ Nouvelle Valeur</div>
                                        <pre className="bg-green-50 p-2 rounded text-xs text-green-800 overflow-x-auto border border-green-100">
                                            {JSON.stringify(selectedLog.new_value, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      )}

      {/* --- FISCAL PERIODS TAB --- */}
      {activeTab === 'periods' && (
          <div className="space-y-6">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                            <strong>Règle Fiscale :</strong> Une période clôturée devient <u>immuable</u>. Aucune écriture ne peut être ajoutée, modifiée ou supprimée. 
                            Toute correction devra se faire par contre-passation (écriture inverse) sur l'exercice suivant.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {periods.map(period => (
                    <div key={period.id} className={`bg-white rounded-xl shadow-sm border p-6 flex flex-col justify-between ${period.status === 'CLOSED' ? 'border-gray-200 opacity-75' : 'border-blue-200 ring-1 ring-blue-100'}`}>
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-800">Exercice {period.year}</h3>
                                    <p className="text-sm text-gray-500">Janvier - Décembre</p>
                                </div>
                                {period.status === 'CLOSED' ? (
                                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold flex items-center">
                                        <Lock size={12} className="mr-1"/> Clôturé
                                    </span>
                                ) : (
                                    <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs font-bold flex items-center">
                                        <Activity size={12} className="mr-1"/> Ouvert
                                    </span>
                                )}
                            </div>
                            
                            {period.status === 'CLOSED' && (
                                <div className="text-xs text-gray-500 space-y-1 mb-4">
                                    <p>Clôturé le : {new Date(period.closed_at!).toLocaleDateString()}</p>
                                    <p>Par : {period.closed_by}</p>
                                </div>
                            )}
                        </div>

                        {period.status === 'OPEN' ? (
                            <button 
                                onClick={() => handleClosePeriod(period.year)}
                                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center transition-colors"
                            >
                                <Lock size={16} className="mr-2"/> Clôturer l'Exercice
                            </button>
                        ) : (
                            <button className="w-full bg-gray-100 text-gray-400 py-2 rounded-lg text-sm font-bold flex items-center justify-center cursor-not-allowed">
                                <Lock size={16} className="mr-2"/> Archivé
                            </button>
                        )}
                    </div>
                ))}
            </div>
          </div>
      )}

      {/* --- ROLES TAB --- */}
      {activeTab === 'roles' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Matrice des Rôles</h3>
                  <div className="space-y-4">
                      <div className="border rounded-lg p-4 bg-purple-50 border-purple-100">
                          <h4 className="font-bold text-purple-900">ADMIN (Administrateur)</h4>
                          <p className="text-sm text-purple-700 mb-2">Accès complet à tous les modules.</p>
                          <ul className="text-xs list-disc list-inside text-purple-800">
                              <li>Gestion des utilisateurs et rôles</li>
                              <li>Configuration du système</li>
                              <li>Clôture des exercices fiscaux</li>
                          </ul>
                      </div>
                      <div className="border rounded-lg p-4 bg-blue-50 border-blue-100">
                          <h4 className="font-bold text-blue-900">COMPTABLE (Expert)</h4>
                          <p className="text-sm text-blue-700 mb-2">Gestion financière et fiscale.</p>
                          <ul className="text-xs list-disc list-inside text-blue-800">
                              <li>Création et validation Factures/Dépenses</li>
                              <li>Génération des rapports fiscaux</li>
                              <li>Lecture seule sur l'exploitation</li>
                          </ul>
                      </div>
                      <div className="border rounded-lg p-4 bg-orange-50 border-orange-100">
                          <h4 className="font-bold text-orange-900">MANAGER (Exploitation)</h4>
                          <p className="text-sm text-orange-700 mb-2">Gestion de la flotte et des missions.</p>
                          <ul className="text-xs list-disc list-inside text-orange-800">
                              <li>Planification des missions</li>
                              <li>Gestion des véhicules et chauffeurs</li>
                              <li>Pas d'accès à la validation fiscale</li>
                          </ul>
                      </div>
                  </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                   <h3 className="text-lg font-bold text-gray-800 mb-4">Utilisateurs Actifs</h3>
                   <table className="min-w-full text-sm">
                       <thead>
                           <tr className="border-b">
                               <th className="text-left py-2">Nom</th>
                               <th className="text-left py-2">Rôle</th>
                               <th className="text-right py-2">Dernière activité</th>
                           </tr>
                       </thead>
                       <tbody>
                           <tr className="border-b border-gray-50">
                               <td className="py-3">Ahmed Admin</td>
                               <td><span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-bold">ADMIN</span></td>
                               <td className="text-right text-gray-500">Il y a 2 min</td>
                           </tr>
                           <tr className="border-b border-gray-50">
                               <td className="py-3">Sami Comptable</td>
                               <td><span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold">COMPTABLE</span></td>
                               <td className="text-right text-gray-500">Il y a 15 min</td>
                           </tr>
                           <tr className="border-b border-gray-50">
                               <td className="py-3">Mourad Manager</td>
                               <td><span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs font-bold">MANAGER</span></td>
                               <td className="text-right text-gray-500">Il y a 1h</td>
                           </tr>
                       </tbody>
                   </table>
                   <button className="mt-4 w-full border border-dashed border-gray-300 py-2 text-gray-500 rounded hover:bg-gray-50 text-sm">
                       + Ajouter Utilisateur
                   </button>
              </div>
          </div>
      )}

      {/* --- COMPLIANCE TAB --- */}
      {activeTab === 'compliance' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center mb-4">
                      <Lock className="text-green-600 mr-3" size={28}/>
                      <h3 className="text-xl font-bold text-gray-800">Contrôle d'Intégrité des Données</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-6">
                      Vérification cryptographique des factures validées et du journal comptable. 
                      Assure qu'aucune modification rétroactive n'a été effectuée hors procédure (Conformité Art. 62 Code TVA).
                  </p>
                  
                  {integrityStatus ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                          <div className="flex items-center text-green-800 font-bold mb-2">
                              <CheckCircle size={20} className="mr-2"/> Intégrité Vérifiée
                          </div>
                          <div className="text-sm text-green-700">
                              <p>Documents contrôlés : <strong>{integrityStatus.checkedItems}</strong></p>
                              <p>Anomalies détectées : <strong>{integrityStatus.failedItems}</strong></p>
                              <p className="mt-2 text-xs opacity-75">Dernier contrôle : {new Date().toLocaleTimeString()}</p>
                          </div>
                      </div>
                  ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-center text-gray-500 text-sm">
                          Aucun contrôle récent.
                      </div>
                  )}

                  <button 
                    onClick={runIntegrityCheck}
                    disabled={isChecking}
                    className={`w-full py-3 rounded-lg font-bold text-white shadow-sm transition-colors ${isChecking ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                      {isChecking ? 'Vérification en cours...' : 'Lancer le Diagnostic d\'Intégrité'}
                  </button>
              </div>

              <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center mb-4">
                      <FileText className="text-blue-600 mr-3" size={28}/>
                      <h3 className="text-xl font-bold text-gray-800">Export Contrôle Fiscal</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-6">
                      Génération des fichiers légaux requis en cas de contrôle fiscal.
                      Les fichiers sont générés en lecture seule et horodatés.
                  </p>
                  
                  <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => exportFiscalData('Journal')}>
                          <div className="flex items-center">
                              <div className="bg-blue-100 p-2 rounded mr-3 text-blue-600"><FileText size={18}/></div>
                              <div>
                                  <div className="text-sm font-bold text-gray-800">Journal Général</div>
                                  <div className="text-xs text-gray-500">Tous journaux centralisés</div>
                              </div>
                          </div>
                          <Download size={16} className="text-gray-400"/>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => exportFiscalData('Livre')}>
                          <div className="flex items-center">
                              <div className="bg-blue-100 p-2 rounded mr-3 text-blue-600"><FileText size={18}/></div>
                              <div>
                                  <div className="text-sm font-bold text-gray-800">Grand Livre</div>
                                  <div className="text-xs text-gray-500">Par compte comptable</div>
                              </div>
                          </div>
                          <Download size={16} className="text-gray-400"/>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer bg-red-50 border-red-100" onClick={() => exportFiscalData('FEC')}>
                          <div className="flex items-center">
                              <div className="bg-red-100 p-2 rounded mr-3 text-red-600"><AlertTriangle size={18}/></div>
                              <div>
                                  <div className="text-sm font-bold text-red-900">Fichier des Écritures Comptables (FEC)</div>
                                  <div className="text-xs text-red-700">Norme Tunisienne - Audit</div>
                              </div>
                          </div>
                          <Download size={16} className="text-red-400"/>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
