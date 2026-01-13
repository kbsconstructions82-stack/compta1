import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { db } from '../src/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { syncService } from '../src/services/syncService';

export const NetworkStatus: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);

    // Query pending items count from Dexie
    const pendingCount = useLiveQuery(() => db.syncQueue.where('status').equals('PENDING').count());
    const failedCount = useLiveQuery(() => db.syncQueue.where('status').equals('FAILED').count());

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // Trigger sync when back online
            handleSync();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleSync = async () => {
        if (!isOnline) return;
        setIsSyncing(true);
        await syncService.processQueue();
        setIsSyncing(false);
    };

    if (isOnline && (pendingCount === 0 || pendingCount === undefined) && (failedCount === 0 || failedCount === undefined)) {
        return null; // Don't show anything if everything is fine
    }

    return (
        <div className={`fixed bottom-4 right-4 z-50 p-3 rounded-lg shadow-lg flex items-center space-x-3 transition-all ${
            !isOnline ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
        }`}>
            {/* Icon */}
            {!isOnline ? (
                <WifiOff size={20} />
            ) : isSyncing ? (
                <RefreshCw size={20} className="animate-spin" />
            ) : failedCount && failedCount > 0 ? (
                <AlertCircle size={20} className="text-red-600" />
            ) : (
                <Wifi size={20} />
            )}

            {/* Text Content */}
            <div className="text-xs font-medium">
                {!isOnline ? (
                    <span>Mode Hors Ligne</span>
                ) : isSyncing ? (
                    <span>Synchronisation...</span>
                ) : failedCount && failedCount > 0 ? (
                    <span>{failedCount} Erreur(s) de sync</span>
                ) : (
                    <span>Connecté</span>
                )}
                
                {(pendingCount && pendingCount > 0) && (
                    <div className="text-[10px] opacity-75">
                        {pendingCount} opération(s) en attente
                    </div>
                )}
            </div>

            {/* Manual Sync Button (only if online and not syncing) */}
            {isOnline && !isSyncing && (
                <button 
                    onClick={handleSync}
                    className="p-1 hover:bg-white/50 rounded-full transition-colors"
                    title="Forcer la synchronisation"
                >
                    <RefreshCw size={14} />
                </button>
            )}
        </div>
    );
};
