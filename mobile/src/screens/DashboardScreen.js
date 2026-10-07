import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert, Share, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SummaryCard from '../components/SummaryCard';
import BalanceCard from '../components/BalanceCard';
import ExpenseItem from '../components/ExpenseItem';
import { expenseApi } from '../api/expenseApi';
import { householdApi } from '../api/householdApi';

export default function DashboardScreen({ user, household, onNavigateToAdd, onNavigateToEdit, onLogout, onLeftHousehold }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showInvite, setShowInvite] = useState(false);

  const members = data?.members || [];
  const expenses = data?.expenses || [];

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
    Share.share({
      message: `Bashkohu me banesën "${household.name}" te Kalkulimi me kodin: ${household.code}`
    }).catch(() => {});
  };

  const handleLeave = () => {
    // Kontroll i shpejtë në UI; databaza e zbaton rregullin gjithsesi (leave_household)
    const openDebts = data?.summary?.settlementBalance?.breakdown || [];
    if (openDebts.length > 0) {
      const list = openDebts
        .map((d) => (d.type === 'user_owes' ? `• Ti i ke borxh ${d.name}: ${d.amount.toFixed(2)} €` : `• ${d.name} të ka borxh: ${d.amount.toFixed(2)} €`))
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

  const handleExpenseOptions = (expense) => {
    Alert.alert(expense.title, `${Number(expense.total_amount).toFixed(2)} €`, [
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

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="px-5 pt-4 pb-3 bg-white border-b border-slate-100">
        <View className="flex-row justify-between items-center">
          <TouchableOpacity onPress={() => setShowInvite(!showInvite)} className="flex-1 mr-2">
            <View className="flex-row items-center">
              <Text numberOfLines={1} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {household.name}
              </Text>
              <View className="flex-row items-center bg-slate-100 px-1.5 py-0.5 rounded-md ml-1.5">
                <Ionicons name="people" size={10} color="#64748b" />
                <Text className="text-[10px] font-bold text-slate-500 ml-0.5">{members.length || 1}</Text>
              </View>
            </View>
            <Text numberOfLines={1} className="text-lg font-bold text-slate-800">
              Përshëndetje, {(user?.name || 'Përdorues').split(' ')[0]}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onNavigateToAdd} className="bg-indigo-600 px-3.5 py-2 rounded-full flex-row items-center">
            <Ionicons name="add" size={16} color="#fff" />
            <Text className="text-white font-semibold text-xs ml-0.5">Shto</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onLogout} className="w-8 h-8 rounded-full bg-rose-50 items-center justify-center ml-2">
            <Ionicons name="log-out-outline" size={16} color="#e11d48" />
          </TouchableOpacity>
        </View>

        {showInvite && (
          <View className="mt-3 p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl">
            <Text className="text-[11px] font-semibold text-indigo-900 mb-2">Ftoji shokët: ata regjistrohen dhe shkruajnë këtë kod.</Text>
            <View className="flex-row items-center">
              <Text selectable className="flex-1 bg-white border border-indigo-200 rounded-xl py-2 text-center text-sm font-black tracking-widest text-indigo-700">
                {household.code}
              </Text>
              <TouchableOpacity onPress={handleShareCode} className="w-10 h-10 rounded-xl bg-indigo-600 items-center justify-center ml-2">
                <Ionicons name="share-social" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <View className="flex-row flex-wrap mt-3">
              {members.map((m) => (
                <View key={m.id} className={`px-2 py-1 rounded-full border mr-1.5 mb-1.5 ${m.id === user?.id ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}>
                  <Text className={`text-[10px] font-bold ${m.id === user?.id ? 'text-white' : 'text-slate-700'}`}>
                    {m.id === user?.id ? `${m.name} (ti)` : m.name}
                  </Text>
                </View>
              ))}
            </View>
            <TouchableOpacity onPress={handleLeave} className="mt-2">
              <Text className="text-[11px] font-semibold text-slate-500">Largohu nga banesa</Text>
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
        <FlatList
          data={expenses}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ExpenseItem expense={item} onOptions={handleExpenseOptions} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 80 }}
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
                  <Text className="text-amber-800 text-xs ml-2 flex-1">{error}</Text>
                </View>
              )}
              {members.length === 1 && (
                <View className="mb-4 p-5 rounded-3xl bg-emerald-600">
                  <View className="flex-row items-center mb-1">
                    <Ionicons name="person-add" size={18} color="#fff" />
                    <Text className="text-white text-sm font-black ml-2">Fto shokët e banesës</Text>
                  </View>
                  <Text className="text-emerald-50 text-xs mb-3">
                    Je i vetëm në "{household.name}". Dërgoju shokëve këtë kod për t'u bashkuar.
                  </Text>
                  <View className="flex-row items-center">
                    <Text selectable className="flex-1 bg-emerald-500 border border-emerald-400 rounded-xl py-2.5 text-center text-base font-black tracking-widest text-white">
                      {household.code}
                    </Text>
                    <TouchableOpacity onPress={handleShareCode} className="ml-2 h-11 px-4 rounded-xl bg-white flex-row items-center">
                      <Ionicons name="share-social" size={16} color="#047857" />
                      <Text className="text-emerald-700 font-bold text-xs ml-1.5">Dërgo</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              <SummaryCard monthlyTotal={data?.summary?.currentMonth?.totalPaidOutOfPocket || 0} />
              <BalanceCard
                balance={data?.summary?.settlementBalance}
                settlements={data?.settlements || []}
                currentUserId={user?.id}
                householdId={household.id}
                onChanged={loadData}
              />
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-sm font-bold text-slate-800">Shpenzimet e Fundit</Text>
                <Text className="text-xs font-medium text-slate-400">{expenses.length} regjistrime</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View className="items-center py-10 bg-white rounded-2xl border border-slate-100">
              <Ionicons name="receipt-outline" size={32} color="#94a3b8" />
              <Text className="text-slate-700 font-semibold text-sm mt-2">Nuk ka shpenzime ende</Text>
              <Text className="text-slate-400 text-xs mt-1">Shtypni "+ Shto" për shpenzimin e parë.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
