import Dexie, { Table } from 'dexie';
import { Invoice, Mission, Expense, Company, Vehicle, Employee, TripRate } from '../../types';

// Define the Sync Queue Item interface
export interface SyncQueueItem {
    id?: number; // Auto-incremented by Dexie
    table: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'UPSERT';
    payload: any;
    timestamp: number;
    retryCount: number;
    status: 'PENDING' | 'SYNCING' | 'FAILED';
    error?: string;
}

// Activity Interface
export interface DriverActivity {
    id?: string; // Optional if we use composite key, but Dexie prefers simple keys or ++id
    driver_id: string;
    route_name: string;
    count: number;
    syncStatus?: string;
}

// Define the Database Schema
export class MomoDB extends Dexie {
    // Entities
    invoices!: Table<Invoice, string>; // ID is UUID string
    missions!: Table<Mission, string>;
    expenses!: Table<Expense, string>;
    companies!: Table<Company, string>; // Maps to 'companies' table in Supabase
    trucks!: Table<Vehicle, string>;
    drivers!: Table<Employee, string>;
    tripRates!: Table<TripRate, string>;
    driverActivities!: Table<DriverActivity, string>;

    // System
    syncQueue!: Table<SyncQueueItem, number>;

    constructor() {
        super('MomoDB');
        
        // Define tables and indexes
        this.version(1).stores({
            invoices: 'id, client_id, date, status, syncStatus',
            missions: 'id, status, date_depart, syncStatus',
            expenses: 'id, date, category, syncStatus',
            companies: 'id, name, is_client, is_supplier, syncStatus',
            trucks: 'id, matricule, syncStatus',
            drivers: 'id, last_name, syncStatus',
            tripRates: 'id, departure, destination, syncStatus',
            driverActivities: '[driver_id+route_name], driver_id, route_name, syncStatus', // Composite key
            syncQueue: '++id, table, status, timestamp'
        });
    }
}

export const db = new MomoDB();

// Helper to add to sync queue
export const addToSyncQueue = async (table: string, action: 'CREATE' | 'UPDATE' | 'DELETE' | 'UPSERT', payload: any) => {
    await db.syncQueue.add({
        table,
        action,
        payload,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'PENDING'
    });
};
