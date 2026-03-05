import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface FileRecord {
  id: string;
  filename: string;
  stored_filename: string;
  file_size: number;
  mime_type: string;
  share_token: string;
  download_count: number;
  uploaded_at: string;
  expires_at: string | null;
}
