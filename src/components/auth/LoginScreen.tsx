import React, { useState } from 'react';
import { Truck } from 'lucide-react';

interface LoginScreenProps {
    onLogin: (u: string, p: string) => Promise<void>;
    onResetPassword?: (email: string) => Promise<void>;
    error?: string | null;
    isLoading?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onResetPassword, error, isLoading }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetSuccess, setResetSuccess] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);

    console.log('[LoginScreen] onResetPassword is:', onResetPassword ? 'provided' : 'missing');

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        onLogin(username, password);
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!onResetPassword) return;

        setResetError(null);
        setResetSuccess(false);

        try {
            await onResetPassword(resetEmail);
            setResetSuccess(true);
            setTimeout(() => {
                setShowResetPassword(false);
                setResetSuccess(false);
                setResetEmail('');
            }, 3000);
        } catch (err: any) {
            setResetError(err.message || 'Erreur lors de l\'envoi de l\'email');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-panel rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/60">
                <div className="p-8 bg-indigo-600/90 backdrop-blur-sm text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-xl mx-auto flex items-center justify-center mb-4 backdrop-blur-sm shadow-inner">
                        <Truck className="text-white" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">MOMO Logistics</h1>
                    <p className="text-indigo-200 text-sm">Portail de Gestion & Pilotage</p>
                </div>

                {!showResetPassword ? (
                    <form onSubmit={handleSubmit} className="p-8">
                        {error && (
                            <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center border border-red-100">
                                <span className="mr-2">⚠️</span> {error}
                            </div>
                        )}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Identifiant</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    placeholder="votre@email.com"
                                    disabled={isLoading}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                                <input
                                    type="password"
                                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    disabled={isLoading}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !isLoading) {
                                            handleSubmit();
                                        }
                                    }}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isLoading ? (
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                ) : (
                                    'Se Connecter'
                                )}
                            </button>

                            {onResetPassword && (
                                <button
                                    type="button"
                                    onClick={() => setShowResetPassword(true)}
                                    className="w-full text-sm text-indigo-600 hover:text-indigo-700 transition-colors"
                                >
                                    Mot de passe oublié ?
                                </button>
                            )}
                        </div>
                        <div className="mt-6 text-center text-xs text-gray-400">
                            &copy; 2026 MOMO Logistics Suite. All rights reserved.
                        </div>
                    </form>
                ) : (
                    <div className="p-8">
                        {resetSuccess ? (
                            <div className="mb-4 bg-green-50 text-green-600 p-3 rounded-lg text-sm flex items-center border border-green-100">
                                <span className="mr-2">✅</span> Email de récupération envoyé ! Vérifiez votre boîte mail.
                            </div>
                        ) : null}
                        
                        {resetError && (
                            <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center border border-red-100">
                                <span className="mr-2">⚠️</span> {resetError}
                            </div>
                        )}

                        <h2 className="text-xl font-bold text-gray-900 mb-4">Réinitialiser le mot de passe</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Entrez votre email pour recevoir un lien de réinitialisation.
                        </p>

                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                                    value={resetEmail}
                                    onChange={e => setResetEmail(e.target.value)}
                                    placeholder="votre@email.com"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowResetPassword(false);
                                        setResetError(null);
                                        setResetSuccess(false);
                                        setResetEmail('');
                                    }}
                                    className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors"
                                >
                                    Envoyer
                                </button>
                            </div>
                        </form>

                        <div className="mt-6 text-center text-xs text-gray-400">
                            &copy; 2026 MOMO Logistics Suite. All rights reserved.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
