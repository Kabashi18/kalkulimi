import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SummaryCard({ monthlyTotal = 0, settlement = {} }) {
  const netBalance = settlement.netBalance || 0;
  const isOwed = netBalance > 0;
  const owes = netBalance < 0;
  const isSettled = netBalance === 0;

  // Caktimi i ngjyrave dhe mesazheve për Barazimin e Banesës
  let balanceBg = 'bg-emerald-50 border-emerald-200';
  let balanceTextColor = 'text-emerald-700';
  let balanceAmountColor = 'text-emerald-600';
  let balanceIcon = 'arrow-down-circle';
  let balanceIconColor = '#059669';
  let balanceTitle = 'Të tjerët të detyrohen';

  if (owes) {
    balanceBg = 'bg-rose-50 border-rose-200';
    balanceTextColor = 'text-rose-700';
    balanceAmountColor = 'text-rose-600';
    balanceIcon = 'arrow-up-circle';
    balanceIconColor = '#e11d48';
    balanceTitle = 'I detyrohesh banesës';
  } else if (isSettled) {
    balanceBg = 'bg-slate-50 border-slate-200';
    balanceTextColor = 'text-slate-700';
    balanceAmountColor = 'text-slate-600';
    balanceIcon = 'checkmark-circle';
    balanceIconColor = '#475569';
    balanceTitle = 'Llogari të barazuara';
  }

  return (
    <View className="mb-5">
      {/* 1. Kartela: Totali i Shpenzuar këtë Muaj */}
      <View className="bg-indigo-600 rounded-3xl p-5 shadow-lg mb-3">
        <View className="flex-row justify-between items-start">
          <View>
            <Text className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">
              Shpenzimet e këtij Muaji
            </Text>
            <Text className="text-white text-3xl font-extrabold tracking-tight">
              {Number(monthlyTotal).toFixed(2)} €
            </Text>
          </View>
          <View className="w-12 h-12 bg-indigo-500/60 rounded-2xl items-center justify-center">
            <Ionicons name="wallet-outline" size={24} color="#ffffff" />
          </View>
        </View>

        <View className="flex-row items-center mt-3 pt-3 border-t border-indigo-500/50">
          <Ionicons name="calendar-outline" size={14} color="#c7d2fe" />
          <Text className="text-indigo-200 text-xs ml-1.5 font-medium">
            Muaji aktual (përfshirë faturat e paguara)
          </Text>
        </View>
      </View>

      {/* 2. Kartela: Barazimi i Banesës (Detyrimi / Krediti) */}
      <View className={`rounded-3xl p-5 border ${balanceBg} shadow-sm`}>
        <View className="flex-row justify-between items-center">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center mb-1">
              <Ionicons name={balanceIcon} size={18} color={balanceIconColor} />
              <Text className={`text-xs font-bold uppercase tracking-wider ml-1.5 ${balanceTextColor}`}>
                Barazimi i Banesës
              </Text>
            </View>

            <Text className={`text-2xl font-black ${balanceAmountColor}`}>
              {Math.abs(netBalance).toFixed(2)} €
            </Text>

            <Text className={`text-xs mt-1 font-medium ${balanceTextColor}`}>
              {settlement.message || (isSettled ? '0.00 € - Gjithçka është në rregull' : balanceTitle)}
            </Text>
          </View>

          <View
            className={`w-12 h-12 rounded-2xl items-center justify-center ${
              isOwed ? 'bg-emerald-100' : owes ? 'bg-rose-100' : 'bg-slate-200'
            }`}
          >
            <Ionicons
              name={isOwed ? 'trending-up' : owes ? 'trending-down' : 'scale-outline'}
              size={24}
              color={balanceIconColor}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
