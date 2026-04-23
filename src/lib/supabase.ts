import { createClient } from '@supabase/supabase-js';

// استخدام استدعاء Vite الصحيح لضمان عمله في البحرين وعلى Coolify
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabase Credentials Missing! Check Coolify Variables.");
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);
