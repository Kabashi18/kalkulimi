// ==============================================================================
// SHPENZIMET & BARAZIMI ME SUPABASE (të përbashkëta për gjithë banesën)
// ==============================================================================
// Siguria zbatohet në databazë (RLS): shpenzimet personale i sheh vetëm pronari,
// ndërsa ato të përbashkëtat i sheh çdo anëtar i së njëjtës banesë.

import { supabase, toAppError } from '../lib/supabaseClient';
import { householdApi } from './householdApi';
import {
  isPersonalExpense,
  computeBalancesForUser,
  computeGroupReport,
  computeMonthlyOutOfPocket,
  computeCategoryBreakdown
} from '../utils/balances';

export { isPersonalExpense };

// Supabase i kthen kolonat `numeric` si string -> i kthejmë në numra
const normalizeExpense = (row) => ({
  ...row,
  total_amount: Number(row.total_amount),
  isPersonal: Boolean(row.is_personal),
  splits: (row.splits || []).map((s) => ({ user_id: s.user_id, amount_owed: Number(s.amount_owed) }))
});

const normalizeSettlement = (row) => ({ ...row, amount: Number(row.amount) });

const getCurrentUserId = async () => {
  const { data } = await supabase.auth.getUser();
  if (!data?.user) throw new Error('Sesioni ka skaduar. Ju lutem kyçuni sërish.');
  return data.user.id;
};

// Ngarkon gjithçka për banesën në paralel
const fetchHouseholdData = async (householdId) => {
  const [members, expensesRes, settlementsRes] = await Promise.all([
    householdApi.getMembers(householdId),
    supabase
      .from('expenses')
      .select('id, household_id, paid_by, created_by, title, total_amount, category, is_personal, created_at, splits:expense_splits(user_id, amount_owed)')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false }),
    supabase
      .from('settlements')
      .select('id, from_user, to_user, amount, created_by, created_at')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })
  ]);

  if (expensesRes.error) throw toAppError(expensesRes.error, 'Dështoi ngarkimi i shpenzimeve.');
  if (settlementsRes.error) throw toAppError(settlementsRes.error, 'Dështoi ngarkimi i pagesave.');

  return {
    members,
    expenses: (expensesRes.data || []).map(normalizeExpense),
    settlements: (settlementsRes.data || []).map(normalizeSettlement)
  };
};

const saveExpense = async (id, { title, total_amount, category, isPersonal = false, member_ids = [], paid_by = null }) => {
  const amount = parseFloat(total_amount);
  if (!title || !title.trim()) throw new Error('Ju lutem shkruani një titull për shpenzimin.');
  if (isNaN(amount) || amount <= 0) throw new Error('Ju lutem vendosni një shumë pozitive në euro.');
  if (!isPersonal && member_ids.length === 0) throw new Error('Zgjidhni të paktën një anëtar për ndarjen.');

  const { data, error } = await supabase.rpc('save_expense', {
    p_id: id,
    p_title: title.trim(),
    p_total_amount: amount,
    p_category: category || 'Të tjera',
    p_is_personal: Boolean(isPersonal),
    p_member_ids: isPersonal ? [] : member_ids,
    // Shpenzimet personale paguhen gjithmonë nga vetë përdoruesi
    p_paid_by: isPersonal ? null : paid_by
  });
  if (error) throw toAppError(error, 'Ndodhi një gabim gjatë ruajtjes së shpenzimit.');
  return { success: true, data: normalizeExpense(data) };
};

