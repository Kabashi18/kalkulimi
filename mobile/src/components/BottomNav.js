import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../lib/theme';

// Shiriti i poshtëm (stil Facebook, i njëjtë me web-in): Dashboard · "+" Shto (në mes, portokalli) · Cilësimet.
// Qëndron gjithmonë në fund të ekranit: vetëm përmbajtja sipër tij lëviz.
// Cepa të rrumbullakosura sipër, kornizë e hollë, hije e lehtë dhe vijë e vogël mbi tab-in aktiv.
function Tab({ active, icon, label, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-1 items-center justify-center h-16"
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      {/* Treguesi i tab-it aktiv (si te Facebook) */}
      {active && <View className="absolute top-0 h-[3px] w-10 rounded-b-full bg-indigo-600 dark:bg-indigo-400" />}
      <Ionicons name={active ? icon : `${icon}-outline`} size={24} color={active ? C.brand : C.muted} />
      <Text className={`text-xs font-semibold mt-0.5 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function BottomNav({ active, onNavigate, onAdd }) {
  return (
    <View
      className="flex-row items-end bg-white dark:bg-slate-900 rounded-t-3xl border-t border-x border-slate-200 dark:border-slate-800"
      // Hija mbetet e errët edhe në temën e errët (një hije e bardhë do të "ndriçonte")
      style={{ shadowColor: '#000000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 12 }}
      accessibilityRole="tablist"
    >
      <Tab active={active === 'home'} icon="home" label="Dashboard" onPress={() => onNavigate('home')} />

      {/* Butoni kryesor: ngrihet mbi shirit që të arrihet lehtë me gishtin e madh */}
      <View className="flex-1 items-center pb-2">
        <TouchableOpacity
          onPress={onAdd}
          className="w-14 h-14 rounded-full bg-orange-500 items-center justify-center border-4 border-white dark:border-slate-900"
          style={{ marginTop: -28, elevation: 8, shadowColor: '#f97316', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}
          accessibilityLabel="Shto shpenzim"
        >
          <Ionicons name="add" size={30} color={C.onBrand} />
        </TouchableOpacity>
        <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Shto</Text>
      </View>

      <Tab active={active === 'settings'} icon="settings" label="Cilësimet" onPress={() => onNavigate('settings')} />
    </View>
  );
}
