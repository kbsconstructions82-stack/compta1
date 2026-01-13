
import { AuditLog, FiscalPeriod, UserRole } from '../types';

// Mock Data
let MOCK_LOGS: AuditLog[] = [
  {
    id: 'log-104',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    user_name: 'Mourad Manager',
    role: 'MANAGER',
    action: 'UPDATE',
    entity: 'VEHICLE',
    entity_ref: '180 TU 4521',
    details: 'Mise à jour date visite technique',
    old_value: { technical_visit_expiry: '2023-12-31' },
    new_value: { technical_visit_expiry: '2024-12-31' },
    ip_address: '192.168.1.15'
  },
  {
    id: 'log-103',
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    user_name: 'Sami Comptable',
    role: 'COMPTABLE',
    action: 'VALIDATE',
    entity: 'INVOICE',
    entity_ref: 'FAC-2024-001',
    details: 'Validation Facture - Numéro séquentiel attribué',
    ip_address: '192.168.1.12',
    hash: 'a1b2c3d4e5f6...'
  },
  {
      id: 'log-102',
      timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      user_name: 'Sami Comptable',
      role: 'COMPTABLE',
      action: 'CREATE',
      entity: 'INVOICE',
      entity_ref: 'FAC-2024-001',
      details: 'Création facture brouillon SOTUVER',
      ip_address: '192.168.1.12'
  },
  {
    id: 'log-101',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    user_name: 'Ahmed Admin',
    role: 'ADMIN',
    action: 'LOGIN',
    entity: 'SYSTEM',
    details: 'Connexion réussie',
    ip_address: '192.168.1.10'
  }
];

let MOCK_FISCAL_PERIODS: FiscalPeriod[] = [
    { id: 'FP-2023', tenant_id: 'T001', year: 2023, status: 'CLOSED', closed_at: '2024-03-31T14:00:00Z', closed_by: 'Ahmed Admin' },
    { id: 'FP-2024', tenant_id: 'T001', year: 2024, status: 'OPEN' }
];

export const getAuditLogs = async (): Promise<AuditLog[]> => {
  return [...MOCK_LOGS]; // Return copy
};

export const getFiscalPeriods = async (): Promise<FiscalPeriod[]> => {
    return [...MOCK_FISCAL_PERIODS];
};

export const closeFiscalPeriod = async (year: number, user: string): Promise<boolean> => {
    const periodIndex = MOCK_FISCAL_PERIODS.findIndex(p => p.year === year);
    if (periodIndex >= 0) {
        MOCK_FISCAL_PERIODS[periodIndex] = {
            ...MOCK_FISCAL_PERIODS[periodIndex],
            status: 'CLOSED',
            closed_at: new Date().toISOString(),
            closed_by: user
        };
        
        // Log the closing action
        MOCK_LOGS.unshift({
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user_name: user,
            role: 'ADMIN',
            action: 'CLOSE_PERIOD',
            entity: 'FISCAL_YEAR',
            entity_ref: year.toString(),
            details: `Clôture irréversible de l'exercice ${year}`,
            ip_address: '127.0.0.1',
            hash: 'f1sCAL-CL0sURE-h4sh'
        });
        return true;
    }
    return false;
};

export const checkDataIntegrity = async (): Promise<{ status: 'OK' | 'ERROR', checkedItems: number, failedItems: number }> => {
  // Simulate cryptographic check of validated invoices against their hashes
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        status: 'OK',
        checkedItems: 142,
        failedItems: 0
      });
    }, 1500);
  });
};

export const exportFiscalData = (type: 'FEC' | 'Livre' | 'Journal') => {
  // Mock function to trigger download
  alert(`Génération du ${type} en cours... Le fichier sera téléchargé au format standard Tunisien.`);
};
