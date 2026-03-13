import { db, SyncQueueItem } from '../lib/db';
import {
    db as firestoreDb,
    collection,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    getDocs,
} from '../lib/firebase';

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

            const docRef = doc(firestoreDb, table, payload.id);

            // --- FIREBASE FIRESTORE OPERATION ---
            switch (action) {
                case 'CREATE':
                    // setDoc will create or overwrite the document with the given ID
                    await setDoc(docRef, { ...payload, _synced_at: new Date().toISOString() });
                    break;
                case 'UPDATE':
                    try {
                        await updateDoc(docRef, { ...payload, _updated_at: new Date().toISOString() });
                    } catch {
                        // If document doesn't exist, create it
                        await setDoc(docRef, { ...payload, _synced_at: new Date().toISOString() });
                    }
                    break;
                case 'UPSERT':
                    // merge: true = partial update, creates if doesn't exist
                    await setDoc(docRef, { ...payload, _synced_at: new Date().toISOString() }, { merge: true });
                    break;
                case 'DELETE':
                    await deleteDoc(docRef);
                    break;
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

    // --- DATA PULL (Firestore -> Local) ---
    // Should be called periodically or on App Start
    public async pullData(table: string) {
        if (!navigator.onLine) return;

        try {
            const colRef = collection(firestoreDb, table);
            const snap = await getDocs(colRef);

            if (!snap.empty) {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
