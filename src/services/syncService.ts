import { db, SyncQueueItem } from '../lib/db';
import { supabase } from '../lib/supabase';

export class SyncService {
    private isSyncing = false;

    // --- MAIN SYNC LOOP ---
    // Should be called when:
    // 1. App starts
    // 2. Network status changes to Online
    // 3. New item added to queue (if online)
    public async processQueue() {
        if (this.isSyncing) return;
        if (!navigator.onLine) return;

        this.isSyncing = true;
        console.log('[SyncService] Starting sync process...');

        try {
            // 1. Get all pending items
            const pendingItems = await db.syncQueue
                .where('status')
                .equals('PENDING')
                .sortBy('timestamp');

            if (pendingItems.length === 0) {
                console.log('[SyncService] Queue empty.');
                this.isSyncing = false;
                return;
            }

            console.log(`[SyncService] Found ${pendingItems.length} items to sync.`);

            // 2. Process one by one (Sequential to maintain order)
            for (const item of pendingItems) {
                await this.processItem(item);
            }

        } catch (error) {
            console.error('[SyncService] Global sync error:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    private async processItem(item: SyncQueueItem) {
        // Mark as SYNCING
        await db.syncQueue.update(item.id!, { status: 'SYNCING' });

        try {
            let result;

            // --- SUPABASE OPERATION ---
            switch (item.action) {
                case 'CREATE':
                    // Remove temporary ID if it was generated locally and Supabase expects to generate it
                    // OR keep it if we use UUIDs generated client-side (Recommended for offline-first)
                    result = await supabase.from(item.table).insert(item.payload).select().single();
                    break;
                case 'UPDATE':
                    result = await supabase.from(item.table).update(item.payload).match({ id: item.payload.id }).select().single();
                    break;
                case 'UPSERT':
                    // Upsert relies on Primary Key or Unique Constraints
                    // For tables like driver_activities, the constraint is typically (driver_id, route_name)
                    result = await supabase.from(item.table).upsert(item.payload).select().single();
                    break;
                case 'DELETE':
                    result = await supabase.from(item.table).delete().match({ id: item.payload.id });
                    break;
            }

            if (result && result.error) {
                throw new Error(result.error.message);
            }

            // --- SUCCESS ---
            console.log(`[SyncService] Item ${item.id} synced successfully.`);
            // Remove from queue
            await db.syncQueue.delete(item.id!);

        } catch (error: any) {
            console.error(`[SyncService] Failed to sync item ${item.id}:`, error);
            
            // CRITICAL: Check for invalid UUID syntax to avoid infinite loops
            if (error.message && error.message.includes('invalid input syntax for type uuid')) {
                console.error(`[SyncService] Critical Error: Invalid UUID found in queue for item ${item.id}. Marking as FAILED permanently to unblock queue.`);
                await db.syncQueue.update(item.id!, { 
                    status: 'FAILED', 
                    error: `Permanent Failure: ${error.message}` 
                });
                return; // Stop processing this item
            }

            // CRITICAL: Check for foreign key violations (data doesn't exist in Supabase)
            if (error.message && (
                error.message.includes('violates foreign key constraint') ||
                error.message.includes('foreign key') ||
                error.message.includes('fkey')
            )) {
                console.error(`[SyncService] Foreign Key Error: Data referenced in item ${item.id} doesn't exist in Supabase. Marking as FAILED permanently.`);
                await db.syncQueue.update(item.id!, { 
                    status: 'FAILED', 
                    error: `Foreign Key Violation: ${error.message}` 
                });
                return; // Stop processing this item
            }

            // Increment retry count or mark FAILED
            if (item.retryCount >= 3) {
                await db.syncQueue.update(item.id!, { 
                    status: 'FAILED', 
                    error: error.message || 'Unknown error' 
                });
            } else {
                await db.syncQueue.update(item.id!, { 
                    status: 'PENDING', 
                    retryCount: item.retryCount + 1 
                });
            }
        }
    }

    // --- DATA PULL (Supabase -> Local) ---
    // Should be called periodically or on App Start
    public async pullData(table: string) {
        if (!navigator.onLine) return;

        try {
            const { data, error } = await supabase.from(table).select('*');
            
            if (error) throw error;

            if (data) {
                // Bulk put (Upsert) into IndexedDB
                // @ts-ignore
                await db.table(table).bulkPut(data);
                console.log(`[SyncService] Pulled ${data.length} records for ${table}`);
            }
        } catch (error) {
            console.error(`[SyncService] Pull failed for ${table}:`, error);
        }
    }
    
    // Helper to pull all essential tables
    public async pullAll() {
        await this.pullData('clients');
        await this.pullData('camions'); // Map to 'trucks' if needed, ensure table names match
        await this.pullData('chauffeurs');
        await this.pullData('missions');
        await this.pullData('factures');
        await this.pullData('depenses');
    }
}

export const syncService = new SyncService();
