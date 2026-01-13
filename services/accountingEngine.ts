
import { Invoice, Expense, AccountingEntry, InvoiceStatus, ExpenseCategory, ChartOfAccount } from '../types';
import { calculatePayroll } from '../utils/taxUtils';
import { MOCK_DRIVERS } from '../constants';

// --- PLAN COMPTABLE TUNISIEN SIMPLIFIÉ ---
export const CHART_OF_ACCOUNTS: Record<string, ChartOfAccount> = {
  '411': { code: '411', label: 'Clients', type: 'ASSET' },
  '401': { code: '401', label: 'Fournisseurs d\'exploitation', type: 'LIABILITY' },

  // Updated per strict requirements
  '44571': { code: '44571', label: 'État, TVA Collectée', type: 'LIABILITY' },
  '44566': { code: '44566', label: 'État, TVA Déductible', type: 'ASSET' },

  '4367': { code: '4367', label: 'État, Timbre Fiscal', type: 'LIABILITY' },
  '432': { code: '432', label: 'État, Impôt sur les revenus (IRPP)', type: 'LIABILITY' },
  '4531': { code: '4531', label: 'CNSS - Cotisations à payer', type: 'LIABILITY' },
  '421': { code: '421', label: 'Personnel - Rémunérations dues', type: 'LIABILITY' },
  '532': { code: '532', label: 'Banques', type: 'ASSET' },
  '540': { code: '540', label: 'Caisse', type: 'ASSET' },

  // Classe 6 - Charges
  '6061': { code: '6061', label: 'Carburants et lubrifiants', type: 'EXPENSE' },
  '6063': { code: '6063', label: 'Pièces de rechange', type: 'EXPENSE' },
  '615': { code: '615', label: 'Entretien et réparations', type: 'EXPENSE' },
  '616': { code: '616', label: 'Primes d\'assurance', type: 'EXPENSE' },
  '640': { code: '640', label: 'Charges du Personnel (Salaires Bruts)', type: 'EXPENSE' },
  '647': { code: '647', label: 'Charges Sociales Légales (CNSS Patronale)', type: 'EXPENSE' },
  '66': { code: '66', label: 'Impôts, taxes et versements assimilés', type: 'EXPENSE' },
  '6068': { code: '6068', label: 'Autres achats non stockés', type: 'EXPENSE' },

  // Classe 7 - Produits
  '701': { code: '701', label: 'Prestations de Services (Transport)', type: 'REVENUE' },
};

// --- MAPPING HELPERS ---
const getExpenseAccount = (category: ExpenseCategory): string => {
  switch (category) {
    case ExpenseCategory.FUEL: return '6061';
    case ExpenseCategory.SPARE_PARTS: return '6063';
    case ExpenseCategory.MAINTENANCE: return '615';
    case ExpenseCategory.INSURANCE: return '616';
    case ExpenseCategory.TAXES: return '66';
    case ExpenseCategory.SALARY: return '640';
    default: return '6068';
  }
};

const createEntry = (
  date: string,
  journal: 'VT' | 'AC' | 'OD' | 'BQ',
  account: string,
  label: string,
  debit: number,
  credit: number,
  refId: string,
  refType: any
): AccountingEntry => ({
  id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  date,
  journal_code: journal,
  account_code: account,
  account_label: CHART_OF_ACCOUNTS[account]?.label || 'Compte Inconnu',
  label,
  debit: parseFloat(debit.toFixed(3)),
  credit: parseFloat(credit.toFixed(3)),
  reference_id: refId,
  reference_type: refType
});

// --- ENGINE GENERATORS ---

export const generateInvoiceEntries = (invoices: Invoice[]): AccountingEntry[] => {
  const entries: AccountingEntry[] = [];

  invoices.forEach(inv => {
    if (inv.status === InvoiceStatus.DRAFT || inv.status === InvoiceStatus.CANCELLED) return;

    const label = `Facture N° ${inv.number} - ${inv.clientName}`;

    // 1. Debit Client (Total TTC)
    entries.push(createEntry(inv.date, 'VT', '411', label, inv.total_ttc, 0, inv.id, 'INVOICE'));

    // 2. Credit Revenue (Total HT) - Using 701 as per strict rules
    entries.push(createEntry(inv.date, 'VT', '701', label, 0, inv.total_ht, inv.id, 'INVOICE'));

    // 3. Credit VAT (TVA Collectée)
    if (inv.tva_amount > 0) {
      entries.push(createEntry(inv.date, 'VT', '44571', label, 0, inv.tva_amount, inv.id, 'INVOICE'));
    }

    // 4. Credit Timbre Fiscal
    if (inv.timbre_fiscal > 0) {
      entries.push(createEntry(inv.date, 'VT', '4367', label, 0, inv.timbre_fiscal, inv.id, 'INVOICE'));
    }
  });

  return entries;
};

