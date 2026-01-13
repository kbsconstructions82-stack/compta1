import React, { useEffect, useState } from 'react';
import { Smartphone, X } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Détecter iOS
        const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        setIsIOS(iOS);

        // Écouter l'événement beforeinstallprompt
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            
            // Afficher le prompt seulement si pas déjà installé
            if (!window.matchMedia('(display-mode: standalone)').matches) {
                setTimeout(() => setShowPrompt(true), 3000); // Attendre 3s avant d'afficher
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Vérifier si déjà installé
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('✅ Application déjà installée');
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('✅ Installation acceptée');
        } else {
            console.log('❌ Installation refusée');
        }
        
        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
    };

    // Ne pas afficher si déjà dismissé récemment (< 7 jours)
    const lastDismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (lastDismissed) {
        const daysSince = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24);
        if (daysSince < 7) return null;
    }

    // Prompt iOS
    if (isIOS && showPrompt && !window.matchMedia('(display-mode: standalone)').matches) {
        return (
            <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-2xl p-4 z-50 animate-in slide-in-from-bottom-4">
                <button 
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 text-white/80 hover:text-white"
                >
                    <X size={20} />
                </button>
                
                <div className="flex items-start gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                        <Smartphone size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1">Installer MOMO Logistics</h3>
                        <p className="text-sm text-white/90 mb-3">
                            Pour installer cette app sur votre iPhone :
                        </p>
                        <ol className="text-xs text-white/80 space-y-1 list-decimal list-inside">
                            <li>Appuyez sur l'icône Partager <span className="inline-block">⎙</span></li>
                            <li>Sélectionnez "Sur l'écran d'accueil"</li>
                            <li>Appuyez sur "Ajouter"</li>
                        </ol>
                    </div>
                </div>
            </div>
        );
    }

    // Prompt Android/Desktop
    if (!deferredPrompt || !showPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-2xl p-5 z-50 animate-in slide-in-from-bottom-4">
            <button 
                onClick={handleDismiss}
                className="absolute top-2 right-2 text-white/80 hover:text-white"
            >
                <X size={20} />
            </button>
            
            <div className="flex items-start gap-4">
                <div className="bg-white/20 p-3 rounded-xl">
                    <Smartphone size={28} />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">Installer MOMO Logistics</h3>
                    <p className="text-sm text-white/90 mb-4">
                        Installez l'application sur votre appareil pour un accès rapide et une utilisation hors ligne.
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={handleInstall}
                            className="flex-1 bg-white text-blue-600 font-bold py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                            Installer
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="px-4 py-2 text-white/80 hover:text-white text-sm"
                        >
                            Plus tard
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
