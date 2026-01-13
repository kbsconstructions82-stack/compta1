// Domain Models for the Core Financial Engine

export type TransactionType = 'RECETTE' | 'DEPENSE';
export type ReferenceType = 'FACTURE' | 'DEPENSE' | 'SALAIRE' | 'CAPITAL' | 'MISSION';
export type TVAType = 'COLLECTEE' | 'DEDUCTIBLE';

export interface Transaction {
    id: string;
    date: Date;
    type: TransactionType;
    amount: number;
    currency: string;
    referenceType: ReferenceType;
    referenceId: string;
    category: string;
    description: string;
    truckId?: string; // For analytical accounting
}

export interface TVAEntry {
    id: string;
    date: Date;
    period: string; // YYYY-MM
    type: TVAType;
    baseAmount: number;
    rate: number;
    taxAmount: number;
    referenceSource: string;
    declared: boolean;
}

export interface FinancialSnapshot {
    cashFlow: number;
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
}
