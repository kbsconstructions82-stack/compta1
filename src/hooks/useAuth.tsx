import { useState, useEffect, createContext, useContext } from 'react';
import { User, UserRole } from '../../types';
import {
    auth,
    db as firestoreDb,
    isFirebaseConfigured,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updatePassword,
    updateEmail,
    collection,
    getDocs,
    doc,
    updateDoc,
    query,
    where,
} from '../lib/firebase';
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

        // 3. If Firebase is not configured, stop loading
        if (!isFirebaseConfigured()) {
            console.log('[Auth] Firebase not configured, stopping loading');
            setIsLoading(false);
            return;
        }

        // 4. Listen to Firebase Auth state changes
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                console.log('[Auth] Firebase user found:', firebaseUser.email);
                const user: User = {
                    id: firebaseUser.uid,
                    tenant_id: 'T001',
                    email: firebaseUser.email || '',
                    full_name: firebaseUser.displayName || firebaseUser.email || 'Utilisateur',
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

        return () => unsubscribe();
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

        if (!isFirebaseConfigured()) {
            setError('Firebase non configuré. Utilisez admin/admin pour le mode développement.');
            setIsLoading(false);
            return;
        }

        // 1. Try Firebase Auth (email/password)
        try {
            // If the user typed a username without @, append our default domain for drivers
            const loginEmail = u.includes('@') ? u : `${u.toLowerCase()}@compta1.com`;
            console.log('[Auth] Trying Firebase authentication for:', loginEmail);
            
            const userCredential = await signInWithEmailAndPassword(auth, loginEmail, p);
            const firebaseUser = userCredential.user;

            const user: User = {
                id: firebaseUser.uid,
                tenant_id: 'T001',
                email: firebaseUser.email || '',
                full_name: firebaseUser.displayName || u, // Fallback to provided name
                role: 'ADMIN', // Standard fallback, we'll refine if it's a driver next
                last_login: new Date().toISOString(),
                status: 'Active'
            };
            
            // Si c'est un compte chauffeur (email finit par @compta1.com et ce n'est pas l'admin)
            if (loginEmail.endsWith('@compta1.com') && loginEmail !== 'admin@compta1.com') {
                user.role = 'CHAUFFEUR';
                
                // Fetch the actual driver details from Firestore to get full_name
                try {
                    const employeesRef = collection(firestoreDb, 'employees');
                    const q = query(employeesRef, where('username', '==', u.toLowerCase()));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        const driverData = snap.docs[0].data();
                        user.full_name = driverData.full_name || u;
                        user.id = snap.docs[0].id;
                        
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
            console.log('[Auth] Firebase authentication successful');
            return;
        } catch (firebaseError: any) {
            // If it's not a "user not found" error, throw it
            const isNotFound = firebaseError.code === 'auth/user-not-found' || 
                               firebaseError.code === 'auth/invalid-credential' ||
                               firebaseError.code === 'auth/invalid-email';
            if (!isNotFound) {
                setError('Mot de passe incorrect. Vérifiez vos identifiants.');
                setIsLoading(false);
                return;
            }
            console.warn('[Auth] Firebase auth failed, trying legacy driver authentication');
        }

        // 2. Try Driver Custom Auth (Firestore employees collection)
        try {
            console.log('[Auth] Trying driver authentication for:', u);
            const normalizedUsername = u.toLowerCase().trim();
            const employeesRef = collection(firestoreDb, 'employees');
            const q = query(
                employeesRef,
                where('username', '==', normalizedUsername)
            );
            const snap = await getDocs(q);
            
            // Also try by email if not found by username
            let driver: any = null;
            if (!snap.empty) {
                driver = { id: snap.docs[0].id, ...snap.docs[0].data() };
            } else {
                const emailQ = query(employeesRef, where('email', '==', normalizedUsername));
                const emailSnap = await getDocs(emailQ);
                if (!emailSnap.empty) {
                    driver = { id: emailSnap.docs[0].id, ...emailSnap.docs[0].data() };
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
                    updateDoc(doc(firestoreDb, 'employees', driver.id), { password: hash });
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
            const firebaseUser = auth.currentUser;

            if (firebaseUser && isFirebaseConfigured()) {
                if (updates.password) {
                    await updatePassword(firebaseUser, updates.password);
                }
                if (updates.email) {
                    await updateEmail(firebaseUser, updates.email);
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
            if (isFirebaseConfigured()) {
                await signOut(auth);
            }
        } catch (err) {
            console.warn("Firebase logout failed:", err);
        }
        localStorage.removeItem('driver_session');
        localStorage.removeItem('admin_session');
        setIsAuthenticated(false);
        setCurrentUser(null);
    };

    const resetPassword = async (email: string) => {
        if (!isFirebaseConfigured()) {
            throw new Error('Firebase n\'est pas configuré');
        }

        try {
            await sendPasswordResetEmail(auth, email);
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
