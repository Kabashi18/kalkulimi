import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, SectionList, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert, Share, AppState, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SummaryCard from '../components/SummaryCard';
import BalanceCard from '../components/BalanceCard';
import ExpenseItem from '../components/ExpenseItem';
import BottomNav from '../components/BottomNav';
import ReceiptViewer from '../components/ReceiptViewer';
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
import { pushNotifications } from '../lib/pushNotifications';

const LIST_FILTERS = [
  { id: 'all', label: 'Të gjitha' },
  { id: 'shared', label: 'Të përbashkëta' },
  { id: 'personal', label: 'Personale' }
];

// Shiriti i poshtëm (si në web): Dashboard · Shto · Cilësimet. Lista e plotë e shpenzimeve ('expenses')
// hapet nga "Shiko të gjitha" dhe i përket Dashboard-it.
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
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  // Fotoja e faturës e hapur në madhësi të plotë: { url, title } ose null
  const [receiptToView, setReceiptToView] = useState(null);
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

  useEffect(() => {
    pushNotifications.isEnabled(user?.id).then(setPushEnabled).catch(() => setPushEnabled(false));
  }, [user?.id]);

  // Njoftimet push për shpenzimet e përbashkëta, pagesat dhe anëtarët e rinj
  const handleTogglePush = async () => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      if (pushEnabled) {
        await pushNotifications.disable();
        setPushEnabled(false);
      } else {
        await pushNotifications.enable(user?.id);
        setPushEnabled(true);
      }
    } catch (err) {
      Alert.alert('Njoftimet push', err?.message || 'Dështoi ndryshimi i njoftimeve.');
    } finally {
      setPushBusy(false);
    }
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

  const scrollPadding = { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 };

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
            <ExpenseItem expense={item} currentUserId={user?.id} onOptions={handleExpenseOptions} onViewReceipt={setReceiptToView} />
          </View>
        )}
        contentContainerStyle={scrollPadding}
        refreshControl={refresh}
        ListHeaderComponent={
          <View>
            <TouchableOpacity onPress={() => setTab('home')} className="flex-row items-center mb-3 -ml-1" accessibilityRole="button">
              <Ionicons name="chevron-back" size={18} color={C.icon} />
              <Text className="text-sm font-semibold text-slate-600 dark:text-slate-400">Dashboard</Text>
            </TouchableOpacity>
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
  } else if (tab === 'settings') {
    // CILËSIMET: profili, preferencat, banesa me ftesën dhe anëtarët, largimi, dalja
    const toggleStyle = { trackColor: { false: C.placeholderSoft, true: C.brand }, thumbColor: '#ffffff' };
    body = (
      <ScrollView contentContainerStyle={scrollPadding} refreshControl={refresh}>
        {errorBox}
        <View className="flex-row items-center p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 mb-4">
          <View className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 items-center justify-center mr-3">
            <Text className="text-base font-black text-indigo-700 dark:text-indigo-300">{initials(user?.name)}</Text>
          </View>
          <View className="flex-1">
            <Text numberOfLines={1} className="text-base font-bold text-slate-900 dark:text-slate-100">{user?.name || 'Profili'}</Text>
            <Text numberOfLines={1} className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</Text>
          </View>
        </View>

        <Text className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2.5">Preferencat</Text>
        <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 mb-6">
          {/* Tema e errët: opsion shtesë që përdoruesi e ndez vetë (parazgjedhja është e çelët) */}
          <View className="flex-row items-center justify-between px-4 py-3">
            <View className="flex-row items-center">
              <Ionicons name="moon-outline" size={20} color={C.icon} />
              <Text className="ml-3 text-base text-slate-700 dark:text-slate-300">Tema e errët</Text>
            </View>
            <Switch value={darkMode} onValueChange={(enabled) => onToggleDark?.(enabled)} {...toggleStyle} />
          </View>
          <View className="flex-row items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800">
            <View className="flex-row items-center">
              <Ionicons name="notifications-outline" size={20} color={C.icon} />
              <Text className="ml-3 text-base text-slate-700 dark:text-slate-300">Njoftimet push</Text>
            </View>
            {pushBusy ? <ActivityIndicator color={C.brand} /> : <Switch value={pushEnabled} onValueChange={handleTogglePush} {...toggleStyle} />}
          </View>
        </View>

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

        <TouchableOpacity onPress={onLogout} className="mt-3 py-3 rounded-2xl bg-rose-50 dark:bg-rose-950 flex-row items-center justify-center" accessibilityRole="button">
          <Ionicons name="log-out-outline" size={16} color={C.danger} />
          <Text className="text-sm font-semibold text-rose-600 dark:text-rose-400 ml-2">Dil nga llogaria</Text>
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
                <ExpenseItem expense={e} currentUserId={user?.id} onOptions={handleExpenseOptions} onViewReceipt={setReceiptToView} />
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
          <TouchableOpacity onPress={() => setTab('settings')} className="flex-1 mr-3">
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
            onPress={() => setTab('settings')}
            className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 items-center justify-center"
            accessibilityLabel="Cilësimet"
          >
            <Text className="text-sm font-black text-indigo-700 dark:text-indigo-300">{initials(user?.name)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-1">{body}</View>

      {/* Shiriti i poshtëm: gjithmonë në fund të ekranit, përmbajtja lëviz sipër tij */}
      <BottomNav active={tab === 'settings' ? 'settings' : 'home'} onNavigate={setTab} onAdd={onNavigateToAdd} />

      {/* Fotoja e faturës në madhësi të plotë */}
      <ReceiptViewer url={receiptToView?.url} title={receiptToView?.title} onClose={() => setReceiptToView(null)} />
    </SafeAreaView>
  );
}
