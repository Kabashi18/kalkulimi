import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SummaryCard from '../components/SummaryCard';
import ExpenseItem from '../components/ExpenseItem';
import { expenseApi } from '../api/expenseApi';

export default function DashboardScreen({ onNavigateToAdd, currentUserId = 1 }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState(null);

  // Ngarkimi i të dhënave nga backend-i
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const res = await expenseApi.getSummary(currentUserId);
      setSummaryData(res.summary);
      setExpenses(res.expenses || []);
    } catch (err) {
      setError('Nuk mund të ngarkohen të dhënat. Kontrolloni serverin MySQL/Node.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row justify-between items-center bg-white border-b border-slate-100">
        <View>
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Menaxhimi i Shpenzimeve
          </Text>
          <Text className="text-xl font-bold text-slate-800">
            {summaryData ? `Përshëndetje, ${summaryData.user?.name || 'Artan'}` : 'Banesa Jonë'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onNavigateToAdd}
          className="bg-indigo-600 px-4 py-2 rounded-full flex-row items-center shadow-sm active:bg-indigo-700"
        >
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text className="text-white font-semibold text-sm ml-1">Shto</Text>
        </TouchableOpacity>
      </View>

      {/* Trupi Kryesor */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
          <Text className="text-slate-500 mt-3 text-sm">Duke ngarkuar shpenzimet...</Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <ExpenseItem expense={item} currentUserId={currentUserId} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 80 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366f1']} />
          }
          ListHeaderComponent={
            <View>
              {error && (
                <View className="p-3 mb-4 bg-amber-50 border border-amber-200 rounded-xl flex-row items-center">
                  <Ionicons name="warning-outline" size={20} color="#d97706" />
                  <Text className="text-amber-800 text-xs ml-2 flex-1">{error}</Text>
                </View>
              )}

              {/* Kartelat Përmbledhëse */}
              <SummaryCard
                monthlyTotal={summaryData?.currentMonth?.totalPaidOutOfPocket || 0}
                settlement={summaryData?.settlementBalance || {}}
              />

              {/* Titulli i Listës */}
              <View className="flex-row justify-between items-center mb-3 mt-2">
                <Text className="text-base font-bold text-slate-800">Shpenzimet e Fundit</Text>
                <Text className="text-xs font-semibold text-slate-400">
                  {expenses.length} regjistrime
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-12">
              <View className="w-16 h-16 bg-slate-100 rounded-full items-center justify-center mb-3">
                <Ionicons name="receipt-outline" size={32} color="#94a3b8" />
              </View>
              <Text className="text-slate-600 font-medium text-base">Nuk ka shpenzime ende</Text>
              <Text className="text-slate-400 text-xs text-center mt-1 px-8">
                Klikoni butonin "+ Shto" lart për të regjistruar shpenzimin tuaj të parë.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
