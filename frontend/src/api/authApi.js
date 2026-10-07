// ==============================================================================
// AUTENTIFIKIMI ME SUPABASE AUTH (sesioni sinkronizohet në çdo pajisje)
// ==============================================================================

import { supabase, toAppError } from '../lib/supabaseClient';

export const authApi = {
  // 1. Regjistrimi. `household_code` (opsional) e bashkon përdoruesin direkt me banesën.
  register: async ({ name, email, password, household_code = '' }) => {
    if (!name || !name.trim()) throw new Error('Ju lutem vendosni emrin dhe mbiemrin tuaj.');
    if (!email || !email.trim()) throw new Error('Ju lutem vendosni email-in.');
    if (!password || password.length < 6) throw new Error('Fjalëkalimi duhet të ketë të paktën 6 karaktere.');

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          name: name.trim(),
          household_code: household_code.trim().toUpperCase()
        }
      }
    });
    if (error) throw toAppError(error, 'Dështoi regjistrimi i llogarisë.');

    // Supabase kthen një përdorues pa identitete kur email-i ekziston (për të mos zbuluar llogaritë)
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error('Ky email është i regjistruar tashmë!');
    }

    const needsConfirmation = !data.session;
    return {
      success: true,
      needsConfirmation,
      session: data.session,
      message: needsConfirmation
        ? 'Llogaria u krijua! Konfirmoni email-in nga inbox-i juaj, pastaj kyçuni këtu.'
        : 'Llogaria u krijua me sukses!'
    };
  },

  // 2. Kyçja
  login: async ({ email, password }) => {
    if (!email || !email.trim() || !password) {
      throw new Error('Ju lutem shkruani email-in dhe fjalëkalimin.');
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });
    if (error) throw toAppError(error);
    return { success: true, session: data.session, user: data.user };
  },

  // 3. Dalja
  logout: async () => {
    await supabase.auth.signOut();
  },

  // 4. Sesioni aktual (ruhet automatikisht nga Supabase në shfletues)
  getSession: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session || null;
  },

  // 5. Dëgjon ndryshimet e sesionit (kyçje / dalje / skadim i token-it)
  onAuthChange: (callback) => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
    return () => data.subscription.unsubscribe();
  }
};
