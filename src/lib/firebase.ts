import { initializeApp } from 'firebase/app';
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

// Configuration Firebase (projet compta1-fa357)
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBdcYX_pRwRDjk3mlpJvjPBwjjgY5j-uFs',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'compta1-fa357.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'compta1-fa357',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'compta1-fa357.appspot.com',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '996737652811',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:996737652811:web:8040e97b8da2247c2b55ce',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-MVQTXCTWGY',
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
            secondaryApp = initializeApp(firebaseConfig, "SecondaryAppForAuth");
        }
        const secondaryAuth = getAuth(secondaryApp);
        // We import it here so we don't accidentally use the main auth
        const { createUserWithEmailAndPassword: createSecondaryUser } = await import('firebase/auth');
        
        await createSecondaryUser(secondaryAuth, email, password);
        // Automatically signOut from secondary app so it doesn't leave a lingering session
        await secondaryAuth.signOut();
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