export const generateExpenseEntries = (expenses: Expense[]): AccountingEntry[] => {
  const entries: AccountingEntry[] = [];

  expenses.forEach(exp => {
    // Determine Journal (Purchase vs Bank/Cash if paid immediately - simplifying to AC (Achat) assuming generic accrual)
    const journal = 'AC';
    const label = `${exp.description} (${exp.category})`;
    const accountCode = getExpenseAccount(exp.category);

    // 1. Debit Expense Account (HT)
    entries.push(createEntry(exp.date, journal, accountCode, label, exp.amount_ht, 0, exp.id, 'EXPENSE'));

    // 2. Debit VAT Deductible (if applicable)
    if (exp.is_deductible && exp.tva_amount > 0) {
      entries.push(createEntry(exp.date, journal, '44566', label, exp.tva_amount, 0, exp.id, 'EXPENSE'));
    }

    // 3. Credit Supplier/Bank (TTC)
    entries.push(createEntry(exp.date, journal, '401', label, 0, exp.amount_ttc, exp.id, 'EXPENSE'));
  });

  return entries;
};

export const generatePayrollEntries = (month: string = new Date().toISOString().split('T')[0]): AccountingEntry[] => {
  // Generates entries based on Mock Drivers for the current month
  // Real implementation would take a 'Payroll' object list
  const entries: AccountingEntry[] = [];
  const label = "Paie Mensuelle - Chauffeurs";

  MOCK_DRIVERS.forEach(driver => {
    // Generate data on the fly
    const payroll = calculatePayroll(driver.baseSalary, 'Married', driver.childrenCount);

    // 1. Debit 640 (Salaire Brut)
    entries.push(createEntry(month, 'OD', '640', `${label} (${driver.fullName})`, payroll.gross, 0, driver.id, 'PAYROLL'));

    // 2. Debit 647 (Charges Patronales)
    entries.push(createEntry(month, 'OD', '647', `${label} (${driver.fullName}) - CNSS Pat.`, payroll.cnssEmployer, 0, driver.id, 'PAYROLL'));

    // 3. Credit 4531 (CNSS à payer = Part Ouvrière + Part Patronale)
    const totalCNSS = payroll.cnssEmployee + payroll.cnssEmployer;
    entries.push(createEntry(month, 'OD', '4531', `${label} (${driver.fullName}) - CNSS Global`, 0, totalCNSS, driver.id, 'CNSS'));

    // 4. Credit 432 (IRPP Retenue à la source)
    entries.push(createEntry(month, 'OD', '432', `${label} (${driver.fullName}) - IRPP`, 0, payroll.irppMonthly, driver.id, 'PAYROLL'));

    // 5. Credit 421 (Net à payer)
    entries.push(createEntry(month, 'OD', '421', `${label} (${driver.fullName}) - Net`, 0, payroll.netSalary, driver.id, 'PAYROLL'));
  });

  return entries;
};

// --- MAIN ENGINE ---
export const runAccountingEngine = (invoices: Invoice[], expenses: Expense[]): AccountingEntry[] => {
  const invoiceEntries = generateInvoiceEntries(invoices);
  const expenseEntries = generateExpenseEntries(expenses);
  const payrollEntries = generatePayrollEntries(); // Uses mock data internally

  // Concatenate and sort by date
  return [...invoiceEntries, ...expenseEntries, ...payrollEntries].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
};

// --- VAT SIMULATION ENGINE ---

export interface VatSimulationResult {
  vatCollected: number;
  vatDeductible: number;
  netVat: number;
  finalPayable: number;
  finalCredit: number;
  alert: string | null;
}

export const simulateVAT = (
  entries: AccountingEntry[],
  periodStart: string,
  periodEnd: string,
  reportCredit: number
): VatSimulationResult => {
  const start = new Date(periodStart).getTime();
  const end = new Date(periodEnd).getTime();

  // Filter entries in period
  const periodEntries = entries.filter(e => {
    const d = new Date(e.date).getTime();
    return d >= start && d <= end;
  });

  // 1. Calculate Collected VAT (44571 - Credit)
  const vatCollected = periodEntries
    .filter(e => e.account_code === '44571')
    .reduce((sum, e) => sum + e.credit, 0);

  // 2. Calculate Deductible VAT (44566 - Debit)
  const vatDeductible = periodEntries
    .filter(e => e.account_code === '44566')
    .reduce((sum, e) => sum + e.debit, 0);

  // 3. Net Calculation
  const netVat = vatCollected - vatDeductible - reportCredit;

  // 4. Alert Logic
  let alert: string | null = null;
  if (netVat > 5000) {
    alert = "Attention : Montant de TVA à payer élevé (> 5000 TND). Vérifiez votre trésorerie.";
  } else if (netVat < -2000) {
    alert = "Crédit de TVA important. Vérifiez s'il s'agit d'un crédit structurel (Investissement).";
  }

  return {
    vatCollected: parseFloat(vatCollected.toFixed(3)),
    vatDeductible: parseFloat(vatDeductible.toFixed(3)),
    netVat: parseFloat(netVat.toFixed(3)),
    finalPayable: netVat > 0 ? parseFloat(netVat.toFixed(3)) : 0,
    finalCredit: netVat < 0 ? parseFloat(Math.abs(netVat).toFixed(3)) : 0,
    alert
  };
};
