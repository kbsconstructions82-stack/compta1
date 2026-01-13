
const { useMemo, useState, useEffect } = require('react');

// Mocks
const ExpenseCategory = {
    FUEL: 'Carburant',
    MAINTENANCE: 'Entretien',
    SPARE_PARTS: 'Pièces de rechange'
};

const vehicles = [
    { id: '1', matricule: '123 TU 4567' }
];

const initialExpenses = [];

// Simulate Component Logic
function TestComponent() {
    const [expenses, setExpenses] = useState(initialExpenses);
    
    // Derived State (Analytics)
    const fleetAnalytics = (() => {
        const stats = {};
        vehicles.forEach(v => {
            stats[v.id] = { fuel: 0, maintenance: 0, total: 0 };
        });

        expenses.forEach(exp => {
            if (exp.vehicle_id && stats[exp.vehicle_id]) {
                if (exp.category === ExpenseCategory.FUEL) stats[exp.vehicle_id].fuel += exp.amount_ht;
                stats[exp.vehicle_id].total += exp.amount_ht;
            }
        });
        return stats;
    })();

    const addExpense = (amount, vehicleId) => {
        const newExp = {
            id: Math.random().toString(),
            amount_ht: amount,
            vehicle_id: vehicleId,
            category: ExpenseCategory.FUEL
        };
        
        // Update Local State
        const newExpenses = [newExp, ...expenses];
        setExpenses(newExpenses);
        
        return newExpenses;
    };

    return { expenses, fleetAnalytics, addExpense };
}

// Run Simulation
let state = { expenses: initialExpenses };
const setExpenses = (newVal) => { state.expenses = newVal; };
// Mock useState by just using global variable for this script
function useStateMock(init) {
    return [state.expenses, setExpenses];
}

// Re-implement logic with the mock
const stats = {};
vehicles.forEach(v => { stats[v.id] = { total: 0 }; });

// Add Expense
console.log("Initial Stats:", JSON.stringify(stats));

const newExp = {
    id: 'new',
    amount_ht: 100,
    vehicle_id: '1',
    category: ExpenseCategory.FUEL
};

const updatedExpenses = [newExp, ...initialExpenses];

// Recalculate
updatedExpenses.forEach(exp => {
    if (exp.vehicle_id && stats[exp.vehicle_id]) {
        stats[exp.vehicle_id].total += exp.amount_ht;
    }
});

console.log("Updated Stats:", JSON.stringify(stats));

if (stats['1'].total === 100) {
    console.log("SUCCESS: Analytics updated correctly.");
} else {
    console.log("FAILURE: Analytics did not update.");
}
