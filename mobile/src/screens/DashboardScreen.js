import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, SectionList, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert, Share, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SummaryCard from '../components/SummaryCard';
import BalanceCard from '../components/BalanceCard';
import ExpenseItem from '../components/ExpenseItem';
import { expenseApi } from '../api/expenseApi';
import { householdApi } from '../api/householdApi';
import {
  isPersonalExpense,
  isInMonth,
  startOfMonth,
  addMonths,
  expenseDateOf,
  dayLabel,
  formatEuro,
  computeMonthlyOutOfPocket
} from '../utils/balances';
import { C } from '../lib/theme';

const LIST_FILTERS = [
  { id: 'all', label: 'Të gjitha' },
  { id: 'shared', label: 'Të përbashkëta' },
  { id: 'personal', label: 'Personale' }
];

// Tab-et poshtë: Përmbledhja · Shpenzimet · Banesa
const TABS = [
  { id: 'home', label: 'Përmbledhja', icon: 'home' },
  { id: 'expenses', label: 'Shpenzimet', icon: 'receipt' },
  { id: 'household', label: 'Banesa', icon: 'people' }
];
// Tab-i i fundit ruhet sa është hapur app-i (Dashboard-i rikrijohet pas ruajtjes së një shpenzimi)
let lastTab = 'home';

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

