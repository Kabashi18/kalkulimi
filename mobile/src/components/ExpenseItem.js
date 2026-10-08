import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { expenseEffectFor, formatEuro } from '../utils/balances';

const getCategoryDetails = (category = '') => {
  const cat = category.toLowerCase();
  if (cat.includes('rrym') || cat.includes('energji')) return { icon: 'flash', color: '#d97706', bg: 'bg-amber-50' };
  if (cat.includes('qira') || cat.includes('banes')) return { icon: 'home', color: '#4f46e5', bg: 'bg-indigo-50' };
  if (cat.includes('ushqim') || cat.includes('market')) return { icon: 'fast-food', color: '#059669', bg: 'bg-emerald-50' };
  if (cat.includes('internet') || cat.includes('tv')) return { icon: 'wifi', color: '#0284c7', bg: 'bg-sky-50' };
  if (cat.includes('uj')) return { icon: 'water', color: '#2563eb', bg: 'bg-blue-50' };
  if (cat.includes('pastrim')) return { icon: 'sparkles', color: '#db2777', bg: 'bg-pink-50' };
  return { icon: 'receipt-outline', color: '#475569', bg: 'bg-slate-100' };
};

// Në të djathtë shfaqet efekti mbi TY (si te Splitwise), jo vetëm totali
const EFFECT = {
  lent: { label: 'ti dhe hua', label2: 'text-emerald-600', amount: 'text-emerald-600' },
  borrowed: { label: 'ti more hua', label2: 'text-rose-600', amount: 'text-rose-600' },
  personal: { label: 'personale', label2: 'text-slate-500', amount: 'text-slate-700' },
  none: { label: 'nuk të përfshin', label2: 'text-slate-400', amount: 'text-slate-400' }
};

// Shtypja e gjatë (ose ikona ⋮) hap opsionet Ndrysho / Fshij për paguesin ose regjistruesin
export default function ExpenseItem({ expense, currentUserId, onOptions }) {
  const { icon, color, bg } = getCategoryDetails(expense.category);
  const isPayer = expense.is_payer === 1;
  const effect = expenseEffectFor(currentUserId, expense);
  const style = EFFECT[effect.type];
  const isPersonal = effect.type === 'personal';
  const customSplit = !isPersonal && expense.split_mode && expense.split_mode !== 'equal';
  const payer = isPayer ? 'Ti pagove' : `${(expense.paid_by_name || 'Shoku').split(' ')[0]} pagoi`;

  return (
    <TouchableOpacity
      activeOpacity={expense.can_edit ? 0.7 : 1}
      onLongPress={expense.can_edit ? () => onOptions?.(expense) : undefined}
      className="flex-row items-center px-3.5 py-3"
    >
      <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${bg}`}>
        <Ionicons name={icon} size={20} color={color} />
      </View>

      <View className="flex-1 mr-2">
        <Text numberOfLines={1} className="text-sm font-semibold text-slate-900">{expense.title}</Text>
        <View className="flex-row items-center">
          <Ionicons name={isPersonal ? 'lock-closed-outline' : 'people-outline'} size={12} color="#64748b" />
          <Text numberOfLines={1} className="text-xs text-slate-500 ml-1 flex-1">
            {payer} {formatEuro(expense.total_amount)}
            {customSplit ? (expense.split_mode === 'percent' ? ' · me %' : ' · shuma të ndryshme') : ''}
          </Text>
        </View>
      </View>

      <View className="items-end">
        <Text className={`text-xs ${style.label2}`}>{style.label}</Text>
        {effect.type !== 'none' && <Text className={`text-sm font-bold ${style.amount}`}>{formatEuro(effect.amount)}</Text>}
      </View>

      {expense.can_edit ? (
        <TouchableOpacity onPress={() => onOptions?.(expense)} className="ml-1 p-1.5" hitSlop={8} accessibilityLabel="Opsionet e shpenzimit">
          <Ionicons name="ellipsis-vertical" size={16} color="#94a3b8" />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 30 }} />
      )}
    </TouchableOpacity>
  );
}
