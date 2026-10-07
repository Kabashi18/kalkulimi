// KOPJE e frontend/src/api/householdApi.js - mbajeni të sinkronizuar me versionin web.
// ==============================================================================
// BANESA (HOUSEHOLD): krijimi, bashkimi me kod, anëtarët
// ==============================================================================

import { supabase, toAppError } from '../lib/supabaseClient';

export const householdApi = {
  // Profili i përdoruesit të kyçur bashkë me banesën e tij (nëse ka)
  getMyProfile: async () => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, household_id, household:households(id, name, code)')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw toAppError(error, 'Dështoi ngarkimi i profilit.');
    return data;
  },

  // Krijon banesë të re me kod unik (p.sh. BANESA-4821) dhe e bën përdoruesin anëtar
  createHousehold: async (name) => {
    const { data, error } = await supabase.rpc('create_household', { p_name: name || '' });
    if (error) throw toAppError(error, 'Dështoi krijimi i banesës.');
    return data;
  },

  // Bashkohet me një banesë ekzistuese përmes kodit
  joinHousehold: async (code) => {
    if (!code || !code.trim()) throw new Error('Ju lutem shkruani kodin e banesës.');
    const { data, error } = await supabase.rpc('join_household', { p_code: code.trim().toUpperCase() });
    if (error) throw toAppError(error, 'Dështoi bashkimi me banesën.');
    return data;
  },

  leaveHousehold: async () => {
    const { error } = await supabase.rpc('leave_household');
    if (error) throw toAppError(error, 'Dështoi largimi nga banesa.');
  },

  // Anëtarët aktualë të banesës (RLS kthen vetëm shokët e së njëjtës banesë)
  getMembers: async (householdId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true });
    if (error) throw toAppError(error, 'Dështoi ngarkimi i anëtarëve.');
    return data || [];
  }
};
