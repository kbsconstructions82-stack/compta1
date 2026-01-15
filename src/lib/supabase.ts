import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Create client even if variables are missing (for development mode)
// The app will use localStorage/mock data when Supabase is not configured
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true, // Enable session persistence for auth operations
        autoRefreshToken: true, // Auto refresh tokens
        detectSessionInUrl: true, // Detect session from URL (for password reset)
    }
});

// Check if Supabase is properly configured
export const isSupabaseConfigured = () => {
    return import.meta.env.VITE_SUPABASE_URL && 
           import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
           import.meta.env.VITE_SUPABASE_ANON_KEY && 
           import.meta.env.VITE_SUPABASE_ANON_KEY !== 'placeholder-key';
};

/**
 * Uploads a file to Supabase Storage.
 * @param bucket 'vehicles' or 'documents'
 * @param file The file object to upload
 * @param path Optional folder path (e.g., 'invoices/2024')
 */
export const uploadFile = async (
    bucket: 'vehicles' | 'documents',
    file: File,
    path: string = ''
): Promise<string | null> => {
    // If Supabase is not configured, return null (files will be stored in localStorage)
    if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured. File upload disabled. Using localStorage fallback.');
        return null;
    }

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = path ? `${path}/${fileName}` : fileName;

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, file);

        if (error) {
            console.error('Error uploading file:', error);
            return null;
        }

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (err) {
        console.error('Unexpected error uploading file:', err);
        return null;
    }
};
