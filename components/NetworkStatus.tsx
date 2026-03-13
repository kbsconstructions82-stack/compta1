import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export const NetworkStatus: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline) {
        return null; // Don't show anything if everything is fine (or could show briefly)
    }

    return (
        <div className={`fixed bottom-4 right-4 z-50 p-3 rounded-lg shadow-lg flex items-center space-x-3 transition-all ${
            !isOnline ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
        }`}>
            {/* Icon */}
            {!isOnline ? (
                <WifiOff size={20} />
            ) : (
                <Wifi size={20} />
            )}

            {/* Text Content */}
            <div className="text-xs font-medium">
                {!isOnline ? (
                    <span>Mode Hors Ligne</span>
                ) : (
                    <span>Connecté</span>
                )}
            </div>
        </div>
    );
};
