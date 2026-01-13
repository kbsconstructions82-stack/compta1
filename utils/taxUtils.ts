
import { Invoice, Expense } from '../types';
import { SOCIAL_RATES, IRPP_CONFIG, TAX_CONFIG } from '../constants';

// --- Tax Calculations (HT <-> TTC) ---

/**
 * Calculates TTC from HT.
 * Formula: HT + (HT * TVA) + Timbre
 */
export const calculateTTC = (ht: number, tvaRate: number, timbre = 0): number => {
  const tvaAmount = ht * (tvaRate / 100);
  return ht + tvaAmount + timbre;
};

/**
 * Calculates HT from TTC.
 * Formula: (TTC - Timbre) / (1 + TVA)
 */
export const calculateHT = (ttc: number, tvaRate: number, timbre = 0): number => {
  const baseForTax = ttc - timbre;
  return baseForTax / (1 + (tvaRate / 100));
};

/**
 * Calculates TVA amount from HT.
 */
export const calculateTVA = (ht: number, tvaRate: number): number => {
  return ht * (tvaRate / 100);
};

/**
 * Calculates Retenue à la Source (RS).
 * Rule: 1% if Invoice Amount (TTC) >= 1000 TND OR if 'force' is true.
 */
export const calculateRS = (ttcAmount: number, rsRate: number = TAX_CONFIG.RS_TRANSPORT, force: boolean = false): number => {
  if (force) {
    return ttcAmount * (rsRate / 100);
  }
  return 0;
};


// --- Payroll Calculations ---

interface PayrollResult {
  gross: number;
  cnssEmployee: number;
  taxableNetAnnual: number;
  grossTaxAnnual: number;
  irppMonthly: number;
  netSalary: number;
  cnssEmployer: number;
  totalCost: number;
}

export const calculatePayroll = (
  baseSalary: number,
  maritalStatus: 'Single' | 'Married',
  childrenCount: number,
  variableBonus: number = 0 // New parameter for Trip Bonuses
): PayrollResult => {

  // Total Gross = Base + Variable (Primes Trajets)
  const grossSalary = baseSalary + variableBonus;

  // 1. Social Security (CNSS)
  const cnssEmployee = grossSalary * (SOCIAL_RATES.CNSS_EMPLOYEE / 100);
  const cnssEmployerBase = grossSalary * (SOCIAL_RATES.CNSS_EMPLOYER / 100);
  const tfp = grossSalary * (SOCIAL_RATES.TFP / 100);
  const foprolos = grossSalary * (SOCIAL_RATES.FOPROLOS / 100);
  const accident = grossSalary * (SOCIAL_RATES.ACCIDENT_WORK / 100);
  const cnssEmployerTotal = cnssEmployerBase + tfp + foprolos + accident;

  // 2. IRPP Calculation (Annualized)
  // Taxable Base = (Gross - CNSS) * 12 - Professional Deduction
  const annualGrossRaw = (grossSalary - cnssEmployee) * 12;
  const proDeduction = Math.min(annualGrossRaw * IRPP_CONFIG.DEDUCTIONS.PROFESSIONAL_RATE, IRPP_CONFIG.DEDUCTIONS.PROFESSIONAL_CAP);
  const netTaxableAnnual = Math.max(0, annualGrossRaw - proDeduction);

  // Apply Brackets
  let tax = 0;
  let previousLimit = 0;

  for (const bracket of IRPP_CONFIG.BRACKETS) {
    if (netTaxableAnnual > previousLimit) {
      const upper = Math.min(netTaxableAnnual, bracket.limit);
      const taxableAmountInBracket = upper - previousLimit;
      tax += taxableAmountInBracket * bracket.rate;
    }
    previousLimit = bracket.limit;
  }

  // 3. Family Deductions
  let deductions = 0;
  if (maritalStatus === 'Married') {
    deductions += IRPP_CONFIG.DEDUCTIONS.CHEF_FAMILLE;
  }

  const childrenEligible = Math.min(childrenCount, 4);
  // Simplified: 100 per child (In reality: 100, 100, 100, 100)
  deductions += childrenEligible * 100;

  const finalAnnualTax = Math.max(0, tax - deductions);
  const irppMonthly = finalAnnualTax / 12;

  // 4. Net Salary
  const netSalary = grossSalary - cnssEmployee - irppMonthly;

  return {
    gross: grossSalary,
    cnssEmployee,
    taxableNetAnnual: netTaxableAnnual,
    grossTaxAnnual: tax,
    irppMonthly,
    netSalary,
    cnssEmployer: cnssEmployerTotal,
    totalCost: grossSalary + cnssEmployerTotal
  };
};

