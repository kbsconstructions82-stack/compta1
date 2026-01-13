
import { Invoice, Expense, Vehicle, InvoiceStatus, ExpenseCategory, Payroll, DriverState, TripRate } from '../types';
import { calculatePayroll } from './taxUtils';

// --- Types ---

export interface FinancialReport {
  period: string;
  turnover: number; // Compte 70
  directCosts: number; // Achats consommés (60)
  externalServices: number; // Services extérieurs (61/62)
  personnelCosts: number; // Charges de personnel (64)
  taxes: number; // Impôts et taxes (66)
  ebitda: number; // Résultat d'exploitation
}

export interface OperationalKPIs {
  totalKm: number; // Simulated
  costPerKm: number;
  revenuePerKm: number;
  fuelPercentage: number;
  maintenancePercentage: number;
}

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  action?: string;
}

// --- Generators ---

export const generatePnL = (
  invoices: Invoice[],
  expenses: Expense[],
  employees: DriverState[] = [],
  tripRates: TripRate[] = [],
  monthlyActivity: Record<string, Record<string, number>> = {},
  useTTC: boolean = true // Changed default to true
): FinancialReport => {

  // Helper: Get amount based on mode
  const getAmount = (ht: number, ttc: number) => useTTC ? ttc : ht;

  // 1. Revenue (Class 7)
  const turnover = invoices
    .filter(i => i.status !== InvoiceStatus.DRAFT && i.status !== InvoiceStatus.CANCELLED)
    .reduce((sum, i) => sum + getAmount(i.total_ht, i.total_ttc), 0);

  // 2. Expenses (Class 6)
  const directCosts = expenses
    .filter(e => [ExpenseCategory.FUEL, ExpenseCategory.SPARE_PARTS].includes(e.category))
    .reduce((sum, e) => sum + getAmount(e.amount_ht, e.amount_ttc), 0);

  const externalServices = expenses
    .filter(e => [ExpenseCategory.MAINTENANCE, ExpenseCategory.INSURANCE, ExpenseCategory.TOLLS, ExpenseCategory.OFFICE, ExpenseCategory.OTHER].includes(e.category))
    .reduce((sum, e) => sum + getAmount(e.amount_ht, e.amount_ttc), 0);

  const taxes = expenses
    .filter(e => e.category === ExpenseCategory.TAXES)
    .reduce((sum, e) => sum + getAmount(e.amount_ht, e.amount_ttc), 0);

  // Calculate Personnel Costs (Real Data)
  const personnelCosts = employees.reduce((sum, driver) => {
    // 1. Calculate Bonus
    const activities = monthlyActivity[driver.id] || {};
    let totalBonus = 0;
    Object.entries(activities).forEach(([routeName, count]) => {
      // 1. Try exact match "Departure - Destination"
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
    });

    // 2. Calculate Payroll
    const payroll = calculatePayroll(driver.baseSalary, driver.maritalStatus, driver.childrenCount, totalBonus);
    return sum + payroll.totalCost;
  }, 0);

  return {
    period: 'Exercice 2024',
    turnover,
    directCosts,
    externalServices,
    personnelCosts,
    taxes,
    ebitda: turnover - (directCosts + externalServices + personnelCosts + taxes)
  };
};

export const generateKPIs = (invoices: Invoice[], expenses: Expense[], vehicles: Vehicle[]): OperationalKPIs => {
  const report = generatePnL(invoices, expenses);

  // Simulation: Assume 4500km per month per truck on average
  const totalKm = vehicles.length * 4500 * 1; // 1 month snapshot

  const totalExpenses = report.directCosts + report.externalServices + report.personnelCosts + report.taxes;

  // Avoid division by zero
  const safeKm = totalKm || 1;

  return {
    totalKm,
    costPerKm: totalExpenses / safeKm,
    revenuePerKm: report.turnover / safeKm,
    fuelPercentage: (report.directCosts / (totalExpenses || 1)) * 100,
    maintenancePercentage: (expenses.filter(e => e.category === ExpenseCategory.MAINTENANCE).reduce((s, e) => s + e.amount_ht, 0) / (totalExpenses || 1)) * 100
  };
};

export const generateAlerts = (invoices: Invoice[], vehicles: Vehicle[], missions?: any[]): Alert[] => {
  const alerts: Alert[] = [];
  const today = new Date();

  // 0. Mission Alerts (Incomplete / Closed but not Delivered)
  if (missions) {
    missions.forEach(m => {
      if (m.status === 'Incomplète') {
        alerts.push({
          id: `mission-${m.id}-incomplete`,
          type: 'critical',
          message: `Mission #${m.missionNumber} incomplète (Incident/Non Livrée)`,
          action: 'Vérifier'
        });
      }
    });
  }

  // 1. Unpaid Invoices (Recouvrement)
  invoices.forEach(inv => {
    if (inv.status === InvoiceStatus.VALIDATED && inv.due_date) {
      const dueDate = new Date(inv.due_date);
      if (today > dueDate) {
        const diffDays = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
        alerts.push({
          id: `inv-${inv.id}`,
          type: 'critical',
          message: `Facture ${inv.number} (${inv.total_ttc.toFixed(3)} TND) en retard de ${diffDays} jours`,
          action: 'Relancer Client'
        });
      }
    }
  });

  // 2. Fleet Expiry
  vehicles.forEach(v => {
    const checkExpiry = (dateStr: string, label: string) => {
      if (!dateStr) return;
      const expDate = new Date(dateStr);
      if (isNaN(expDate.getTime())) return;

      const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

      if (diffDays < 0) {
        alerts.push({ id: `veh-${v.id}-${label}`, type: 'critical', message: `${v.matricule}: ${label} expirée !`, action: 'Renouveler' });
      } else if (diffDays < 15) {
        alerts.push({ id: `veh-${v.id}-${label}`, type: 'warning', message: `${v.matricule}: ${label} expire dans ${diffDays}j`, action: 'Préparer' });
      }
    };

    checkExpiry(v.insurance_expiry, 'Assurance');
    checkExpiry(v.technical_visit_expiry, 'Visite Technique');
    checkExpiry(v.vignette_expiry, 'Taxe Circulation');
  });

  // 3. Tax Deadlines (Simulated logic)
  const currentDay = today.getDate();
  // In Tunisia, Monthly declaration is due by the 15th (Physique) or 28th (Morale)
  if (currentDay > 20 && currentDay < 28) {
    alerts.push({
      id: 'tax-decl',
      type: 'warning',
      message: 'Déclaration Mensuelle (TVA/TNSS) à déposer avant le 28',
      action: 'Déclarer'
    });
  }

  // Sort alerts by priority: Critical > Warning > Info
  return alerts.sort((a, b) => {
    const priority = { critical: 0, warning: 1, info: 2 };
    return priority[a.type] - priority[b.type];
  });
};
