import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { expenseApi } from '../api/expenseApi';

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

// Modali i konfirmimit të pagesës ("Laje Borxhin")
function SettleModal({ row, onClose, onConfirm, loading, error }) {
  const [amount, setAmount] = useState(row.amount.toFixed(2));
  const iPay = row.type === 'user_owes';
  const numeric = parseFloat(String(amount).replace(',', '.')) || 0;
  const tooMuch = numeric > row.amount + 0.001;

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl p-6 pb-10">
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-1 mr-3">
              <Text className="text-lg font-black text-slate-800">{iPay ? 'Laje Borxhin' : 'Shëno Pagesën e Marrë'}</Text>
              <Text className="text-xs text-slate-500 mt-0.5">
                {iPay ? `Konfirmo që ia ke kthyer paratë ${row.name}.` : `Konfirmo që ${row.name} t'i ka kthyer paratë.`}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center">
              <Ionicons name="close" size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center justify-center py-3 mb-4 bg-slate-50 rounded-2xl border border-slate-100">
            <Text className="text-xs font-bold text-rose-600">{iPay ? 'Ti' : row.name}</Text>
            <Ionicons name="arrow-forward" size={16} color="#94a3b8" style={{ marginHorizontal: 10 }} />
            <Text className="text-xs font-bold text-emerald-600">{iPay ? row.name : 'Ty'}</Text>
          </View>

          <Text className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Shuma e paguar (€)</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xl font-bold text-slate-900"
          />
          <Text className={`text-[11px] mt-1.5 ${tooMuch ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
            {tooMuch ? `Shuma nuk mund të jetë më e madhe se borxhi (${row.amount.toFixed(2)} €).` : 'Mund të shënosh edhe pagesë të pjesshme.'}
          </Text>

          {error && <Text className="mt-3 p-3 bg-rose-50 text-rose-700 rounded-xl text-xs">{error}</Text>}

          <TouchableOpacity
            onPress={() => onConfirm(numeric)}
            disabled={loading || numeric <= 0 || tooMuch}
            className={`mt-5 bg-emerald-600 rounded-2xl py-3.5 items-center ${loading || numeric <= 0 || tooMuch ? 'opacity-50' : ''}`}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-sm">Konfirmo {numeric.toFixed(2)} €</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function BalanceCard({ balance = {}, settlements = [], currentUserId, householdId, onChanged }) {
  const [activeRow, setActiveRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  const breakdown = balance.breakdown || [];
  const net = Number(balance.netAmount || 0);
  const recent = settlements.slice(0, 3);

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
    Alert.alert('Anulo pagesën', `Të anulohet pagesa prej ${s.amount.toFixed(2)} €?`, [
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
    <View className="bg-white rounded-3xl border border-slate-200 p-5 mb-5">
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-1">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-700">Kush i ka borxh kujt</Text>
          <Text className="text-[11px] text-slate-400 mt-0.5">Përditësohet në kohë reale</Text>
        </View>
        <View className="items-end">
          <Text className={`text-lg font-black ${net > 0 ? 'text-emerald-600' : net < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
            {net > 0 ? '+' : net < 0 ? '−' : ''}{Math.abs(net).toFixed(2)} €
          </Text>
          <Text className="text-[10px] font-semibold text-slate-400 uppercase">Bilanci neto</Text>
        </View>
      </View>

      {breakdown.length === 0 ? (
        <View className="py-5 items-center bg-slate-50 rounded-2xl border border-slate-100">
          <Ionicons name="checkmark-circle" size={28} color="#10b981" />
          <Text className="text-sm font-bold text-slate-700 mt-1">Jeni të barazuar me të gjithë!</Text>
        </View>
      ) : (
        breakdown.map((row) => {
          const iOwe = row.type === 'user_owes';
          return (
            <View
              key={row.userId}
              className={`flex-row items-center justify-between p-3 rounded-2xl border mb-2 ${iOwe ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className={`w-9 h-9 rounded-full items-center justify-center mr-2.5 ${iOwe ? 'bg-rose-100' : 'bg-emerald-100'}`}>
                  <Text className={`text-xs font-black ${iOwe ? 'text-rose-700' : 'text-emerald-700'}`}>{initials(row.name)}</Text>
                </View>
                <View className="flex-1">
                  <Text numberOfLines={1} className={`text-xs ${iOwe ? 'text-rose-900' : 'text-emerald-900'}`}>
                    {iOwe ? 'Ti i ke borxh ' : ''}
                    <Text className="font-bold">{row.name}</Text>
                    {iOwe ? '' : ' të ka borxh'}
                  </Text>
                  <Text className={`text-base font-black ${iOwe ? 'text-rose-600' : 'text-emerald-600'}`}>{row.amount.toFixed(2)} €</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setModalError(null);
                  setActiveRow(row);
                }}
                className={`px-3 py-2 rounded-xl ${iOwe ? 'bg-rose-600' : 'bg-white border border-emerald-300'}`}
              >
                <Text className={`text-[11px] font-bold ${iOwe ? 'text-white' : 'text-emerald-700'}`}>
                  {iOwe ? 'Laje Borxhin' : 'Shëno të marrë'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}

      {recent.length > 0 && (
        <View className="mt-3 pt-3 border-t border-slate-100">
          <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Pagesat e fundit</Text>
          {recent.map((s) => (
            <View key={s.id} className="flex-row justify-between items-center mb-1.5">
              <Text numberOfLines={1} className="text-[11px] text-slate-600 flex-1 mr-2">
                <Text className="font-bold text-slate-800">{s.from_user === currentUserId ? 'Ti' : s.from_name}</Text>
                {' → '}
                <Text className="font-bold text-slate-800">{s.to_user === currentUserId ? 'ty' : s.to_name}</Text>
              </Text>
              <Text className="text-[11px] font-bold text-slate-800">{s.amount.toFixed(2)} €</Text>
              {s.created_by === currentUserId && (
                <TouchableOpacity onPress={() => handleUndo(s)} className="ml-2">
                  <Ionicons name="arrow-undo" size={14} color="#94a3b8" />
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
