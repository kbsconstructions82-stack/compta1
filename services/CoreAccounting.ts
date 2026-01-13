import { Transaction, TransactionType, ReferenceType, FinancialSnapshot } from './types';

export class CoreAccounting {
    private transactions: Transaction[] = [];
    private static instance: CoreAccounting;

    private constructor() {}

    public static getInstance(): CoreAccounting {
        if (!CoreAccounting.instance) {
            CoreAccounting.instance = new CoreAccounting();
        }
        return CoreAccounting.instance;
    }

    /**
     * Records a financial transaction into the central ledger
     */
    public recordTransaction(
        type: TransactionType,
        amount: number,
        category: string,
        refType: ReferenceType,
        refId: string,
        description: string,
        truckId?: string
    ): Transaction {
        const transaction: Transaction = {
            id: `txn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            date: new Date(),
            type,
            amount,
            currency: 'TND',
            referenceType: refType,
            referenceId: refId,
            category,
            description,
            truckId
        };

        this.transactions.push(transaction);
        console.log(`[CoreAccounting] Transaction Recorded: ${type} ${amount} TND (${description})`);
        return transaction;
    }

    /**
     * Calculates real-time financial indicators
     */
    public getSnapshot(): FinancialSnapshot {
        const revenue = this.transactions
            .filter(t => t.type === 'RECETTE')
            .reduce((sum, t) => sum + t.amount, 0);

        const expenses = this.transactions
            .filter(t => t.type === 'DEPENSE')
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            cashFlow: revenue - expenses, // Simplified cash flow
            totalRevenue: revenue,
            totalExpenses: expenses,
            netProfit: revenue - expenses
        };
    }

    /**
     * Analytical accounting: Get profit by truck
     */
    public getProfitByTruck(truckId: string): number {
        const truckTxns = this.transactions.filter(t => t.truckId === truckId);
        
        const revenue = truckTxns
            .filter(t => t.type === 'RECETTE')
            .reduce((sum, t) => sum + t.amount, 0);

        const expenses = truckTxns
            .filter(t => t.type === 'DEPENSE')
            .reduce((sum, t) => sum + t.amount, 0);

        return revenue - expenses;
    }

    public getTransactions(): Transaction[] {
        return this.transactions;
    }
}
