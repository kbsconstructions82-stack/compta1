import React, { useState, useEffect } from 'react';
import { RefreshCw, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { db } from '../src/lib/db';

export const SyncQueueManager: React.FC = () => {
    const [stats, setStats] = useState({ pending: 0, failed: 0, syncing: 0 });
    const [isLoading, setIsLoading] = useState(false);

    const refreshStats = async () => {
        const pending = await db.syncQueue.where('status').equals('PENDING').count();
        const failed = await db.syncQueue.where('status').equals('FAILED').count();
        const syncing = await db.syncQueue.where('status').equals('SYNCING').count();
        setStats({ pending, failed, syncing });
    };

    useEffect(() => {
        refreshStats();
        const interval = setInterval(refreshStats, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const handleClearFailed = async () => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer tous les éléments échoués de la queue de synchronisation ?')) {
            return;
        }
        setIsLoading(true);
        try {
            const failedItems = await db.syncQueue.where('status').equals('FAILED').toArray();
            await db.syncQueue.bulkDelete(failedItems.map(item => item.id!));
            await refreshStats();
            alert(`${failedItems.length} éléments échoués supprimés avec succès.`);
        } catch (error) {
            console.error('Error clearing failed items:', error);
            alert('Erreur lors de la suppression des éléments échoués.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearAll = async () => {
        if (!confirm('ATTENTION: Cette action supprimera TOUS les éléments de la queue de synchronisation. Êtes-vous sûr ?')) {
            return;
        }
        setIsLoading(true);
        try {
            const count = await db.syncQueue.count();
            await db.syncQueue.clear();
            await refreshStats();
            alert(`${count} éléments supprimés de la queue.`);
        } catch (error) {
            console.error('Error clearing all items:', error);
            alert('Erreur lors de la suppression de la queue.');
        } finally {
            setIsLoading(false);
        }
    };

    if (stats.pending === 0 && stats.failed === 0 && stats.syncing === 0) {
        return null; // Don't show if queue is empty
    }

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 max-w-sm">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-700 flex items-center">
                        <RefreshCw className="mr-2 h-4 w-4 text-indigo-500" />
                        Queue de Synchronisation
                    </h3>
                </div>

                <div className="space-y-2 mb-3">
                    {stats.pending > 0 && (
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 flex items-center">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                                En attente
                            </span>
                            <span className="font-bold text-blue-600">{stats.pending}</span>
                        </div>
                    )}
                    {stats.syncing > 0 && (
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 flex items-center">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
                                En cours
                            </span>
                            <span className="font-bold text-yellow-600">{stats.syncing}</span>
                        </div>
                    )}
                    {stats.failed > 0 && (
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 flex items-center">
                                <AlertTriangle className="mr-2 h-3 w-3 text-red-500" />
                                Échoués
                            </span>
                            <span className="font-bold text-red-600">{stats.failed}</span>
                        </div>
                    )}
                </div>

                {stats.failed > 0 && (
                    <div className="space-y-2">
                        <button
                            onClick={handleClearFailed}
                            disabled={isLoading}
                            className="w-full text-xs bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium"
                        >
                            <Trash2 className="mr-2 h-3 w-3" />
                            Supprimer les échoués
                        </button>
                        <button
                            onClick={handleClearAll}
                            disabled={isLoading}
                            className="w-full text-xs bg-gray-50 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium"
                        >
                            <Trash2 className="mr-2 h-3 w-3" />
                            Tout supprimer
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