export const expenseApi = {
  // 1. Përmbledhja për Dashboard-in: borxhet, totali mujor, kategoritë, lista
  getSummary: async (householdId) => {
    const userId = await getCurrentUserId();
    const { members, expenses, settlements } = await fetchHouseholdData(householdId);
    const nameOf = (id) => members.find((m) => m.id === id)?.name || 'Ish-anëtar';

    const enrichedExpenses = expenses.map((exp) => {
      const isPayer = exp.paid_by === userId;
      const mySplit = exp.splits.find((s) => s.user_id === userId);
      return {
        ...exp,
        paid_by_user_id: exp.paid_by,
        paid_by_name: nameOf(exp.paid_by),
        is_payer: isPayer ? 1 : 0,
        // Ndryshimi / fshirja lejohet për paguesin dhe për atë që e regjistroi
        can_edit: isPayer || exp.created_by === userId,
        my_split_amount: exp.isPersonal ? exp.total_amount : (mySplit?.amount_owed ?? 0),
        member_ids: exp.splits.map((s) => s.user_id)
      };
    });

    return {
      summary: {
        currentMonth: { totalPaidOutOfPocket: computeMonthlyOutOfPocket(userId, expenses) },
        settlementBalance: computeBalancesForUser(userId, expenses, settlements, members),
        categoryBreakdown: computeCategoryBreakdown(expenses)
      },
      expenses: enrichedExpenses,
      settlements: settlements.map((s) => ({
        ...s,
        from_name: nameOf(s.from_user),
        to_name: nameOf(s.to_user)
      })),
      members,
      currentUserId: userId
    };
  },

  // 2. Shpenzim i ri (personal ose i përbashkët mes `member_ids`)
  createExpense: (payload) => saveExpense(null, payload),

  // 3. Përditësim (lejohet për paguesin ose për atë që e regjistroi)
  updateExpense: (id, payload) => saveExpense(Number(id), payload),

  // 4. Fshirje (lejohet për paguesin ose për atë që e regjistroi)
  deleteExpense: async (id) => {
    const { data, error } = await supabase.from('expenses').delete().eq('id', id).select('id');
    if (error) throw toAppError(error, 'Dështoi fshirja e shpenzimit.');
    if (!data || data.length === 0) throw new Error('Vetëm ai që e pagoi ose e regjistroi mund ta fshijë këtë shpenzim.');
    return { success: true, message: 'Shpenzimi u fshi me sukses.' };
  },

  // 5. "Laje Borxhin": regjistron që `fromUser` i dha `amount` € personit `toUser`
  settleUp: async ({ householdId, fromUser, toUser, amount }) => {
    const userId = await getCurrentUserId();
    const value = Number(parseFloat(amount).toFixed(2));
    if (!value || value <= 0) throw new Error('Shuma e pagesës duhet të jetë pozitive.');

    const { error } = await supabase.from('settlements').insert({
      household_id: householdId,
      from_user: fromUser,
      to_user: toUser,
      amount: value,
      created_by: userId
    });
    if (error) throw toAppError(error, 'Dështoi regjistrimi i pagesës.');
    return { success: true };
  },

  // Anulon një pagesë të regjistruar gabimisht (vetëm nga ai që e regjistroi)
  deleteSettlement: async (id) => {
    const { error } = await supabase.from('settlements').delete().eq('id', id);
    if (error) throw toAppError(error, 'Dështoi anulimi i pagesës.');
  },

  // 6. Raporti i barazimit për PDF (VETËM shpenzimet e përbashkëta)
  getGroupReport: async (household) => {
    const { members, expenses, settlements } = await fetchHouseholdData(household.id);
    const nameOf = (id) => members.find((m) => m.id === id)?.name || 'Ish-anëtar';
    const report = computeGroupReport(expenses, settlements, members);

    return {
      group: { id: household.id, name: household.name, code: household.code },
      report: {
        ...report,
        month: new Date().toLocaleDateString('sq-AL', { month: 'long', year: 'numeric' }),
        expenses: report.expenses.map((e) => ({ ...e, paid_by_name: nameOf(e.paid_by) }))
      }
    };
  },

  // 7. Realtime: thërret `onChange` sa herë që një shok shton/ndryshon/fshin diçka
  subscribeToHousehold: (householdId, onChange) => {
    let timer = null;
    const trigger = () => {
      clearTimeout(timer);
      timer = setTimeout(onChange, 250); // bashkon ngjarjet e njëpasnjëshme (shpenzim + ndarjet)
    };
    const filter = `household_id=eq.${householdId}`;

    const channel = supabase
      .channel(`household-${householdId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter }, trigger)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements', filter }, trigger)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter }, trigger)
      // Ngjarjet DELETE nuk mund të filtrohen në Supabase Realtime
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'expenses' }, trigger)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'settlements' }, trigger)
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }
};
