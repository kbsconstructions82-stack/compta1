
import { AccountingEntry, Invoice, Expense, FiscalDeclarationTVA, FiscalDeclarationRS, FiscalDeclarationCNSS, FiscalDeclarationIS, EtatClientFournisseur, DriverState } from '../types';
import { MOCK_DRIVERS } from '../constants';
import { calculatePayroll } from '../utils/taxUtils';

// Helper to filter entries by date range
const filterEntriesByDate = (entries: AccountingEntry[], start: string, end: string) => {
    const startDate = new Date(start).getTime();
    const endDate = new Date(end).getTime();
    return entries.filter(e => {
        const d = new Date(e.date).getTime();
        return d >= startDate && d <= endDate;
    });
};

// 1. DÉCLARATION TVA
export const generateTVADeclaration = (entries: AccountingEntry[], periodMonth: string, previousCredit: number = 0): FiscalDeclarationTVA => {
    // Determine start/end of month
    const year = parseInt(periodMonth.split('-')[0]);
    const month = parseInt(periodMonth.split('-')[1]);
    const startDate = `${periodMonth}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${periodMonth}-${lastDay}`;

    const filtered = filterEntriesByDate(entries, startDate, endDate);

    // MAPPING RULES:
    // Base HT Ventes = Credit on account 701
    const baseSales = filtered
        .filter(e => e.account_code === '701')
        .reduce((sum, e) => sum + e.credit, 0);

    // VAT Collected = Credit on account 44571
    const vatCollected = filtered
        .filter(e => e.account_code === '44571')
        .reduce((sum, e) => sum + e.credit, 0);

    // Base HT Achats = Debit on Class 6 accounts (simplified to specific list for demo)
    const basePurchases = filtered
        .filter(e => e.account_code.startsWith('6'))
        .reduce((sum, e) => sum + e.debit, 0);

    // VAT Deductible = Debit on account 44566
    const vatDeductible = filtered
        .filter(e => e.account_code === '44566')
        .reduce((sum, e) => sum + e.debit, 0);

    const netVat = vatCollected - vatDeductible - previousCredit;

    return {
        period: periodMonth,
        sales: {
            base_ht: parseFloat(baseSales.toFixed(3)),
            vat_collected: parseFloat(vatCollected.toFixed(3)),
            rate: 7 // Simplified for transport, usually mixed
        },
        purchases: {
            base_ht: parseFloat(basePurchases.toFixed(3)),
            vat_deductible: parseFloat(vatDeductible.toFixed(3))
        },
        credit_reported: previousCredit,
        vat_payable: netVat > 0 ? parseFloat(netVat.toFixed(3)) : 0,
        vat_credit: netVat < 0 ? parseFloat(Math.abs(netVat).toFixed(3)) : 0
    };
};

// 2. DÉCLARATION RETENUE À LA SOURCE (RS)
export const generateRSDeclaration = (expenses: Expense[], periodMonth: string, employees: DriverState[] = []): FiscalDeclarationRS => {
    // 1. Calculate Payroll RS from real employees
    let salaryBase = 0;
    let salaryWithheld = 0;
    let employeeCount = 0;

    // Use real employees if available, otherwise fallback to MOCK
    const employeeData = employees.length > 0 ? employees : MOCK_DRIVERS;
    
    employeeData.forEach(employee => {
        const payroll = calculatePayroll(employee.baseSalary, employee.maritalStatus || 'Single', employee.childrenCount || 0);
        salaryBase += payroll.gross;
        salaryWithheld += payroll.irppMonthly;
        employeeCount++;
    });

    // 2. Honoraires / Loyers from Expenses (Simplified Logic: Assume expenses > 1000 TND might have RS if configured)
    // This is a placeholder as Expense interface needs specific RS fields for full implementation
    const honorairesBase = 0;
    const honorairesWithheld = 0;

    return {
        month: periodMonth,
        withholding: [
            {
                type: 'SALAIRES',
                base: parseFloat(salaryBase.toFixed(3)),
                rate: 0, // Variable
                withheld_amount: parseFloat(salaryWithheld.toFixed(3)),
                beneficiary_count: employeeCount
            },
            {
                type: 'HONORAIRES',
                base: honorairesBase,
                rate: 15,
                withheld_amount: honorairesWithheld,
                beneficiary_count: 0
            }
        ],
        total_withheld: parseFloat((salaryWithheld + honorairesWithheld).toFixed(3))
    };
};

