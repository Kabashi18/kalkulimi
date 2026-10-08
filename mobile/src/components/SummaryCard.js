import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatEuro, monthLabel } from '../utils/balances';

// Kartela e muajit: ◀ muaji ▶ + sa ke paguar nga xhepi (personale + të përbashkëta). Borxhet: BalanceCard.
export default function SummaryCard({ month, monthlyTotal = 0, isCurrentMonth = true, onPrev, onNext, onToday }) {
  return (
    <View className="bg-white rounded-3xl border border-slate-100 p-4 mb-4">
      <View className="flex-row items-center justify-between">
        <TouchableOpacity onPress={onPrev} className="w-9 h-9 rounded-full items-center justify-center" accessibilityLabel="Muaji i kaluar">
          <Ionicons name="chevron-back" size={20} color="#475569" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onToday} disabled={isCurrentMonth} className="items-center">
          <Text className="text-sm font-bold text-slate-900">{monthLabel(month)}</Text>
          {!isCurrentMonth && <Text className="text-xs font-semibold text-indigo-600">Kthehu te muaji aktual</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onNext}
          disabled={isCurrentMonth}
          className={`w-9 h-9 rounded-full items-center justify-center ${isCurrentMonth ? 'opacity-30' : ''}`}
          accessibilityLabel="Muaji tjetër"
        >
          <Ionicons name="chevron-forward" size={20} color="#475569" />
        </TouchableOpacity>
      </View>
      <View className="mt-3 pt-3 border-t border-slate-100 flex-row items-baseline justify-between">
        <Text className="text-sm text-slate-500">Paguar nga xhepi yt</Text>
        <Text className="text-2xl font-extrabold text-slate-900">{formatEuro(monthlyTotal)}</Text>
      </View>
      <Text className="text-xs text-slate-500 mt-0.5 text-right">personale + të përbashkëta që i pagove ti</Text>
    </View>
  );
}
