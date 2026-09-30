import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Funksion ndihmës për të caktuar ikonën dhe ngjyrën sipas kategorisë
const getCategoryDetails = (category = '') => {
  const cat = category.toLowerCase();

  if (cat.includes('rrym') || cat.includes('energji') || cat.includes('drita')) {
    return { icon: 'flash', color: '#f59e0b', bg: 'bg-amber-100', border: 'border-amber-200' };
  }
  if (cat.includes('qira') || cat.includes('banes')) {
    return { icon: 'home', color: '#6366f1', bg: 'bg-indigo-100', border: 'border-indigo-200' };
  }
  if (cat.includes('ushqim') || cat.includes('market') || cat.includes('dreka') || cat.includes('kafe')) {
    return { icon: 'fast-food', color: '#10b981', bg: 'bg-emerald-100', border: 'border-emerald-200' };
  }
  if (cat.includes('internet') || cat.includes('wifi') || cat.includes('tv')) {
    return { icon: 'wifi', color: '#0ea5e9', bg: 'bg-sky-100', border: 'border-sky-200' };
  }
  if (cat.includes('uj') || cat.includes('ujësjellës')) {
    return { icon: 'water', color: '#3b82f6', bg: 'bg-blue-100', border: 'border-blue-200' };
  }
  if (cat.includes('pastrim') || cat.includes('mirmbajtje')) {
    return { icon: 'sparkles', color: '#ec4899', bg: 'bg-pink-100', border: 'border-pink-200' };
  }

  return { icon: 'receipt-outline', color: '#64748b', bg: 'bg-slate-100', border: 'border-slate-200' };
};

export default function ExpenseItem({ expense, currentUserId = 1 }) {
  const { icon, color, bg, border } = getCategoryDetails(expense.category);
  const isPayer = expense.paid_by_user_id === currentUserId || expense.is_payer === 1;
  const isShared = expense.group_id !== null;

  // Formatimi i datës
  const formattedDate = expense.created_at
    ? new Date(expense.created_at).toLocaleDateString('sq-AL', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <View className="flex-row items-center justify-between p-4 mb-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
      {/* Pjesa e majtë: Ikona & Detajet */}
      <View className="flex-row items-center flex-1 mr-3">
        <View className={`w-12 h-12 rounded-xl items-center justify-center mr-3 border ${bg} ${border}`}>
          <Ionicons name={icon} size={22} color={color} />
        </View>

        <View className="flex-1">
          <Text className="text-base font-semibold text-slate-800" numberOfLines={1}>
            {expense.title}
          </Text>
          <View className="flex-row items-center mt-1 flex-wrap">
            <Text className="text-xs text-slate-400 mr-2">{formattedDate}</Text>
            {isShared ? (
              <View className="bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
                <Text className="text-[10px] font-medium text-purple-700">Ndarë në Banesë</Text>
              </View>
            ) : (
              <View className="bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                <Text className="text-[10px] font-medium text-slate-600">Personal</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Pjesa e djathtë: Shuma dhe statusi */}
      <View className="items-end">
        <Text className="text-base font-bold text-slate-900">
          {Number(expense.total_amount).toFixed(2)} €
        </Text>
        <Text className="text-xs text-slate-500 mt-0.5">
          {isPayer ? 'Paguar nga ti' : `Nga: ${expense.paid_by_name || 'Shoku'}`}
        </Text>
        {isShared && expense.my_split_amount && (
          <Text className="text-[11px] font-semibold text-indigo-600 mt-0.5">
            Pjesa jote: {Number(expense.my_split_amount).toFixed(2)} €
          </Text>
        )}
      </View>
    </View>
  );
}
