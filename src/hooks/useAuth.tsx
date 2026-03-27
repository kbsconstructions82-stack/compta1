import { useState, useEffect, createContext, useContext } from 'react';
import { User, UserRole } from '../../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import * as bcrypt from 'bcryptjs';

// Define the Auth Context Shape
interface AuthContextType {
    isAuthenticated: boolean;
    currentUser: User | null;
    login: (u: string, p: string) => Promise<void>;
    logout: () => void;
    updateUserProfile: (updates: { fullName?: string; email?: string; password?: string }) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    error: string | null;
    isLoading: boolean;
}

// Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- PROVIDER COMPONENT ---
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        console.log('[Auth] Initialization started');

        // 1. Check for stored admin session (instant, no async)
        const storedAdmin = localStorage.getItem('admin_session');
        if (storedAdmin) {
            try {
                const adminData = JSON.parse(storedAdmin);
                if (adminData.id === 'admin_bypass') {
                    console.log('[Auth] Found stored admin session');
                    setCurrentUser(adminData);
                    setIsAuthenticated(true);
                    setIsLoading(false);
                    return;
                }
            } catch (e) {
                console.warn('[Auth] Invalid admin session data', e);
                localStorage.removeItem('admin_session');
            }
        }

        // 2. Check for driver session (localStorage only)
        const storedDriver = localStorage.getItem('driver_session');
        if (storedDriver) {
            try {
                const driverData = JSON.parse(storedDriver);
                const user: User = {
                    id: driverData.id || 'driver_' + Date.now(),
                    tenant_id: driverData.tenant_id || 'T001',
                    email: driverData.email || '',
                    full_name: driverData.full_name || 'Chauffeur',
                    role: 'CHAUFFEUR',
                    last_login: new Date().toISOString(),
                    status: 'Active'
                };
                console.log('[Auth] Found stored driver session');
                setCurrentUser(user);
                setIsAuthenticated(true);
                setIsLoading(false);
                return;
            } catch (e) {
                console.warn('[Auth] Invalid driver session data', e);
                localStorage.removeItem('driver_session');
            }
        }

        // 3. If Supabase is not configured, stop loading
        if (!isSupabaseConfigured()) {
            console.log('[Auth] Supabase not configured, stopping loading');
            setIsLoading(false);
            return;
        }

        // 4. Listen to Supabase Auth state changes
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                const user: User = {
                    id: session.user.id,
                    tenant_id: 'T001',
                    email: session.user.email || '',
                    full_name: session.user.user_metadata?.full_name || session.user.email || 'Utilisateur',
                    role: 'ADMIN',
                    last_login: new Date().toISOString(),
                    status: 'Active'
                };
                setCurrentUser(user);
                setIsAuthenticated(true);
            }
            setIsLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                console.log('[Auth] Supabase user found:', session.user.email);
                const user: User = {
                    id: session.user.id,
                    tenant_id: 'T001',
                    email: session.user.email || '',
                    full_name: session.user.user_metadata?.full_name || session.user.email || 'Utilisateur',
                    role: 'ADMIN',
                    last_login: new Date().toISOString(),
                    status: 'Active'
                };
                setCurrentUser(user);
                setIsAuthenticated(true);
            } else {
                if (!localStorage.getItem('driver_session') && !localStorage.getItem('admin_session')) {
                    setCurrentUser(null);
                    setIsAuthenticated(false);
                }
            }
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (u: string, p: string) => {
        console.log('Login attempt:', u);
        setIsLoading(true);
        setError(null);

        await new Promise(resolve => setTimeout(resolve, 100));

        // --- DEV BYPASS (admin/admin) ---
        if ((u === 'admin' || u === 'admin@momo.com' || u.toLowerCase() === 'admin') && p === 'admin') {
            console.log('Admin bypass activated for:', u);
            const user: User = {
                id: 'admin_bypass',
                tenant_id: 'T001',
                email: 'admin@momologistics.com',
                full_name: 'Super Admin',
                role: 'ADMIN',
                last_login: new Date().toISOString(),
                status: 'Active'
            };
            localStorage.setItem('admin_session', JSON.stringify(user));
            setCurrentUser(user);
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
        }
        // ------------------

        if (!isSupabaseConfigured()) {
            setError('Supabase non configuré. Utilisez admin/admin pour le mode développement.');
            setIsLoading(false);
            return;
        }

        // 1. Try Supabase Auth (email/password)
        try {
            const loginEmail = u.includes('@') ? u : `${u.toLowerCase()}@compta1.com`;
            console.log('[Auth] Trying Supabase authentication for:', loginEmail);
            
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password: p
            });

            if (authError) {
                // If it is invalid credentials, throw it so we fall back to driver auth
                throw authError;
            }

            if (data.user) {
                const supabaseUser = data.user;
                const user: User = {
                    id: supabaseUser.id,
                    tenant_id: 'T001',
                    email: supabaseUser.email || '',
                    full_name: supabaseUser.user_metadata?.full_name || u, // Fallback to provided name
                    role: 'ADMIN', // Standard fallback, we'll refine if it's a driver next
                    last_login: new Date().toISOString(),
                    status: 'Active'
                };
                
                // Si c'est un compte chauffeur (email finit par @compta1.com et ce n'est pas l'admin)
                if (loginEmail.endsWith('@compta1.com') && loginEmail !== 'admin@compta1.com') {
                    user.role = 'CHAUFFEUR';
                    
                    try {
                        const { data: driverData, error: dbError } = await supabase
                            .from('employees')
                            .select('*')
                            .eq('username', u.toLowerCase())
                            .single();
                            
                        if (!dbError && driverData) {
                            user.full_name = driverData.full_name || u;
                            user.id = driverData.id;
                            
                            localStorage.setItem('driver_session', JSON.stringify({
                                id: user.id,
                                tenant_id: user.tenant_id,
                                email: user.email,
                                full_name: user.full_name,
                                username: u.toLowerCase()
                            }));
                        }
                    } catch (e) {
                        console.warn("Could not fetch extra driver details, continuing with defaults", e);
                    }
                }

                setCurrentUser(user);
                setIsAuthenticated(true);
                setIsLoading(false);
                console.log('[Auth] Supabase authentication successful');
                return;
            }
        } catch (supabaseError: any) {
            const isInvalidCredentials = supabaseError.message?.includes('Invalid login credentials') || supabaseError.status === 400;
            if (!isInvalidCredentials) {
                setError('Mot de passe incorrect. Vérifiez vos identifiants.');
                setIsLoading(false);
                return;
            }
            console.warn('[Auth] Supabase auth failed, trying legacy driver authentication');
        }

        // 2. Try Driver Custom Auth (Supabase employees table)
        try {
            console.log('[Auth] Trying driver authentication for:', u);
            const normalizedUsername = u.toLowerCase().trim();
            
            let driver: any = null;
            
            // Try by username
            const { data: byUsername } = await supabase
                .from('employees')
                .select('*')
                .eq('username', normalizedUsername)
                .single();
                
            if (byUsername) {
                driver = byUsername;
            } else {
                // Try by email
                const { data: byEmail } = await supabase
                    .from('employees')
                    .select('*')
                    .eq('email', normalizedUsername)
                    .single();
                if (byEmail) {
                    driver = byEmail;
                }
            }

            if (!driver) {
                throw new Error("Identifiant incorrect. Aucun salarié trouvé avec cet identifiant ou email.");
            }

            // Password verification
            let isValid = false;
            let needsRehash = false;

            if (driver.password) {
                if (driver.password.startsWith('$2a$') || driver.password.startsWith('$2b$') || driver.password.startsWith('$2y$')) {
                    try {
                        isValid = await bcrypt.compare(p, driver.password);
                    } catch {
                        isValid = bcrypt.compareSync(p, driver.password);
                    }
                } else {
                    isValid = driver.password === p;
                    if (isValid) needsRehash = true;
                }
            }

            if (!isValid) {
                throw new Error("Mot de passe incorrect. Vérifiez vos identifiants et réessayez.");
            }

            // Self-healing: upgrade to hash if plain text
            if (needsRehash) {
                try {
                    const salt = bcrypt.genSaltSync(10);
                    const hash = bcrypt.hashSync(p, salt);
                    await supabase
                        .from('employees')
                        .update({ password: hash })
                        .eq('id', driver.id);
                    console.log('[Auth] Password upgraded to bcrypt hash');
                } catch (e) {
                    console.warn("Self-healing password update failed", e);
                }
            }

            const user: User = {
                id: driver.id,
                tenant_id: driver.tenant_id || 'T001',
                email: driver.email || '',
                full_name: driver.full_name,
                role: 'CHAUFFEUR',
                last_login: new Date().toISOString(),
                status: 'Active'
            };

            localStorage.setItem('driver_session', JSON.stringify({
                id: driver.id,
                tenant_id: driver.tenant_id || 'T001',
                email: driver.email || '',
                full_name: driver.full_name,
                username: driver.username || ''
            }));

            setCurrentUser(user);
            setIsAuthenticated(true);
            setIsLoading(false);
            console.log(`✅ Driver login successful: ${driver.username || driver.email || driver.full_name}`);

        } catch (err: any) {
            setError(err.message || 'Erreur de connexion');
            setIsAuthenticated(false);
            setIsLoading(false);
        }
    };

    const updateUserProfile = async (updates: { fullName?: string; email?: string; password?: string }) => {
        if (!currentUser) {
            throw new Error('Aucun utilisateur connecté');
        }

        try {
            if (isSupabaseConfigured()) {
                const { data } = await supabase.auth.getSession();
                if (data.session) {
                    const updateData: any = {};
                    if (updates.password) updateData.password = updates.password;
                    if (updates.email) updateData.email = updates.email;
                    if (updates.fullName) {
                        updateData.data = { full_name: updates.fullName };
                    }
                    
                    if (Object.keys(updateData).length > 0) {
                        await supabase.auth.updateUser(updateData);
                    }
                }
            }

            // Update local state
            setCurrentUser(prev => prev ? {
                ...prev,
                full_name: updates.fullName || prev.full_name,
                email: updates.email || prev.email,
            } : null);

            // Update localStorage sessions
            const adminSession = localStorage.getItem('admin_session');
            const driverSession = localStorage.getItem('driver_session');

            if (adminSession) {
                const session = JSON.parse(adminSession);
                if (updates.fullName) session.full_name = updates.fullName;
                if (updates.email) session.email = updates.email;
                localStorage.setItem('admin_session', JSON.stringify(session));
            }

            if (driverSession) {
                const session = JSON.parse(driverSession);
                if (updates.fullName) session.full_name = updates.fullName;
                if (updates.email) session.email = updates.email;
                localStorage.setItem('driver_session', JSON.stringify(session));
            }

        } catch (err: any) {
            console.error('[Auth] Update profile error:', err);
            throw new Error(err.message || 'Erreur lors de la mise à jour du profil');
        }
    };

    const logout = async () => {
        try {
            if (isSupabaseConfigured()) {
                await supabase.auth.signOut();
            }
        } catch (err) {
            console.warn("Supabase logout failed:", err);
        }
        localStorage.removeItem('driver_session');
        localStorage.removeItem('admin_session');
        setIsAuthenticated(false);
        setCurrentUser(null);
    };

    const resetPassword = async (email: string) => {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase n\'est pas configuré');
        }

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
        } catch (err: any) {
            console.error('[Auth] Password reset error:', err);
            throw new Error(err.message || 'Erreur lors de l\'envoi de l\'email de récupération');
        }
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, currentUser, login, logout, updateUserProfile, resetPassword, error, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

// --- HOOK ---
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
