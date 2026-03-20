import { initializeApp, getApp, getApps } from 'firebase/app';
import {
    getFirestore,
    collection,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    where,
    addDoc,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updatePassword,
    updateEmail,
    EmailAuthProvider,
    reauthenticateWithCredential,
    createUserWithEmailAndPassword,
} from 'firebase/auth';
import {
    getStorage,
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
} from 'firebase/storage';

// Configuration Firebase (projet kbs-btp-app-2025)
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBFn2jq0QF26Z1HnTy5KryXnQ-ns991GZ0',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'kbs-btp-app-2025.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'kbs-btp-app-2025',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'kbs-btp-app-2025.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '152407857512',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:152407857512:web:d3297584f4a0df462c9edd',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Check if Firebase is properly configured
export const isFirebaseConfigured = () => {
    return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
};

// Re-export Firestore utilities for use in hooks
export {
    collection,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    where,
    addDoc,
    serverTimestamp,
    Timestamp,
};

// Re-export Auth utilities
export {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updatePassword,
    updateEmail,
    EmailAuthProvider,
    reauthenticateWithCredential,
    createUserWithEmailAndPassword // Add this
};

// Secondary App for creating users without logging out the admin
let secondaryApp: any = null;

export const createDriverAuthAccount = async (email: string, password: string) => {
    try {
        if (!secondaryApp) {
            const apps = getApps();
            secondaryApp = apps.find(app => app.name === "SecondaryAppForAuth");
            if (!secondaryApp) {
                secondaryApp = initializeApp(firebaseConfig, "SecondaryAppForAuth");
            }
        }
        const secondaryAuth = getAuth(secondaryApp);
        // We import it here so we don't accidentally use the main auth
        const { createUserWithEmailAndPassword: createSecondaryUser } = await import('firebase/auth');
        
        await createSecondaryUser(secondaryAuth, email, password);
        // Automatically signOut from secondary app so it doesn't leave a lingering session
        await signOut(secondaryAuth);
        return true;
    } catch (error: any) {
        // Ignorer l'erreur si l'utilisateur existe déjà
        if (error.code === 'auth/email-already-in-use') {
            console.log("Account already exists in Firebase Auth:", email);
            return true;
        }
        console.error("Failed to create secondary auth account:", error);
        throw error;
    }
};

// Re-export Storage utilities
export { storageRef, uploadBytes, getDownloadURL };

/**
 * Uploads a file to Firebase Storage.
 * @param bucket 'vehicles' or 'documents'
 * @param file The file object to upload
 * @param path Optional folder path (e.g., 'invoices/2024')
 */
export const uploadFile = async (
    bucket: 'vehicles' | 'documents',
    file: File,
    path: string = ''
): Promise<string | null> => {
    if (!isFirebaseConfigured()) {
        console.warn('Firebase not configured. File upload disabled.');
        return null;
    }

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = path ? `${bucket}/${path}/${fileName}` : `${bucket}/${fileName}`;

        const fileRef = storageRef(storage, filePath);
        await uploadBytes(fileRef, file);
        const publicUrl = await getDownloadURL(fileRef);
        return publicUrl;
    } catch (err) {
        console.error('Unexpected error uploading file to Firebase Storage:', err);
        return null;
    }
};
