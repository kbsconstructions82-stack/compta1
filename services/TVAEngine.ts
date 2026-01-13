import { TVAEntry, TVAType } from './types';

export class TVAEngine {
    private journal: TVAEntry[] = [];
    private static instance: TVAEngine;

    // Taux TVA Tunisie 2025
    public static readonly RATES = {
        TRANSPORT: 7.00,
        STANDARD: 19.00,
        EXONERE: 0.00
    };

    private constructor() {}

    public static getInstance(): TVAEngine {
        if (!TVAEngine.instance) {
            TVAEngine.instance = new TVAEngine();
        }
        return TVAEngine.instance;
    }

    /**
     * Calculates VAT amount based on base amount and rate
     */
    public calculateVAT(baseAmount: number, rate: number): number {
        return Number((baseAmount * (rate / 100)).toFixed(3));
    }

    /**
     * Logs a VAT operation (Collected or Deductible)
     */
    public logOperation(
        type: TVAType,
        baseAmount: number,
        rate: number,
        refSource: string,
        date: Date = new Date()
    ): TVAEntry {
        const taxAmount = this.calculateVAT(baseAmount, rate);
        const period = date.toISOString().slice(0, 7); // YYYY-MM

        const entry: TVAEntry = {
            id: `tva-${Date.now()}`,
            date,
            period,
            type,
            baseAmount,
            rate,
            taxAmount,
            referenceSource: refSource,
            declared: false
        };

        this.journal.push(entry);
        console.log(`[TVAEngine] ${type}: ${taxAmount} TND (Base: ${baseAmount}, Rate: ${rate}%)`);
        return entry;
    }

    public getJournal(): TVAEntry[] {
        return [...this.journal];
    }

    /**
     * Generates the monthly VAT declaration data
     */
    public generateMonthlyDeclaration(period: string): { collected: number, deductible: number, net: number } {
        const entries = this.journal.filter(e => e.period === period);

        const collected = entries
            .filter(e => e.type === 'COLLECTEE')
            .reduce((sum, e) => sum + e.taxAmount, 0);

        const deductible = entries
            .filter(e => e.type === 'DEDUCTIBLE')
            .reduce((sum, e) => sum + e.taxAmount, 0);

        return {
            collected,
            deductible,
            net: collected - deductible
        };
    }
}
