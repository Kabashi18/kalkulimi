import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { expenseApi } from '../api/expenseApi';
import { formatEuro } from '../utils/balances';

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

// Modali i konfirmimit të pagesës ("Laje borxhin")
function SettleModal({ row, onClose, onConfirm, loading, error }) {
  const [amount, setAmount] = useState(row.amount.toFixed(2));
  const iPay = row.type === 'user_owes';
  const numeric = parseFloat(String(amount).replace(',', '.')) || 0;
  const tooMuch = numeric > row.amount + 0.001;
  const disabled = loading || numeric <= 0 || tooMuch;

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl p-6 pb-10">
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-1 mr-3">
              <Text className="text-lg font-bold text-slate-900">{iPay ? 'Laje borxhin' : 'Shëno pagesën e marrë'}</Text>
              <Text className="text-sm text-slate-500 mt-0.5">
                {iPay ? `Konfirmo që ia ke kthyer paratë ${row.name}.` : `Konfirmo që ${row.name} t'i ka kthyer paratë.`}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center" accessibilityLabel="Mbyll">
              <Ionicons name="close" size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center justify-center py-3 mb-4 bg-slate-50 rounded-2xl">
            <Text className="text-sm font-semibold text-slate-900">{iPay ? 'Ti' : row.name}</Text>
            <Ionicons name="arrow-forward" size={16} color="#94a3b8" style={{ marginHorizontal: 10 }} />
            <Text className="text-sm font-semibold text-slate-900">{iPay ? row.name : 'Ty'}</Text>
          </View>

          <Text className="text-sm font-medium text-slate-700 mb-1.5">Shuma e paguar (€)</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xl font-bold text-slate-900"
          />
          <Text className={`text-xs mt-1.5 ${tooMuch ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
            {tooMuch ? `Shuma nuk mund të jetë më e madhe se borxhi (${formatEuro(row.amount)}).` : 'Mund të shënosh edhe pagesë të pjesshme.'}
          </Text>

          {error && <Text className="mt-3 p-3 bg-rose-50 text-rose-700 rounded-xl text-sm">{error}</Text>}

          <TouchableOpacity
            onPress={() => onConfirm(numeric)}
            disabled={disabled}
            className={`mt-5 bg-indigo-600 rounded-2xl py-3.5 items-center ${disabled ? 'opacity-50' : ''}`}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-sm">Konfirmo {formatEuro(numeric)}</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Kartela kryesore: bilanci neto + borxhet me secilin shok + "Laje borxhin"
export default function BalanceCard({ balance = {}, settlements = [], currentUserId, householdId, onChanged }) {
  const [activeRow, setActiveRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  const breakdown = balance.breakdown || [];
  const net = Number(balance.netAmount || 0);
  const settled = breakdown.length === 0;
  const recent = settlements.slice(0, 3);

  const headline = settled
    ? { text: 'Je i barazuar me të gjithë', color: 'text-slate-900' }
    : net > 0
      ? { text: 'Në total të kanë borxh', color: 'text-emerald-600' }
      : net < 0
        ? { text: 'Në total ke borxh', color: 'text-rose-600' }
        : { text: 'Borxhet anulojnë njëri-tjetrin', color: 'text-slate-900' };

  const handleConfirm = async (amount) => {
    const iPay = activeRow.type === 'user_owes';
    try {
      setSaving(true);
      setModalError(null);
      await expenseApi.settleUp({
        householdId,
        fromUser: iPay ? currentUserId : activeRow.userId,
        toUser: iPay ? activeRow.userId : currentUserId,
        amount
      });
      setActiveRow(null);
      onChanged?.();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUndo = (s) => {
    Alert.alert('Anulo pagesën', `Të anulohet pagesa prej ${formatEuro(s.amount)}?`, [
      { text: 'Jo', style: 'cancel' },
      {
        text: 'Po, anuloje',
        style: 'destructive',
        onPress: async () => {
          try {
            await expenseApi.deleteSettlement(s.id);
            onChanged?.();
          } catch (err) {
            Alert.alert('Gabim', err.message);
          }
        }
      }
    ]);
  };

  return (
    <View className="bg-white rounded-3xl border border-slate-100 p-5 mb-4">
      <Text className="text-sm text-slate-500">{headline.text}</Text>
      {settled ? (
        <Ionicons name="checkmark-circle" size={40} color="#10b981" style={{ marginTop: 2 }} />
      ) : (
        <Text className={`text-4xl font-extrabold mt-0.5 ${headline.color}`}>{formatEuro(Math.abs(net))}</Text>
      )}

      {!settled &&
        breakdown.map((row) => {
          const iOwe = row.type === 'user_owes';
          return (
            <View key={row.userId} className="flex-row items-center justify-between mt-4">
              <View className="flex-row items-center flex-1 mr-3">
                <View className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center mr-3">
                  <Text className="text-xs font-bold text-slate-700">{initials(row.name)}</Text>
                </View>
                <View className="flex-1">
                  <Text numberOfLines={1} className="text-sm font-semibold text-slate-900">{row.name}</Text>
                  <Text className={`text-xs ${iOwe ? 'text-rose-600' : 'text-emerald-600'}`}>{iOwe ? 'Ti i ke borxh' : 'Të ka borxh'}</Text>
                  <Text className={`text-base font-bold ${iOwe ? 'text-rose-600' : 'text-emerald-600'}`}>{formatEuro(row.amount)}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setModalError(null);
                  setActiveRow(row);
                }}
                className={`px-3 py-2.5 rounded-xl ${iOwe ? 'bg-indigo-600' : 'bg-white border border-slate-200'}`}
              >
                <Text className={`text-xs font-bold ${iOwe ? 'text-white' : 'text-slate-700'}`}>{iOwe ? 'Laje borxhin' : 'Shëno të marrë'}</Text>
              </TouchableOpacity>
            </View>
          );
        })}

      {recent.length > 0 && (
        <View className="mt-4 pt-3 border-t border-slate-100">
          <Text className="text-xs font-semibold text-slate-500 mb-2">Pagesat e fundit</Text>
          {recent.map((s) => (
            <View key={s.id} className="flex-row justify-between items-center mb-1.5">
              <Text numberOfLines={1} className="text-sm text-slate-600 flex-1 mr-2">
                {s.from_user === currentUserId ? 'Ti' : s.from_name.split(' ')[0]} → {s.to_user === currentUserId ? 'ty' : s.to_name.split(' ')[0]}
              </Text>
              <Text className="text-sm font-semibold text-slate-900">{formatEuro(s.amount)}</Text>
              {s.created_by === currentUserId && (
                <TouchableOpacity onPress={() => handleUndo(s)} className="ml-2 p-1" hitSlop={8} accessibilityLabel="Anulo pagesën">
                  <Ionicons name="arrow-undo" size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {activeRow && (
        <SettleModal row={activeRow} loading={saving} error={modalError} onClose={() => setActiveRow(null)} onConfirm={handleConfirm} />
      )}
    </View>
  );
}