export default function DashboardScreen({ user, household, onNavigateToAdd, onNavigateToEdit, onLogout, onLeftHousehold, darkMode = false, onToggleDark }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTabState] = useState(lastTab);
  const setTab = (next) => {
    lastTab = next;
    setTabState(next);
  };

  const members = data?.members || [];
  const expenses = useMemo(() => data?.expenses || [], [data]);

  // Muaji i zgjedhur: totali dhe lista i referohen këtij muaji (borxhet janë gjithmonë totale)
  const [month, setMonth] = useState(() => startOfMonth());
  const [listFilter, setListFilter] = useState('all');
  const isCurrentMonth = month.getTime() === startOfMonth().getTime();
  const monthExpenses = useMemo(() => expenses.filter((e) => isInMonth(e, month)), [expenses, month]);
  const monthlyTotal = useMemo(() => computeMonthlyOutOfPocket(user?.id, expenses, month), [user?.id, expenses, month]);
  const listedExpenses = monthExpenses.filter((e) =>
    listFilter === 'all' ? true : listFilter === 'personal' ? isPersonalExpense(e) : !isPersonalExpense(e)
  );

  // Seksionet e listës sipas ditës: [{ title: 'Sot', data: [...] }, ...]
  const sections = useMemo(() => {
    const out = [];
    listedExpenses.forEach((e) => {
      const title = dayLabel(expenseDateOf(e));
      const last = out[out.length - 1];
      if (last && last.title === title) last.data.push(e);
      else out.push({ title, data: [e] });
    });
    return out;
  }, [listedExpenses]);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      setData(await expenseApi.getSummary(household.id));
    } catch (err) {
      setError(err.message || 'Nuk mund të ngarkohen të dhënat.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [household.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime: rifresko kur një shok shton shpenzim ose lan borxh; dhe kur app-i kthehet në plan të parë
  useEffect(() => {
    const unsubscribe = expenseApi.subscribeToHousehold(household.id, loadData);
    const sub = AppState.addEventListener('change', (state) => state === 'active' && loadData());
    return () => {
      unsubscribe();
      sub.remove();
    };
  }, [household.id, loadData]);

  const handleShareCode = () => {
    Share.share({ message: `Bashkohu me banesën "${household.name}" te Kalkulimi me kodin: ${household.code}` }).catch(() => {});
  };

  // Kontroll i shpejtë në UI; databaza e zbaton rregullin gjithsesi (leave_household)
  const openDebts = data?.summary?.settlementBalance?.breakdown || [];

  const handleLeave = () => {
    if (openDebts.length > 0) {
      const list = openDebts
        .map((d) => (d.type === 'user_owes' ? `• Ti i ke borxh ${d.name}: ${formatEuro(d.amount)}` : `• ${d.name} të ka borxh: ${formatEuro(d.amount)}`))
        .join('\n');
      Alert.alert('Ka borxhe të pashlyera', `Nuk mund të largohesh pa i larë më parë borxhet:\n\n${list}`);
      return;
    }
    Alert.alert('Largohu nga banesa', `Je i sigurt që do të largohesh nga "${household.name}"?`, [
      { text: 'Anulo', style: 'cancel' },
      {
        text: 'Largohu',
        style: 'destructive',
        onPress: async () => {
          try {
            await householdApi.leaveHousehold();
            onLeftHousehold?.();
          } catch (err) {
            Alert.alert('Gabim', err.message);
          }
        }
      }
    ]);
  };

  // Menuja e profilit (dalja nuk është më buton i kuq në header)
  const handleProfileMenu = () => {
    Alert.alert(user?.name || 'Profili', user?.email || '', [
      { text: 'Banesa & ftesa', onPress: () => setTab('household') },
      // Tema e errët: opsion shtesë që përdoruesi e ndez vetë (parazgjedhja është e çelët)
      { text: darkMode ? 'Fik temën e errët' : 'Ndiz temën e errët', onPress: () => onToggleDark?.(!darkMode) },
      { text: 'Dil nga llogaria', style: 'destructive', onPress: onLogout },
      { text: 'Mbyll', style: 'cancel' }
    ]);
  };

  const handleExpenseOptions = (expense) => {
    Alert.alert(expense.title, formatEuro(expense.total_amount), [
      { text: 'Ndrysho', onPress: () => onNavigateToEdit(expense) },
      {
        text: 'Fshij',
        style: 'destructive',
        onPress: async () => {
          try {
            await expenseApi.deleteExpense(expense.id);
            loadData();
          } catch (err) {
            Alert.alert('Gabim', err.message);
          }
        }
      },
      { text: 'Anulo', style: 'cancel' }
    ]);
  };

  const inviteRow = (
    <View className="flex-row items-center">
      <Text selectable className="flex-1 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl py-2.5 text-center text-base font-black tracking-widest text-indigo-700 dark:text-indigo-300">
        {household.code}
      </Text>
      <TouchableOpacity onPress={handleShareCode} className="ml-2 h-11 px-4 rounded-xl bg-indigo-600 dark:bg-indigo-400 flex-row items-center">
        <Ionicons name="share-social" size={16} color={C.onBrand} />
        <Text className="text-white dark:text-slate-900 font-bold text-sm ml-1.5">Dërgo</Text>
      </TouchableOpacity>
    </View>
  );

  const refresh = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}
      colors={[C.brand]}
    />
  );

  const monthCard = (
    <SummaryCard
      month={month}
      monthlyTotal={monthlyTotal}
      isCurrentMonth={isCurrentMonth}
      onPrev={() => setMonth((m) => addMonths(m, -1))}
      onNext={() => setMonth((m) => addMonths(m, 1))}
      onToday={() => setMonth(startOfMonth())}
    />
  );

  const emptyState = (
    <View className="items-center py-10 mt-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 px-6">
      <Ionicons name="receipt-outline" size={32} color={C.faint} />
      <Text className="text-slate-800 dark:text-slate-200 font-semibold text-base mt-2">{expenses.length === 0 ? 'Asnjë shpenzim ende' : 'Asnjë shpenzim këtë muaj'}</Text>
      <Text className="text-slate-500 dark:text-slate-400 text-sm mt-1 text-center">
        {expenses.length === 0 ? 'Shtypni "+ Shto" për shpenzimin e parë të banesës.' : 'Ndërroni muajin ose filtrin.'}
      </Text>
    </View>
  );

  const errorBox = error && (
    <View className="p-3 mb-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl flex-row items-center">
      <Ionicons name="warning-outline" size={18} color={C.warning} />
      <Text className="text-amber-900 dark:text-amber-100 text-sm ml-2 flex-1">{error}</Text>
    </View>
  );

  const scrollPadding = { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 110 };

  let body;
  if (loading) {
    body = (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={C.brand} />
        <Text className="text-slate-500 dark:text-slate-400 mt-3 text-sm">Duke ngarkuar të dhënat...</Text>
      </View>
    );
  } else if (tab === 'expenses') {
    // SHPENZIMET: muaji + filtri + lista e plotë sipas ditës
    body = (
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-3 mb-1.5 px-1">{section.title}</Text>}
        renderItem={({ item, index, section }) => (
          <View
            className={`bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 ${index === 0 ? 'rounded-t-2xl border-t' : 'border-t'} ${
              index === section.data.length - 1 ? 'rounded-b-2xl border-b' : ''
            } border-x`}
          >
            <ExpenseItem expense={item} currentUserId={user?.id} onOptions={handleExpenseOptions} />
          </View>
        )}
        contentContainerStyle={scrollPadding}
        refreshControl={refresh}
        ListHeaderComponent={
          <View>
            {errorBox}
            {monthCard}
            <View className="flex-row">
              {LIST_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => setListFilter(f.id)}
                  className={`px-3.5 py-1.5 rounded-full mr-2 ${listFilter === f.id ? 'bg-slate-900 dark:bg-slate-100' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'}`}
                >
                  <Text className={`text-sm font-semibold ${listFilter === f.id ? 'text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400'}`}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={emptyState}
      />
    );
  } else if (tab === 'household') {
    // BANESA: ftesa, anëtarët me bilancin tënd, largimi
    body = (
      <ScrollView contentContainerStyle={scrollPadding} refreshControl={refresh}>
        {errorBox}
        <View className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 mb-4">
          <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">Banesa</Text>
          <Text className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">{household.name}</Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400 mb-3">Ftoji shokët: ata regjistrohen dhe shkruajnë këtë kod.</Text>
          {inviteRow}
        </View>

        <Text className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2.5">Anëtarët ({members.length})</Text>
        <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 mb-6">
          {members.map((m, i) => {
            const debt = openDebts.find((d) => d.userId === m.id);
            return (
              <View key={m.id} className={`flex-row items-center px-4 py-3 ${i > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}>
                <View className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center mr-3">
                  <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">{initials(m.name)}</Text>
                </View>
                <View className="flex-1">
                  <Text numberOfLines={1} className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {m.name}
                    {m.id === user?.id ? <Text className="font-normal text-slate-500 dark:text-slate-400"> (ti)</Text> : null}
                  </Text>
                  <Text numberOfLines={1} className="text-xs text-slate-500 dark:text-slate-400">{m.email}</Text>
                </View>
                {m.id !== user?.id && (
                  <Text className={`text-sm font-semibold ml-2 ${!debt ? 'text-slate-500 dark:text-slate-400' : debt.type === 'user_owes' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {!debt ? 'të barazuar' : debt.type === 'user_owes' ? `i ke ${formatEuro(debt.amount)}` : `të ka ${formatEuro(debt.amount)}`}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        <TouchableOpacity onPress={handleLeave} className="py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row items-center justify-center">
          <Ionicons name="exit-outline" size={16} color={C.danger} />
          <Text className="text-sm font-semibold text-rose-600 dark:text-rose-400 ml-2">Largohu nga banesa</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  } else {
    // PËRMBLEDHJA: borxhet, muaji, të fundit
    body = (
      <ScrollView contentContainerStyle={scrollPadding} refreshControl={refresh}>
        {errorBox}
        {members.length === 1 && (
          <View className="mb-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900">
            <View className="flex-row items-center mb-1">
              <Ionicons name="person-add-outline" size={18} color={C.brand} />
              <Text className="text-base font-bold text-slate-900 dark:text-slate-100 ml-2">Fto shokët e banesës</Text>
            </View>
            <Text className="text-sm text-slate-500 dark:text-slate-400 mb-3">Je i vetëm në "{household.name}". Dërgoju shokëve këtë kod.</Text>
            {inviteRow}
          </View>
        )}
        <BalanceCard
          balance={data?.summary?.settlementBalance}
          settlements={data?.settlements || []}
          currentUserId={user?.id}
          householdId={household.id}
          onChanged={loadData}
        />
        {monthCard}

        <View className="flex-row justify-between items-center mt-2 mb-2.5">
          <Text className="text-base font-bold text-slate-900 dark:text-slate-100">Të fundit</Text>
          {expenses.length > 0 && (
            <TouchableOpacity onPress={() => setTab('expenses')} className="flex-row items-center">
              <Text className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Shiko të gjitha</Text>
              <Ionicons name="chevron-forward" size={16} color={C.brand} />
            </TouchableOpacity>
          )}
        </View>
        {expenses.length === 0 ? (
          emptyState
        ) : (
          <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
            {expenses.slice(0, 3).map((e, i) => (
              <View key={e.id} className={i > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''}>
                <ExpenseItem expense={e} currentUserId={user?.id} onOptions={handleExpenseOptions} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <View className="px-5 pt-4 pb-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row justify-between items-center">
          <TouchableOpacity onPress={() => setTab('household')} className="flex-1 mr-3">
            <View className="flex-row items-center">
              <Ionicons name="people-outline" size={14} color={C.muted} />
              <Text numberOfLines={1} className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">
                {household.name} · {members.length || 1}
              </Text>
            </View>
            <Text numberOfLines={1} className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Përshëndetje, {(user?.name || 'Përdorues').split(' ')[0]}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleProfileMenu}
            className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 items-center justify-center"
            accessibilityLabel="Menuja e profilit"
          >
            <Text className="text-sm font-black text-indigo-700 dark:text-indigo-300">{initials(user?.name)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-1">{body}</View>

      {/* Butoni lundrues "+" (jo te tab-i "Banesa") */}
      {tab !== 'household' && (
        <TouchableOpacity
          onPress={onNavigateToAdd}
          className="absolute right-5 h-14 pl-4 pr-5 rounded-full bg-indigo-600 dark:bg-indigo-400 flex-row items-center"
          style={{ bottom: 84, elevation: 6, shadowColor: C.brand, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}
          accessibilityLabel="Shto shpenzim"
        >
          <Ionicons name="add" size={22} color={C.onBrand} />
          <Text className="text-white dark:text-slate-900 font-bold text-sm ml-1">Shto</Text>
        </TouchableOpacity>
      )}

      {/* Shiriti i tab-eve poshtë */}
      <View className="flex-row bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTab(t.id)}
              className="flex-1 items-center pt-2.5 pb-3"
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Ionicons name={active ? t.icon : `${t.icon}-outline`} size={22} color={active ? C.brand : C.muted} />
              <Text className={`text-xs font-semibold mt-0.5 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