// 3. DÉCLARATION CNSS
export const generateCNSSDeclaration = (quarter: string, employees: DriverState[] = []): FiscalDeclarationCNSS => {
    // quarter format: '2024-Q1'
    // Calculate 3 months of payroll from real employees
    const employeeData = employees.length > 0 ? employees : MOCK_DRIVERS;
    
    const employeesData = employeeData.map(employee => {
        const payroll = calculatePayroll(employee.baseSalary, employee.maritalStatus || 'Single', employee.childrenCount || 0);
        // Multiply by 3 for quarter
        return {
            cnss_number: employee.cin || '00000000',
            full_name: employee.fullName,
            gross_salary: parseFloat((payroll.gross * 3).toFixed(3)),
            employee_part: parseFloat((payroll.cnssEmployee * 3).toFixed(3)),
            employer_part: parseFloat((payroll.cnssEmployer * 3).toFixed(3))
        };
    });

    const totalDue = employeesData.reduce((sum, emp) => sum + emp.employee_part + emp.employer_part, 0);

    return {
        quarter,
        employees: employeesData,
        total_due: parseFloat(totalDue.toFixed(3))
    };
};

// 4. DÉCLARATION IS (IMPÔT SUR LES SOCIÉTÉS)
export const generateISDeclaration = (entries: AccountingEntry[], year: number): FiscalDeclarationIS => {
    // Filter by year
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    const filtered = filterEntriesByDate(entries, yearStart, yearEnd);

    // Revenue (Class 7)
    const revenue = filtered
        .filter(e => e.account_code.startsWith('7'))
        .reduce((sum, e) => sum + e.credit, 0);

    // Expenses (Class 6)
    // Deductible usually requires detailed analysis, here we assume all Class 6 are deductible for simulation
    const expenses = filtered
        .filter(e => e.account_code.startsWith('6'))
        .reduce((sum, e) => sum + e.debit, 0);

    // Simulate non-deductible (e.g. fines, luxury cars) -> 0 for now
    const nonDeductible = 0;

    const result = revenue - expenses + nonDeductible;
    const tax = result > 0 ? result * 0.15 : 0; // 15% Standard Rate

    return {
        year,
        revenue: parseFloat(revenue.toFixed(3)),
        expenses_deductible: parseFloat(expenses.toFixed(3)),
        expenses_nondeductible: nonDeductible,
        taxable_profit: parseFloat(result.toFixed(3)),
        corporate_tax: parseFloat(tax.toFixed(3))
    };
};

// 5. ETAT 930 (CLIENTS)
export const generateEtatClient = (invoices: Invoice[]): EtatClientFournisseur[] => {
    const clients: Record<string, EtatClientFournisseur> = {};

    invoices.forEach(inv => {
        if (inv.status === 'Brouillon' || inv.status === 'Annulée') return;

        if (!clients[inv.client_id]) {
            clients[inv.client_id] = {
                id: inv.client_id,
                name: inv.clientName || 'Client Inconnu',
                matricule_fiscal: '0000000/X/X/000', // Mock, should come from Client DB
                total_ht: 0,
                total_tva: 0
            };
        }
        clients[inv.client_id].total_ht += inv.total_ht;
        clients[inv.client_id].total_tva = (clients[inv.client_id].total_tva || 0) + inv.tva_amount;
    });

    return Object.values(clients);
};

// 6. ETAT 940 (FOURNISSEURS)
export const generateEtatFournisseur = (expenses: Expense[]): EtatClientFournisseur[] => {
    const suppliers: Record<string, EtatClientFournisseur> = {};

    expenses.forEach(exp => {
        const description = exp.description || '';
        const supplierName = description.split('-')[0].trim() || 'Divers'; // Mock extraction
        const key = supplierName; // ideally supplier_id

        if (!suppliers[key]) {
            suppliers[key] = {
                id: key,
                name: supplierName,
                matricule_fiscal: '0000000/F/F/000', // Mock
                total_ht: 0,
                total_tva: 0
            };
        }
        suppliers[key].total_ht += exp.amount_ht;
        suppliers[key].total_tva = (suppliers[key].total_tva || 0) + exp.tva_amount;
    });

    return Object.values(suppliers);
};
