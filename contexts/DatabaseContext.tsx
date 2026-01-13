import React, { createContext, useContext, useState, useEffect } from 'react';
import { CoreAccounting } from '../services/CoreAccounting';
import { TVAEngine } from '../services/TVAEngine';
import { Transaction, TVAEntry } from '../services/types';
import { INITIAL_MISSIONS, MOCK_VEHICLES } from '../constants';

interface DatabaseContextType {
    coreAccounting: CoreAccounting;
    tvaEngine: TVAEngine;
    transactions: Transaction[];
    tvaJournal: TVAEntry[];
    refreshData: () => void;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const coreAccounting = CoreAccounting.getInstance();
    const tvaEngine = TVAEngine.getInstance();
    
    // Local state to trigger re-renders when data changes in the singletons
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [tvaJournal, setTvaJournal] = useState<TVAEntry[]>([]);

    const refreshData = () => {
        setTransactions([...coreAccounting.getTransactions()]);
        setTvaJournal([...tvaEngine.getJournal()]);
    };

    // Initial Migration / Seeding
    useEffect(() => {
        // Example: Seed some initial data from MOCK if needed
        console.log("Database Provider Initialized - Ready for Migration");
    }, []);

    return (
        <DatabaseContext.Provider value={{ 
            coreAccounting, 
            tvaEngine, 
            transactions, 
            tvaJournal,
            refreshData 
        }}>
            {children}
        </DatabaseContext.Provider>
    );
};

export const useDatabase = () => {
    const context = useContext(DatabaseContext);
    if (context === undefined) {
        throw new Error('useDatabase must be used within a DatabaseProvider');
    }
    return context;
};
