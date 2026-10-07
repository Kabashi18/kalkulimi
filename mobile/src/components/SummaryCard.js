import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Totali i shpenzuar nga xhepi këtë muaj (personale + të përbashkëta). Borxhet shfaqen te BalanceCard.
export default function SummaryCard({ monthlyTotal = 0, monthName = '', isCurrentMonth = true }) {
  return (
    <View className="bg-indigo-600 rounded-3xl p-5 mb-4">
      <View className="flex-row justify-between items-start">
        <View>
          <Text className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">
            {isCurrentMonth ? 'Totali i Shpenzuar këtë Muaj' : `Shpenzuar në ${monthName}`}
          </Text>
          <Text className="text-white text-3xl font-extrabold tracking-tight">{Number(monthlyTotal).toFixed(2)} €</Text>
        </View>
        <View className="w-12 h-12 bg-indigo-500 rounded-2xl items-center justify-center">
          <Ionicons name="wallet-outline" size={24} color="#ffffff" />
        </View>
      </View>
      <View className="flex-row items-center mt-3 pt-3 border-t border-indigo-500">
        <Ionicons name="calendar-outline" size={14} color="#c7d2fe" />
        <Text className="text-indigo-200 text-xs ml-1.5 font-medium">Personale + të përbashkëta, nga xhepi yt</Text>
      </View>
    </View>
  );
}
