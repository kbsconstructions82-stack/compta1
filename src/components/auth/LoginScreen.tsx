import React, { useState } from 'react';
import { Truck } from 'lucide-react';

interface LoginScreenProps {
    onLogin: (u: string, p: string) => Promise<void>;
    error?: string | null;
    isLoading?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, error, isLoading }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        onLogin(username, password);
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
                                placeholder="admin (ou admin@momo.com)"
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
                                placeholder="admin"
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
                    </div>
                    <div className="mt-6 text-center">
                        <p className="text-xs text-gray-500 mb-2">Mode développement</p>
                        <p className="text-xs text-gray-400">
                            Identifiants: <span className="font-mono font-bold text-indigo-600">admin</span> / <span className="font-mono font-bold text-indigo-600">admin</span>
                        </p>
                    </div>
                    <div className="mt-4 text-center text-xs text-gray-400">
                        &copy; 2024 MOMO Logistics Suite. All rights reserved.
                    </div>
                </form>
            </div>
        </div>
    );
};