export const calculatePayrollFromNet = (
  targetNet: number,
  maritalStatus: 'Single' | 'Married',
  childrenCount: number,
  netVariableBonus: number = 0
): PayrollResult & { originalNet: number } => {

  // Total Net Target = Net Base + Net Bonus
  const totalNetTarget = targetNet + netVariableBonus;

  // Binary Search to find Gross that yields this Net
  // Range: Net < Gross < Net * 2 (approx conservative upper bound)
  let low = totalNetTarget;
  let high = totalNetTarget * 2;
  let foundGross = totalNetTarget;

  // Precision: 0.001 TND
  for (let i = 0; i < 50; i++) { // Max iterations
    const mid = (low + high) / 2;
    // Calculate Net for this Gross assumption
    const result = calculatePayroll(mid, maritalStatus, childrenCount, 0); // Bonus already part of gross guess

    if (Math.abs(result.netSalary - totalNetTarget) < 0.001) {
      foundGross = mid;
      break;
    }

    if (result.netSalary < totalNetTarget) {
      low = mid;
    } else {
      high = mid;
    }
    foundGross = mid;
  }

  // Recalculate full details with the found Gross
  // Note: We pass 0 as variableBonus to calculatePayroll because foundGross ALREADY includes everything.
  // We want to return the breakdown.
  const finalSplit = calculatePayroll(foundGross, maritalStatus, childrenCount, 0);

  return {
    ...finalSplit,
    originalNet: targetNet // Store original input for UI reference if needed
  };
};

// --- Accounting Calculations ---

export interface MonthlyFinancials {
  revenueHT: number;
  expensesHT: number;
  netIncome: number;
  tvaCollected: number;
  tvaDeductible: number;
  tvaPayable: number;
  tvaCredit: number;
}

export const calculateMonthlyFinancials = (invoices: Invoice[], expenses: Expense[]): MonthlyFinancials => {
  // 1. Revenue & Output VAT (TVA Collectée)
  // Only Validated or Paid invoices count for turnover in dashboard, 
  // but for VAT declaration, it follows the "fait générateur" (usually Debit/Encaissement). 
  // Let's assume Validated invoices are due.
  const relevantInvoices = invoices.filter(i => i.status !== 'Brouillon' && i.status !== 'Annulée');

  const revenueHT = relevantInvoices.reduce((sum, inv) => sum + inv.items.reduce((s, i) => s + (i.quantity * i.unit_price), 0), 0);
  const tvaCollected = relevantInvoices.reduce((sum, inv) => {
    const invHT = inv.items.reduce((s, i) => s + (i.quantity * i.unit_price), 0);
    return sum + (invHT * (inv.tva_rate / 100));
  }, 0);

  // 2. Expenses & Input VAT (TVA Déductible)
  // Only actual expenses
  const expensesHT = expenses.reduce((sum, exp) => sum + exp.amount_ht, 0);
  const tvaDeductible = expenses.reduce((sum, exp) => sum + exp.tva_amount, 0);

  // 3. Net Calculation
  const tvaNet = tvaCollected - tvaDeductible;

  return {
    revenueHT,
    expensesHT,
    netIncome: revenueHT - expensesHT,
    tvaCollected,
    tvaDeductible,
    tvaPayable: tvaNet > 0 ? tvaNet : 0,
    tvaCredit: tvaNet < 0 ? Math.abs(tvaNet) : 0
  };
};
