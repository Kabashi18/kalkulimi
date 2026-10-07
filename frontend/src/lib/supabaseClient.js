import { createClient } from '@supabase/supabase-js';

// Vlerat merren nga frontend/.env.local (lokalisht) ose nga Environment Variables në Vercel.
// Ky modul nuk duhet të hedhë kurrë gabim gjatë ngarkimit, sepse kjo do ta linte faqen të bardhë.
// Në vend të kësaj, problemi ruhet te `supabaseConfigError` dhe App shfaq një ekran ndihmës.

// Heq hapësirat dhe thonjëzat që shpesh ngjiten gabimisht në Vercel ("https://..." ose 'eyJ...')
const clean = (value) => (value ?? '').toString().trim().replace(/^['"]+|['"]+$/g, '').trim();

const normalizeUrl = (value) => {
  let url = clean(value);
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  // Pranon edhe URL-në e kopjuar nga paneli i API-së (…supabase.co/rest/v1/)
  return url.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
};

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_URL = normalizeUrl(rawUrl);
const SUPABASE_ANON_KEY = clean(rawKey);

const validateConfig = () => {
  if (!SUPABASE_URL && !SUPABASE_ANON_KEY) {
    return 'Mungojnë të dy variablat VITE_SUPABASE_URL dhe VITE_SUPABASE_ANON_KEY.';
  }
  if (!SUPABASE_URL) return 'Mungon variabla VITE_SUPABASE_URL.';
  if (!SUPABASE_ANON_KEY) return 'Mungon variabla VITE_SUPABASE_ANON_KEY.';

  try {
    const { hostname } = new URL(SUPABASE_URL);
    if (hostname === 'supabase.com' || hostname.endsWith('.supabase.com')) {
      return 'VITE_SUPABASE_URL duket si adresa e panelit (supabase.com/dashboard/...). Përdorni "Project URL", p.sh. https://xxxx.supabase.co';
    }
  } catch {
    return `VITE_SUPABASE_URL nuk është URL e vlefshme ("${clean(rawUrl).slice(0, 60)}"). Duhet të jetë p.sh. https://xxxx.supabase.co`;
  }

  if (/\.{3}$|…$/.test(SUPABASE_ANON_KEY)) {
    return 'VITE_SUPABASE_ANON_KEY mbaron me "..." - çelësi është kopjuar i shkurtuar. Përdorni butonin Copy te Supabase → Project Settings → API Keys.';
  }
  if (/\s/.test(SUPABASE_ANON_KEY)) {
    return 'VITE_SUPABASE_ANON_KEY përmban hapësira ose rreshta të rinj. Ngjiteni çelësin sërish pa hapësira.';
  }
  if (/^sb_secret_/.test(SUPABASE_ANON_KEY)) {
    return 'Keni vendosur çelësin SECRET. Përdorni "Publishable key" (sb_publishable_...) ose "anon public" - kurrë çelësin secret në frontend.';
  }
  return null;
};

let configError = validateConfig();
let client = null;

if (!configError) {
  try {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
  } catch (err) {
    configError = `Supabase nuk u inicializua: ${err?.message || err}`;
  }
}

export const supabase = client;
export const supabaseConfigError = configError;
export const isSupabaseConfigured = Boolean(client);

// Kthen gabimet e Supabase në mesazhe të kuptueshme në shqip
export const toAppError = (error, fallback = 'Ndodhi një gabim. Provoni sërish.') => {
  const msg = error?.message || '';
  if (/Invalid API key|No API key found/i.test(msg)) {
    return new Error('Çelësi i Supabase (VITE_SUPABASE_ANON_KEY) është i pavlefshëm. Kopjoni sërish "Publishable key" të plotë dhe bëni Redeploy.');
  }
  if (/Invalid login credentials/i.test(msg)) return new Error('Email-i ose fjalëkalimi nuk është i saktë.');
  if (/Email not confirmed/i.test(msg)) return new Error('Ju lutem konfirmoni email-in tuaj (shikoni inbox-in) para kyçjes.');
  if (/already registered|already been registered/i.test(msg)) return new Error('Ky email është i regjistruar tashmë!');
  if (/Password should be at least/i.test(msg)) return new Error('Fjalëkalimi duhet të ketë të paktën 6 karaktere.');
  if (/Failed to fetch|NetworkError/i.test(msg)) return new Error('Nuk ka lidhje me serverin. Kontrolloni internetin ose VITE_SUPABASE_URL.');
  if (/relation .* does not exist|Could not find the (table|function)/i.test(msg)) {
    return new Error('Databaza nuk është konfiguruar. Ekzekutoni supabase/schema.sql te Supabase SQL Editor.');
  }
  // Mesazhet nga funksionet tona SQL (raise exception) janë tashmë në shqip
  return new Error(msg || fallback);
};
