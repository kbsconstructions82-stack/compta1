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
            // 0. Reset FAILED items so they can be retried (network may have recovered)
            await db.syncQueue
                .where('status')
                .equals('FAILED')
                .modify({ status: 'PENDING', retryCount: 0 });

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
            const { table, action, payload } = item;

            if (!payload.id) {
                throw new Error(`Payload missing 'id' field for table ${table}`);
            }

            let opError = null;

            // --- SUPABASE OPERATION ---
            switch (action) {
                case 'CREATE':
                    const { error: createError } = await supabase.from(table).insert({ ...payload, _synced_at: new Date().toISOString() });
                    opError = createError;
                    break;
                case 'UPDATE':
                    const { error: updateError } = await supabase.from(table).update({ ...payload, _updated_at: new Date().toISOString() }).eq('id', payload.id);
                    opError = updateError;
                    break;
                case 'UPSERT':
                    const { error: upsertError } = await supabase.from(table).upsert({ ...payload, _synced_at: new Date().toISOString() });
                    opError = upsertError;
                    break;
                case 'DELETE':
                    const { error: deleteError } = await supabase.from(table).delete().eq('id', payload.id);
                    opError = deleteError;
                    break;
            }

            if (opError) {
                throw opError;
            }

            // --- SUCCESS ---
            console.log(`[SyncService] Item ${item.id} synced successfully.`);
            // Remove from queue
            await db.syncQueue.delete(item.id!);

        } catch (error: any) {
            console.error(`[SyncService] Failed to sync item ${item.id}:`, error);

            // Increment retry count or mark FAILED
            if (item.retryCount >= 5) {
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

            if (data && data.length > 0) {
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
        await this.pullData('companies');
        await this.pullData('vehicles');
        await this.pullData('employees');
        await this.pullData('missions');
        await this.pullData('invoices');
        await this.pullData('expenses');
    }
}

export const syncService = new SyncService();
