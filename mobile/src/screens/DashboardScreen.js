import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, SectionList, RefreshControl, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert, Share, AppState } from 'react-native';
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

const LIST_FILTERS = [
  { id: 'all', label: 'Të gjitha' },
  { id: 'shared', label: 'Të përbashkëta' },
  { id: 'personal', label: 'Personale' }
];

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

export default function DashboardScreen({ user, household, onNavigateToAdd, onNavigateToEdit, onLogout, onLeftHousehold }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showInvite, setShowInvite] = useState(false);

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

  const handleLeave = () => {
    // Kontroll i shpejtë në UI; databaza e zbaton rregullin gjithsesi (leave_household)
    const openDebts = data?.summary?.settlementBalance?.breakdown || [];
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
      { text: 'Banesa & ftesa', onPress: () => setShowInvite(true) },
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
      <Text selectable className="flex-1 bg-white border border-indigo-200 rounded-xl py-2.5 text-center text-base font-black tracking-widest text-indigo-700">
        {household.code}
      </Text>
      <TouchableOpacity onPress={handleShareCode} className="ml-2 h-11 px-4 rounded-xl bg-indigo-600 flex-row items-center">
        <Ionicons name="share-social" size={16} color="#fff" />
        <Text className="text-white font-bold text-sm ml-1.5">Dërgo</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="px-5 pt-4 pb-3 bg-white border-b border-slate-100">
        <View className="flex-row justify-between items-center">
          <TouchableOpacity onPress={() => setShowInvite(!showInvite)} className="flex-1 mr-3">
            <View className="flex-row items-center">
              <Ionicons name="people-outline" size={14} color="#64748b" />
              <Text numberOfLines={1} className="text-xs font-semibold text-slate-500 ml-1">
                {household.name} · {members.length || 1}
              </Text>
              <Ionicons name={showInvite ? 'chevron-up' : 'chevron-down'} size={14} color="#64748b" style={{ marginLeft: 2 }} />
            </View>
            <Text numberOfLines={1} className="text-lg font-bold text-slate-900">
              Përshëndetje, {(user?.name || 'Përdorues').split(' ')[0]}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleProfileMenu}
            className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center"
            accessibilityLabel="Menuja e profilit"
          >
            <Text className="text-sm font-black text-indigo-700">{initials(user?.name)}</Text>
          </TouchableOpacity>
        </View>

        {showInvite && (
          <View className="mt-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
            <Text className="text-sm text-indigo-950 mb-2.5">Ftoji shokët: ata regjistrohen dhe shkruajnë këtë kod.</Text>
            {inviteRow}
            <View className="flex-row flex-wrap mt-3">
              {members.map((m) => (
                <View key={m.id} className={`px-2.5 py-1 rounded-full mr-1.5 mb-1.5 ${m.id === user?.id ? 'bg-indigo-600' : 'bg-white border border-slate-200'}`}>
                  <Text className={`text-xs font-semibold ${m.id === user?.id ? 'text-white' : 'text-slate-700'}`}>
                    {m.id === user?.id ? `${m.name} (ti)` : m.name}
                  </Text>
                </View>
              ))}
            </View>
            <TouchableOpacity onPress={handleLeave} className="mt-2">
              <Text className="text-xs font-semibold text-slate-500">Largohu nga banesa</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text className="text-slate-500 mt-3 text-sm">Duke ngarkuar të dhënat...</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => <Text className="text-xs font-semibold text-slate-500 mt-3 mb-1.5 px-1">{section.title}</Text>}
          renderItem={({ item, index, section }) => (
            <View
              className={`bg-white border-slate-100 ${index === 0 ? 'rounded-t-2xl border-t' : 'border-t'} ${
                index === section.data.length - 1 ? 'rounded-b-2xl border-b' : ''
              } border-x`}
            >
              <ExpenseItem expense={item} currentUserId={user?.id} onOptions={handleExpenseOptions} />
            </View>
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 110 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              colors={['#4f46e5']}
            />
          }
          ListHeaderComponent={
            <View>
              {error && (
                <View className="p-3 mb-4 bg-amber-50 border border-amber-200 rounded-xl flex-row items-center">
                  <Ionicons name="warning-outline" size={18} color="#d97706" />
                  <Text className="text-amber-900 text-sm ml-2 flex-1">{error}</Text>
                </View>
              )}
              {members.length === 1 && (
                <View className="mb-4 p-5 rounded-3xl bg-white border border-indigo-100">
                  <View className="flex-row items-center mb-1">
                    <Ionicons name="person-add-outline" size={18} color="#4f46e5" />
                    <Text className="text-base font-bold text-slate-900 ml-2">Fto shokët e banesës</Text>
                  </View>
                  <Text className="text-sm text-slate-500 mb-3">Je i vetëm në "{household.name}". Dërgoju shokëve këtë kod.</Text>
                  {inviteRow}
                </View>
              )}

              {/* 1. Kryesorja: kush i ka borxh kujt */}
              <BalanceCard
                balance={data?.summary?.settlementBalance}
                settlements={data?.settlements || []}
                currentUserId={user?.id}
                householdId={household.id}
                onChanged={loadData}
              />

              {/* 2. Muaji */}
              <SummaryCard
                month={month}
                monthlyTotal={monthlyTotal}
                isCurrentMonth={isCurrentMonth}
                onPrev={() => setMonth((m) => addMonths(m, -1))}
                onNext={() => setMonth((m) => addMonths(m, 1))}
                onToday={() => setMonth(startOfMonth())}
              />

              {/* 3. Shpenzimet + filtri */}
              <View className="flex-row justify-between items-center mt-2 mb-2.5">
                <Text className="text-base font-bold text-slate-900">Shpenzimet</Text>
                <Text className="text-sm text-slate-500">{listedExpenses.length}</Text>
              </View>
              <View className="flex-row">
                {LIST_FILTERS.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    onPress={() => setListFilter(f.id)}
                    className={`px-3.5 py-1.5 rounded-full mr-2 ${listFilter === f.id ? 'bg-slate-900' : 'bg-white border border-slate-200'}`}
                  >
                    <Text className={`text-sm font-semibold ${listFilter === f.id ? 'text-white' : 'text-slate-600'}`}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          ListEmptyComponent={
            <View className="items-center py-10 mt-3 bg-white rounded-3xl border border-slate-100 px-6">
              <Ionicons name="receipt-outline" size={32} color="#94a3b8" />
              <Text className="text-slate-800 font-semibold text-base mt-2">
                {expenses.length === 0 ? 'Asnjë shpenzim ende' : 'Asnjë shpenzim këtë muaj'}
              </Text>
              <Text className="text-slate-500 text-sm mt-1 text-center">
                {expenses.length === 0 ? 'Shtypni butonin + poshtë djathtas për shpenzimin e parë.' : 'Ndërroni muajin ose filtrin.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Butoni lundrues "+" */}
      <TouchableOpacity
        onPress={onNavigateToAdd}
        className="absolute bottom-8 right-5 h-14 pl-4 pr-5 rounded-full bg-indigo-600 flex-row items-center"
        style={{ elevation: 6, shadowColor: '#4f46e5', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}
        accessibilityLabel="Shto shpenzim"
      >
        <Ionicons name="add" size={22} color="#fff" />
        <Text className="text-white font-bold text-sm ml-1">Shto</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
