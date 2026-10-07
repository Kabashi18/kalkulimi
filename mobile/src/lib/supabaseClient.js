import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';

// Vlerat merren nga mobile/.env (Expo i fut automatikisht variablat EXPO_PUBLIC_* në kod).
// Ky modul nuk hedh kurrë gabim gjatë ngarkimit; problemi ruhet te `supabaseConfigError`.

// Heq hapësirat, thonjëzat, kllapat dhe formatin markdown [url](url)
const clean = (value) => {
  let val = (value ?? '').toString().trim();
  const mdMatch = val.match(/\((https?:\/\/[^\s)]+)\)/);
  if (mdMatch) val = mdMatch[1];
  return val.replace(/^['"`\[\]<>\(\)]+|['"`\[\]<>\(\)]+$/g, '').trim();
};

const normalizeUrl = (value) => {
  let url = clean(value);
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
};

const SUPABASE_URL = normalizeUrl(process.env.EXPO_PUBLIC_SUPABASE_URL);
const SUPABASE_ANON_KEY = clean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

const validateConfig = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return 'Mungojnë EXPO_PUBLIC_SUPABASE_URL dhe/ose EXPO_PUBLIC_SUPABASE_ANON_KEY te mobile/.env';
  }
  if (!/^https?:\/\/[^/\s]+\.[^/\s]+/i.test(SUPABASE_URL) || /supabase\.com/i.test(SUPABASE_URL)) {
    return `EXPO_PUBLIC_SUPABASE_URL nuk është e vlefshme ("${SUPABASE_URL.slice(0, 60)}"). Duhet të jetë p.sh. https://xxxx.supabase.co`;
  }
  if (/\.{3}$|…$/.test(SUPABASE_ANON_KEY)) {
    return 'EXPO_PUBLIC_SUPABASE_ANON_KEY mbaron me "..." - çelësi është kopjuar i shkurtuar.';
  }
  if (/^sb_secret_/.test(SUPABASE_ANON_KEY)) {
    return 'Keni vendosur çelësin SECRET. Përdorni "Publishable key" (sb_publishable_...).';
  }
  return null;
};

let configError = validateConfig();
let client = null;

if (!configError) {
  try {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    });

    // Rifreskimi i token-it vetëm kur app-i është në plan të parë (rekomandimi zyrtar i Supabase për React Native)
    AppState.addEventListener('change', (state) => {
      if (state === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
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
  if (/Invalid API key|No API key found/i.test(msg)) return new Error('Çelësi i Supabase është i pavlefshëm. Kontrolloni mobile/.env');
  if (/Invalid login credentials/i.test(msg)) return new Error('Email-i ose fjalëkalimi nuk është i saktë.');
  if (/rate limit/i.test(msg)) return new Error('Shumë regjistrime brenda një kohe të shkurtër. Provoni sërish pas pak minutash.');
  if (/Email not confirmed/i.test(msg)) return new Error('Ju lutem konfirmoni email-in tuaj (shikoni inbox-in) para kyçjes.');
  if (/already registered|already been registered/i.test(msg)) return new Error('Ky email është i regjistruar tashmë!');
  if (/Password should be at least/i.test(msg)) return new Error('Fjalëkalimi duhet të ketë të paktën 6 karaktere.');
  if (/Network request failed|Failed to fetch/i.test(msg)) return new Error('Nuk ka lidhje me serverin. Kontrolloni internetin.');
  if (/relation .* does not exist|Could not find the (table|function)/i.test(msg)) {
    return new Error('Databaza nuk është konfiguruar. Ekzekutoni supabase/schema.sql te Supabase.');
  }
  return new Error(msg || fallback);
};
