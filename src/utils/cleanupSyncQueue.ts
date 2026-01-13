import { db } from '../lib/db';

/**
 * Utility to clean up stuck sync queue items
 * Call this from browser console: window.cleanupSyncQueue()
 */
export const cleanupSyncQueue = async () => {
    console.log('[Cleanup] Starting sync queue cleanup...');
    
    try {
        // Get all failed items
        const failedItems = await db.syncQueue
            .where('status')
            .equals('FAILED')
            .toArray();
        
        console.log(`[Cleanup] Found ${failedItems.length} failed items`);
        
        // Delete all failed items
        if (failedItems.length > 0) {
            await db.syncQueue.bulkDelete(failedItems.map(item => item.id!));
            console.log(`[Cleanup] Deleted ${failedItems.length} failed items`);
        }
        
        // Check for items stuck in SYNCING status (shouldn't happen but just in case)
        const stuckItems = await db.syncQueue
            .where('status')
            .equals('SYNCING')
            .toArray();
        
        if (stuckItems.length > 0) {
            console.log(`[Cleanup] Found ${stuckItems.length} stuck items, resetting to PENDING`);
            for (const item of stuckItems) {
                await db.syncQueue.update(item.id!, { status: 'PENDING' });
            }
        }
        
        // Show remaining items
        const remainingItems = await db.syncQueue.toArray();
        console.log(`[Cleanup] Remaining items in queue: ${remainingItems.length}`);
        console.table(remainingItems.map(item => ({
            id: item.id,
            table: item.table,
            action: item.action,
            status: item.status,
            retryCount: item.retryCount,
            error: item.error?.substring(0, 50)
        })));
        
        return {
            deleted: failedItems.length,
            reset: stuckItems.length,
            remaining: remainingItems.length
        };
    } catch (error) {
        console.error('[Cleanup] Error during cleanup:', error);
        throw error;
    }
};

/**
 * Clear ALL sync queue items (use with caution)
 */
export const clearAllSyncQueue = async () => {
    console.log('[Cleanup] WARNING: Clearing ALL sync queue items...');
    const count = await db.syncQueue.count();
    await db.syncQueue.clear();
    console.log(`[Cleanup] Deleted ${count} items from sync queue`);
    return count;
};

/**
 * Remove items with invalid UUIDs from the queue
 * Valid UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export const cleanupInvalidUUIDs = async () => {
    console.log('[Cleanup] Searching for items with invalid UUIDs...');
    
    try {
        const allItems = await db.syncQueue.toArray();
        const invalidItems = allItems.filter(item => {
            // Check if the data contains invalid UUID patterns
            const dataStr = JSON.stringify(item.data);
            // Look for patterns like "1768328552939-cick6ip" or "INV-1768328587327-9z3hknie4"
            const hasInvalidUUID = /"\d{13}-[a-z0-9]+"/i.test(dataStr) || /"INV-\d{13}-[a-z0-9]+"/i.test(dataStr);
            return hasInvalidUUID;
        });
        
        console.log(`[Cleanup] Found ${invalidItems.length} items with invalid UUIDs`);
        
        if (invalidItems.length > 0) {
            await db.syncQueue.bulkDelete(invalidItems.map(item => item.id!));
            console.log(`[Cleanup] Deleted ${invalidItems.length} items with invalid UUIDs`);
            console.table(invalidItems.map(item => ({
                id: item.id,
                table: item.table,
                action: item.action,
                status: item.status,
                error: item.error?.substring(0, 100)
            })));
        }
        
        return invalidItems.length;
    } catch (error) {
        console.error('[Cleanup] Error during UUID cleanup:', error);
        throw error;
    }
};

// Make available in browser console
if (typeof window !== 'undefined') {
    (window as any).cleanupSyncQueue = cleanupSyncQueue;
    (window as any).clearAllSyncQueue = clearAllSyncQueue;
    (window as any).cleanupInvalidUUIDs = cleanupInvalidUUIDs;
    
    // Display help message
    console.log('%c🔧 Utilitaires de Synchronisation disponibles', 'background: #4F46E5; color: white; padding: 8px 12px; border-radius: 4px; font-weight: bold;');
    console.log('%cCommandes disponibles:', 'color: #4F46E5; font-weight: bold; margin-top: 8px;');
    console.log('  • %ccleanupSyncQueue()%c - Supprime les éléments échoués de la queue', 'color: #10B981; font-weight: bold;', 'color: inherit;');
    console.log('  • %ccleanupInvalidUUIDs()%c - Supprime les éléments avec UUIDs invalides', 'color: #F59E0B; font-weight: bold;', 'color: inherit;');
    console.log('  • %cclearAllSyncQueue()%c - Supprime TOUS les éléments de la queue', 'color: #EF4444; font-weight: bold;', 'color: inherit;');
    console.log('%cExemple: %cawait cleanupInvalidUUIDs()', 'color: #6B7280;', 'color: #F59E0B; font-family: monospace;');
}
