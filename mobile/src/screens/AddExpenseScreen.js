import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { expenseApi } from '../api/expenseApi';

const CATEGORIES = [
  { id: 'Rrymë', name: 'Rrymë', icon: 'flash', color: '#f59e0b' },
  { id: 'Qira', name: 'Qira', icon: 'home', color: '#6366f1' },
  { id: 'Ushqim', name: 'Ushqim', icon: 'fast-food', color: '#10b981' },
  { id: 'Internet', name: 'Internet / TV', icon: 'wifi', color: '#0ea5e9' },
  { id: 'Ujë', name: 'Ujë', icon: 'water', color: '#3b82f6' },
  { id: 'Të tjera', name: 'Të tjera', icon: 'receipt-outline', color: '#64748b' },
];

export default function AddExpenseScreen({ onBack, onExpenseAdded, currentUserId = 1 }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Rrymë');
  const [isShared, setIsShared] = useState(true);
  const [memberCount, setMemberCount] = useState(3); // Numri i anëtarëve në grup
  const [loading, setLoading] = useState(false);

  // Llogaritja dinamike për person
  const numericAmount = parseFloat(amount) || 0;
  const splitPerPerson = isShared && memberCount > 0 ? (numericAmount / memberCount).toFixed(2) : numericAmount.toFixed(2);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Vërejtje', 'Ju lutem shkruani një titull për shpenzimin.');
      return;
    }

    if (!amount || numericAmount <= 0) {
      Alert.alert('Vërejtje', 'Ju lutem vendosni një shumë të vlefshme në euro.');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        title: title.trim(),
        total_amount: numericAmount,
        category: category,
        paid_by_user_id: currentUserId,
        group_id: isShared ? 1 : null, // 1 është ID e grupit të banesës
      };

      const result = await expenseApi.createExpense(payload);

      Alert.alert('Sukses', result.message || 'Shpenzimi u ruajt me sukses!', [
        {
          text: 'Në rregull',
          onPress: () => {
            if (onExpenseAdded) onExpenseAdded();
            if (onBack) onBack();
          },
        },
      ]);
    } catch (err) {
      Alert.alert('Gabim', err.message || 'Dështoi regjistrimi i shpenzimit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-3 flex-row items-center bg-white border-b border-slate-100">
          <TouchableOpacity
            onPress={onBack}
            className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mr-3"
          >
            <Ionicons name="arrow-back" size={20} color="#334155" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-800">Shto Shpenzim të Ri</Text>
        </View>

        <ScrollView className="flex-1 px-5 pt-5" showsVerticalScrollIndicator={false}>
          {/* 1. Titulli */}
          <View className="mb-4">
            <Text className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Përshkrimi i Shpenzimit
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="psh. Fatura e Rrymës, Blerje Ushqimore..."
              placeholderTextColor="#94a3b8"
              className="bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-base text-slate-800 shadow-sm"
            />
          </View>

          {/* 2. Shuma në Euro */}
          <View className="mb-4">
            <Text className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Shuma në Euro (€)
            </Text>
            <View className="flex-row items-center bg-white border border-slate-200 rounded-2xl px-4 shadow-sm">
              <Text className="text-xl font-bold text-slate-400 mr-2">€</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
                className="flex-1 py-3.5 text-2xl font-bold text-slate-900"
              />
            </View>
          </View>

          {/* 3. Kategoria */}
          <View className="mb-5">
            <Text className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Kategoria
            </Text>
            <View className="flex-row flex-wrap justify-between">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setCategory(cat.id)}
                    className={`w-[48%] flex-row items-center p-3 mb-2.5 rounded-2xl border ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-500 shadow-sm'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <View
                      className="w-8 h-8 rounded-xl items-center justify-center mr-2.5"
                      style={{ backgroundColor: `${cat.color}15` }}
                    >
                      <Ionicons name={cat.icon} size={18} color={cat.color} />
                    </View>
                    <Text
                      className={`text-sm font-semibold ${
                        isSelected ? 'text-indigo-900' : 'text-slate-700'
                      }`}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 4. Switch: Personal apo me Banesën */}
          <View className="bg-white border border-slate-200 rounded-3xl p-5 mb-5 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <Text className="text-base font-bold text-slate-800">
                  {isShared ? 'Shpenzim i Përbashkët' : 'Shpenzim Personal'}
                </Text>
                <Text className="text-xs text-slate-500 mt-0.5">
                  {isShared
                    ? 'Fatura do të ndahet në mënyrë të barabartë mes anëtarëve'
                    : 'Regjistrohet vetëm për llogarinë tënde'}
                </Text>
              </View>
              <Switch
                value={isShared}
                onValueChange={setIsShared}
                trackColor={{ false: '#cbd5e1', true: '#6366f1' }}
                thumbColor="#ffffff"
              />
            </View>

            {/* 5. Zgjedhja e personave nëse është i përbashkët */}
            {isShared && (
              <View className="mt-4 pt-4 border-t border-slate-100">
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Numri i personave në ndarje:
                  </Text>
                  <Text className="text-sm font-bold text-indigo-600">{memberCount} persona</Text>
                </View>

                {/* Butona për zgjedhjen e shpejtë të numrit */}
                <View className="flex-row justify-between mb-3">
                  {[2, 3, 4, 5].map((count) => (
                    <TouchableOpacity
                      key={count}
                      onPress={() => setMemberCount(count)}
                      className={`flex-1 mx-1 py-2 rounded-xl items-center border ${
                        memberCount === count
                          ? 'bg-indigo-600 border-indigo-600'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          memberCount === count ? 'text-white' : 'text-slate-600'
                        }`}
                      >
                        {count} vetë
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Kartela e përllogaritjes paraprake (Preview) */}
                <View className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons name="people-outline" size={18} color="#4f46e5" />
                    <Text className="text-xs font-semibold text-indigo-900 ml-2">
                      Secili paguan:
                    </Text>
                  </View>
                  <Text className="text-base font-extrabold text-indigo-700">
                    {splitPerPerson} €
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* 6. Butoni "Ruaj Shpenzimin" */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            className={`py-4 rounded-2xl items-center justify-center mb-10 shadow-md ${
              loading ? 'bg-indigo-400' : 'bg-indigo-600 active:bg-indigo-700'
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View className="flex-row items-center">
                <Ionicons name="checkmark-sharp" size={20} color="#ffffff" />
                <Text className="text-white text-base font-bold ml-2">Ruaj Shpenzimin</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
