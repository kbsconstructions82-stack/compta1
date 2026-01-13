import { useState, useEffect, createContext, useContext } from 'react';
import { User, UserRole, DriverState } from '../../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import * as bcrypt from 'bcryptjs';

// Define the Auth Context Shape
interface AuthContextType {
    isAuthenticated: boolean;
    currentUser: User | null;
    login: (u: string, p: string) => Promise<void>;
    logout: () => void;
    error: string | null;
    isLoading: boolean;
}

// Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- PROVIDER COMPONENT ---
// --- PROVIDER COMPONENT ---
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // ULTRA-FAST initialization - NO async blocking, NO Supabase if not configured
        console.log('[Auth] Initialization started');
        
        // Check Supabase configuration FIRST
        // Treat as NOT configured if URL/Key are placeholders or empty
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        // More strict check: only consider configured if both exist AND are not placeholders
        const isConfigured = !!(supabaseUrl && 
                               supabaseUrl.trim() !== '' &&
                               supabaseUrl !== 'https://placeholder.supabase.co' &&
                               supabaseUrl !== 'undefined' &&
                               supabaseKey && 
                               supabaseKey.trim() !== '' &&
                               supabaseKey !== 'placeholder-key' &&
                               supabaseKey !== 'undefined');
        
        console.log('[Auth] Supabase configured?', isConfigured, 'URL:', supabaseUrl?.substring(0, 30) + '...', 'Key:', supabaseKey ? 'present' : 'missing');

        // Check for stored admin session first (instant, no async)
        const storedAdmin = localStorage.getItem('admin_session');
        if (storedAdmin) {
            try {
                const adminData = JSON.parse(storedAdmin);
                if (adminData.id === 'admin_bypass') {
                    console.log('[Auth] Found stored admin session');
                    setCurrentUser(adminData);
                    setIsAuthenticated(true);
                    setIsLoading(false);
                    return; // Exit early, skip everything else
                }
            } catch (e) {
                console.warn('[Auth] Invalid admin session data', e);
                localStorage.removeItem('admin_session');
            }
        }

        // Check for driver session (localStorage only)
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
                return; // Exit early
            } catch (e) {
                console.warn('[Auth] Invalid driver session data', e);
                localStorage.removeItem('driver_session');
            }
        }

        // FORCE stop loading immediately if Supabase not configured
        if (!isConfigured) {
            console.log('[Auth] Supabase not configured, stopping loading immediately');
            setIsLoading(false);
            return; // Exit immediately, no async operations
        }

        // Only if Supabase is configured: try async init (non-blocking)
        console.log('[Auth] Supabase configured, trying async init (non-blocking)');
        setIsLoading(false); // Don't wait, set to false immediately
        
        // Try Supabase checks asynchronously (fire and forget, don't wait)
        (async () => {
            try {
                const { data, error } = await Promise.race([
                    supabase.auth.getSession(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
                ]) as any;
                
                if (!error && data?.session?.user) {
                    console.log('[Auth] Supabase session found');
                    await fetchUserProfile(data.session.user.id);
                }
            } catch (err) {
                console.warn("[Auth] Supabase session check failed:", err);
            }
        })();

        // Setup auth listener (non-blocking, only if configured)
        if (isConfigured) {
            try {
                const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
                    if (session?.user) {
                        console.log('[Auth] Auth state changed: user logged in');
                    } else {
                        if (!localStorage.getItem('driver_session') && !localStorage.getItem('admin_session')) {
                            setCurrentUser(null);
                            setIsAuthenticated(false);
                        }
                    }
                });
                // subscription cleanup handled in return
            } catch (err) {
                console.warn("[Auth] Auth listener setup failed:", err);
            }
        }

        console.log('[Auth] Initialization complete');
    }, []);

    const fetchUserProfile = async (userId: string) => {
        // Only try if Supabase is configured
        if (!isSupabaseConfigured()) {
            setIsLoading(false);
            return;
        }

        try {
            const profilePromise = supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();
            
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 2000)
            );

            const result = await Promise.race([profilePromise, timeoutPromise]) as any;
            const { data, error } = result || {};

            if (data && !error) {
                const user: User = {
                    id: data.id,
                    tenant_id: data.tenant_id,
                    email: data.email || '',
                    full_name: data.full_name || 'Utilisateur',
                    role: data.role as UserRole,
                    last_login: new Date().toISOString(),
                    status: 'Active'
                };
                setCurrentUser(user);
                setIsAuthenticated(true);
            }
        } catch (err) {
            console.error('Unexpected error fetching profile:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (u: string, p: string) => {
        console.log('Login attempt:', u);
        setIsLoading(true);
        setError(null);

        // Small delay to ensure state updates are visible
        await new Promise(resolve => setTimeout(resolve, 100));

        // --- DEV BYPASS ---
        // Accept both 'admin' and 'admin@momo.com' for development
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
            // Store in localStorage for persistence
            localStorage.setItem('admin_session', JSON.stringify(user));
            
            // Set state synchronously
            setCurrentUser(user);
            setIsAuthenticated(true);
            setIsLoading(false);
            console.log('Login complete - admin bypass');
            
            return;
        }
        // ------------------

        // Check if Supabase is configured using the imported function (not a local variable)
        if (!isSupabaseConfigured()) {
            setError('Supabase non configuré. Utilisez admin/admin pour le mode développement.');
            setIsLoading(false);
            return;
        }

        // 1. Try Supabase Auth First (only if not admin bypass)
        if (!(u.toLowerCase().includes('admin') && p === 'admin')) {
            try {
                console.log('[Auth] Trying Supabase authentication for:', u);
                const authPromise = supabase.auth.signInWithPassword({
                    email: u,
                    password: p,
                });
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), 3000)
                );
                
                const result = await Promise.race([authPromise, timeoutPromise]) as any;
                const { data, error } = result || {};

                if (!error && data?.user) {
                    console.log('[Auth] Supabase authentication successful');
                    await fetchUserProfile(data.user.id);
                    setIsLoading(false);
                    return;
                } else if (error) {
                    console.warn('[Auth] Supabase authentication failed:', error.message);
                    // Continue to try driver authentication below
                }
            } catch (ignore) {
                // Ignore supabase error, try driver table
                console.warn("[Auth] Supabase auth error, trying driver authentication:", ignore);
            }
        }

        // 2. Try Driver Custom Auth (Employees Table) - Supabase is configured (checked above)

        try {
            // Search by username OR email
            // Note: We search by username/email first, then verify password.
            console.log('[Auth] Trying driver authentication for username/email:', u);
            const driverPromise = supabase.from('employees').select('*').or(`username.eq.${u},email.eq.${u}`).maybeSingle();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 5000)
            );
            
            const result = await Promise.race([driverPromise, timeoutPromise]) as any;
            const { data: driver, error: driverError } = result || {};

            if (driverError && driverError.code !== 'PGRST116') {
                // PGRST116 is "no rows returned" which is normal if user doesn't exist
                console.error('[Auth] Error fetching driver:', driverError);
                throw new Error(`Erreur lors de la recherche du salarié: ${driverError.message}`);
            }

            if (driver) {

                // Password Verification (Hash vs Plain)
                let isValid = false;
                let needsRehash = false;

                if (driver.password) {
                    // Check if it's already a bcrypt hash
                    if (driver.password.startsWith('$2a$') || driver.password.startsWith('$2b$') || driver.password.startsWith('$2y$')) {
                        isValid = bcrypt.compareSync(p, driver.password);
                    } else {
                        // Plain text check (Legacy / Self-Healing)
                        isValid = driver.password === p;
                        if (isValid) needsRehash = true;
                    }
                }

                if (isValid) {
                    // SELF-HEALING: Upgrade to hash if it was plain text
                    if (needsRehash) {
                        try {
                            const salt = bcrypt.genSaltSync(10);
                            const hash = bcrypt.hashSync(p, salt);
                            // We don't await this to keep login fast (fire and forget update)
                            supabase.from('employees').update({ password: hash }).eq('id', driver.id).then();
                            console.log('[Auth] Password upgraded to bcrypt hash');
                        } catch (e) {
                            console.warn("Self-healing password update failed", e);
                        }
                    }

                    const user: User = {
                        id: driver.id,
                        tenant_id: driver.tenant_id,
                        email: driver.email || '',
                        full_name: driver.full_name,
                        role: 'CHAUFFEUR',
                        last_login: new Date().toISOString(),
                        status: 'Active'
                    };

                    // Persist driver session with all necessary data
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
                    return;
                } else {
                    // Password is invalid
                    console.warn('[Auth] Password verification failed for driver:', driver.username || driver.email);
                    throw new Error("Mot de passe incorrect.");
                }
            } else {
                // Driver not found
                console.warn('[Auth] Driver not found with username/email:', u);
                throw new Error("Identifiant incorrect. Aucun salarié trouvé avec cet identifiant.");
            }

            // This should never be reached, but just in case
            throw new Error("Identifiant ou mot de passe incorrect.");

        } catch (err: any) {
            setError(err.message || 'Erreur de connexion');
            setIsAuthenticated(false);
            setIsLoading(false);
        }
    };

    const logout = async () => {
        if (isSupabaseConfigured()) {
            try {
                await supabase.auth.signOut();
            } catch (err) {
                console.warn("Supabase logout failed:", err);
            }
        }
        localStorage.removeItem('driver_session');
        localStorage.removeItem('admin_session');
        setIsAuthenticated(false);
        setCurrentUser(null);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, currentUser, login, logout, error, isLoading }}>
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
