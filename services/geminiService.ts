import { GoogleGenAI } from "@google/genai";
import { Invoice, Expense, Vehicle, Mission } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// System instruction for the AI to act as a Tunisian accounting expert
const SYSTEM_INSTRUCTION = `You are a Tunisian Expert Accountant and Software Architect specialized in the transport sector.
You understand the Code de la TVA, IRPP, IS, and specific regulations for "Transport Routier de Marchandises".
All monetary values are in TND (Tunisian Dinar).
When analyzing data, look for anomalies in fuel consumption, maintenance costs, and tax compliance (Retenue à la source, Timbre Fiscal).`;

export const analyzeFinancialHealth = async (
  invoices: Invoice[],
  expenses: Expense[]
): Promise<string> => {
  try {
    const dataSummary = JSON.stringify({
      totalRevenue: invoices.reduce((acc, inv) => acc + inv.items.reduce((s, i) => s + (i.quantity * i.unit_price), 0), 0),
      totalExpenses: expenses.reduce((acc, exp) => acc + exp.amount_ht, 0),
      expenseCategories: expenses.map(e => e.category),
      invoiceCount: invoices.length
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this financial summary for a Tunisian transport company.
      Provide 3 key insights regarding profitability and tax optimization (TVA/IS).
      Data: ${dataSummary}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    return response.text || "Analyse non disponible.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Erreur lors de l'analyse IA. Veuillez vérifier votre clé API.";
  }
};

export const suggestOptimization = async (vehicles: Vehicle[], missions: Mission[]): Promise<string> => {
    try {
        const fleetData = JSON.stringify({
            vehicleCount: vehicles.length,
            missionCount: missions.length,
            utilization: "High maintenance frequency detected on Volvo fleet" // Simulated insight
        });

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Based on the fleet and mission data, suggest operational optimizations to reduce costs (fuel, maintenance). Focus on Tunisian road conditions and regulations. Data: ${fleetData}`,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION
            }
        });
        return response.text || "Pas de suggestions.";
    } catch (e) {
        return "Service IA indisponible.";
    }
}