import React, { useState, useEffect } from 'react';
import { Truck, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ResetPasswordScreenProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ onSuccess, onCancel }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas');
            return;
        }

        if (password.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        setIsLoading(true);

        try {
            const { error: updateError } = await supabase.auth.updateUser({ 
                password: password 
            });
            
            if (updateError) throw updateError;
            
            setSuccess(true);
            setTimeout(() => {
                onSuccess();
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Erreur lors de la réinitialisation du mot de passe');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-panel rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/60">
                <div className="p-8 bg-indigo-600/90 backdrop-blur-sm text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-xl mx-auto flex items-center justify-center mb-4 backdrop-blur-sm shadow-inner">
                        <Truck className="text-white" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Nouveau mot de passe</h1>
                    <p className="text-indigo-200 text-sm">Réinitialisez votre mot de passe</p>
                </div>

                <div className="p-8">
                    {success ? (
                        <div className="mb-4 bg-green-50 text-green-600 p-3 rounded-lg text-sm flex items-center border border-green-100">
                            <span className="mr-2">✅</span> Mot de passe changé avec succès ! Redirection...
                        </div>
                    ) : null}
                    
                    {error && (
                        <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center border border-red-100">
                            <span className="mr-2">⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nouveau mot de passe
                            </label>
                            <input
                                type="password"
                                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Minimum 6 caractères"
                                required
                                disabled={success || isLoading}
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Confirmer le mot de passe
                            </label>
                            <input
                                type="password"
                                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Retapez le mot de passe"
                                required
                                disabled={success || isLoading}
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={success || isLoading}
                                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <ArrowLeft size={18} />
                                Retour
                            </button>
                            <button
                                type="submit"
                                disabled={success || isLoading}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {isLoading ? (
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                ) : success ? (
                                    '✓ Réussi'
                                ) : (
                                    'Réinitialiser'
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center text-xs text-gray-400">
                        &copy; 2026 MOMO Logistics Suite. All rights reserved.
                    </div>
                </div>
            </div>
        </div>
    );
};
