import { createClient } from '@supabase/supabase-js';

// Vlerat merren nga frontend/.env.local (lokalisht) ose nga Environment Variables në Vercel
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    })
  : null;

// Kthen gabimet e Supabase në mesazhe të kuptueshme në shqip
export const toAppError = (error, fallback = 'Ndodhi një gabim. Provoni sërish.') => {
  const msg = error?.message || '';
  if (/Invalid login credentials/i.test(msg)) return new Error('Email-i ose fjalëkalimi nuk është i saktë.');
  if (/Email not confirmed/i.test(msg)) return new Error('Ju lutem konfirmoni email-in tuaj (shikoni inbox-in) para kyçjes.');
  if (/already registered|already been registered/i.test(msg)) return new Error('Ky email është i regjistruar tashmë!');
  if (/Password should be at least/i.test(msg)) return new Error('Fjalëkalimi duhet të ketë të paktën 6 karaktere.');
  if (/Failed to fetch|NetworkError/i.test(msg)) return new Error('Nuk ka lidhje me serverin. Kontrolloni internetin.');
  // Mesazhet nga funksionet tona SQL (raise exception) janë tashmë në shqip
  return new Error(msg || fallback);
};
