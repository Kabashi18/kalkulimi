import React from 'react';
import { View, Text, TouchableOpacity, Modal, Switch, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../lib/theme';

// Menuja e profilit si fletë nga poshtë. Alert.alert në Android shfaq vetëm 3 butona,
// ndaj opsionet (tema, njoftimet, dalja) janë këtu.

const Row = ({ icon, label, onPress, danger = false, children }) => (
  <TouchableOpacity onPress={onPress} className="flex-row items-center justify-between px-5 py-3.5" accessibilityRole="button">
    <View className="flex-row items-center">
      <Ionicons name={icon} size={20} color={danger ? C.danger : C.icon} />
      <Text className={`ml-3 text-base ${danger ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}>{label}</Text>
    </View>
    {children}
  </TouchableOpacity>
);

export default function ProfileMenu({
  visible,
  onClose,
  user,
  darkMode,
  onToggleDark,
  pushEnabled,
  pushBusy,
  onTogglePush,
  onOpenHousehold,
  onLogout
}) {
  const toggleStyle = { trackColor: { false: C.placeholderSoft, true: C.brand }, thumbColor: '#ffffff' };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={onClose}>
        {/* Pressable i brendshëm: klikimi brenda fletës nuk e mbyll menunë */}
        <Pressable className="bg-white dark:bg-slate-900 rounded-t-3xl pt-2 pb-8">
          <View className="items-center py-2">
            <View className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
          </View>
          <View className="px-5 pb-3 mb-1 border-b border-slate-100 dark:border-slate-800">
            <Text numberOfLines={1} className="text-base font-bold text-slate-900 dark:text-slate-100">{user?.name || 'Profili'}</Text>
            <Text numberOfLines={1} className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</Text>
          </View>

          <Row icon="person-add-outline" label="Banesa & ftesa" onPress={onOpenHousehold} />
          <Row icon="moon-outline" label="Tema e errët" onPress={() => onToggleDark(!darkMode)}>
            <Switch value={darkMode} onValueChange={onToggleDark} {...toggleStyle} />
          </Row>
          <Row icon="notifications-outline" label="Njoftimet push" onPress={pushBusy ? undefined : onTogglePush}>
            {pushBusy ? (
              <ActivityIndicator color={C.brand} />
            ) : (
              <Switch value={pushEnabled} onValueChange={onTogglePush} {...toggleStyle} />
            )}
          </Row>
          <Row icon="log-out-outline" label="Dil nga llogaria" onPress={onLogout} danger />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
