import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isPersonalExpense } from '../utils/balances';

const getCategoryDetails = (category = '') => {
  const cat = category.toLowerCase();
  if (cat.includes('rrym') || cat.includes('energji')) return { icon: 'flash', color: '#d97706', bg: 'bg-amber-50' };
  if (cat.includes('qira') || cat.includes('banes')) return { icon: 'home', color: '#4f46e5', bg: 'bg-indigo-50' };
  if (cat.includes('ushqim') || cat.includes('market')) return { icon: 'fast-food', color: '#059669', bg: 'bg-emerald-50' };
  if (cat.includes('internet') || cat.includes('tv')) return { icon: 'wifi', color: '#0284c7', bg: 'bg-sky-50' };
  if (cat.includes('uj')) return { icon: 'water', color: '#2563eb', bg: 'bg-blue-50' };
  if (cat.includes('pastrim')) return { icon: 'sparkles', color: '#db2777', bg: 'bg-pink-50' };
  return { icon: 'receipt-outline', color: '#475569', bg: 'bg-slate-50' };
};

// Shtypja e gjatë (ose ikona ⋮) hap opsionet Ndrysho / Fshij për paguesin ose regjistruesin
export default function ExpenseItem({ expense, onOptions }) {
  const { icon, color, bg } = getCategoryDetails(expense.category);
  const isShared = !isPersonalExpense(expense);
  const isPayer = expense.is_payer === 1;
  const formattedDate = expense.created_at
    ? new Date(expense.created_at).toLocaleDateString('sq-AL', { day: '2-digit', month: 'short' })
    : '';

  return (
    <TouchableOpacity
      activeOpacity={expense.can_edit ? 0.7 : 1}
      onLongPress={expense.can_edit ? () => onOptions?.(expense) : undefined}
      className="flex-row items-center p-3.5 mb-2.5 bg-white rounded-2xl border border-slate-100"
    >
      <View className={`w-11 h-11 rounded-2xl items-center justify-center mr-3 ${bg}`}>
        <Ionicons name={icon} size={20} color={color} />
      </View>

      <View className="flex-1 mr-2">
        <Text numberOfLines={1} className="text-sm font-semibold text-slate-800">{expense.title}</Text>
        <View className="flex-row items-center mt-1">
          <Text className="text-[10px] text-slate-400 mr-2">{formattedDate}</Text>
          <View className={`px-2 py-0.5 rounded-full border ${isShared ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-100 border-slate-200'}`}>
            <Text className={`text-[9px] font-bold ${isShared ? 'text-indigo-700' : 'text-slate-600'}`}>
              {isShared ? 'E përbashkët' : 'Personale'}
            </Text>
          </View>
        </View>
      </View>

      <View className="items-end">
        <Text className="text-sm font-black text-slate-900">{Number(expense.total_amount).toFixed(2)} €</Text>
        <Text className="text-[10px] text-slate-500 mt-0.5">{isPayer ? 'Paguar nga ti' : `Nga: ${expense.paid_by_name}`}</Text>
        {isShared && expense.my_split_amount > 0 && (
          <Text className="text-[10px] font-bold text-indigo-600">Pjesa jote: {Number(expense.my_split_amount).toFixed(2)} €</Text>
        )}
      </View>

      {expense.can_edit && (
        <TouchableOpacity onPress={() => onOptions?.(expense)} className="ml-1 p-1" hitSlop={8}>
          <Ionicons name="ellipsis-vertical" size={16} color="#94a3b8" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}
