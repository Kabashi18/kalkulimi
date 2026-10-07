import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { expenseApi } from '../api/expenseApi';
import { householdApi } from '../api/householdApi';
import { isPersonalExpense, expenseDateOf, todayISO, computeSplitAmounts, formatDateSq } from '../utils/balances';

const CATEGORIES = [
  { id: 'Rrymë', name: 'Rrymë', icon: 'flash', color: '#d97706' },
  { id: 'Banesë', name: 'Banesë / Qira', icon: 'home', color: '#4f46e5' },
  { id: 'Ushqim', name: 'Ushqim', icon: 'fast-food', color: '#059669' },
  { id: 'Internet', name: 'Internet / TV', icon: 'wifi', color: '#0284c7' },
  { id: 'Ujë', name: 'Ujë', icon: 'water', color: '#2563eb' },
  { id: 'Pastrim', name: 'Pastrim', icon: 'sparkles', color: '#db2777' },
  { id: 'Të tjera', name: 'Të tjera', icon: 'receipt-outline', color: '#475569' }
];

// Zgjedhës i thjeshtë datash pa varësi native: ◀ data ▶ + "Sot" / "Dje"
const shiftDays = (iso, days) => {
  const d = expenseDateOf({ expense_date: iso });
  d.setDate(d.getDate() + days);
  return todayISO(d);
};
const formatDay = (iso) => formatDateSq(expenseDateOf({ expense_date: iso }), { weekday: true });

const Label = ({ children }) => (
  <Text className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{children}</Text>
);

const Chip = ({ active, onPress, children, activeClass = 'bg-indigo-600 border-indigo-600' }) => (
  <TouchableOpacity onPress={onPress} className={`px-3 py-2 rounded-xl border mr-2 mb-2 ${active ? activeClass : 'bg-white border-indigo-100'}`}>
    <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-500'}`}>{children}</Text>
  </TouchableOpacity>
);

export default function AddExpenseScreen({ currentUserId, household, expenseToEdit = null, onBack, onSaved }) {
  const isEditing = !!expenseToEdit;
  const [title, setTitle] = useState(expenseToEdit?.title || '');
  const [amount, setAmount] = useState(expenseToEdit ? String(expenseToEdit.total_amount) : '');
  const [category, setCategory] = useState(expenseToEdit?.category || 'Rrymë');
  const [isShared, setIsShared] = useState(expenseToEdit ? !isPersonalExpense(expenseToEdit) : true);
  const [paidBy, setPaidBy] = useState(expenseToEdit?.paid_by_user_id || currentUserId);
  const [expenseDate, setExpenseDate] = useState(expenseToEdit?.expense_date || todayISO());
  const today = todayISO();
  // Mënyra e ndarjes: 'equal' | 'exact' (shuma në €) | 'percent' (përqindje)
  const [splitMode, setSplitMode] = useState(expenseToEdit?.split_mode || 'equal');
  const [splitValues, setSplitValues] = useState(() => {
    if (!expenseToEdit || !expenseToEdit.split_mode || expenseToEdit.split_mode === 'equal') return {};
    const total = Number(expenseToEdit.total_amount) || 1;
    return Object.fromEntries(
      (expenseToEdit.splits || []).map((sp) => [
        sp.user_id,
        expenseToEdit.split_mode === 'percent' ? String(Math.round((sp.amount_owed / total) * 10000) / 100) : String(sp.amount_owed)
      ])
    );
  });
  const [members, setMembers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(expenseToEdit?.member_ids?.length ? expenseToEdit.member_ids : null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    householdApi
      .getMembers(household.id)
      .then((list) => {
        setMembers(list);
        setSelectedIds((prev) => prev ?? list.map((m) => m.id));
      })
      .catch((err) => setErrorMsg(err.message));
  }, [household.id]);

  const selected = selectedIds || [];
  // Rendi i anëtarëve në ndarje ndjek listën e banesës
  const orderedSelected = members.length ? members.filter((m) => selected.includes(m.id)).map((m) => m.id) : selected;
  const numericAmount = parseFloat(String(amount).replace(',', '.')) || 0;
  const perPerson = isShared && selected.length > 0 ? numericAmount / selected.length : numericAmount;
  const parsedValues = Object.fromEntries(Object.entries(splitValues).map(([k, v]) => [k, String(v).replace(',', '.')]));
  const split = computeSplitAmounts(numericAmount, orderedSelected, splitMode, parsedValues);

  // Kur zgjidhet "Shuma" ose "%", fushat plotësohen me ndarjen e barabartë si pikënisje
  const changeSplitMode = (mode) => {
    setSplitMode(mode);
    if (mode === 'equal' || orderedSelected.length === 0) return;
    const n = orderedSelected.length;
    if (mode === 'exact') {
      const eq = computeSplitAmounts(numericAmount, orderedSelected, 'equal').amounts;
      setSplitValues(Object.fromEntries(orderedSelected.map((id, i) => [id, eq[i].toFixed(2)])));
    } else {
      const base = Math.floor(10000 / n) / 100;
      setSplitValues(
        Object.fromEntries(orderedSelected.map((id, i) => [id, String(i === n - 1 ? Math.round((100 - base * (n - 1)) * 100) / 100 : base)]))
      );
    }
  };
  const shortName = (m) => (m.id === currentUserId ? 'Unë' : m.name.split(' ')[0]);

  const toggleMember = (id) =>
    setSelectedIds((prev) => ((prev || []).includes(id) ? prev.filter((x) => x !== id) : [...(prev || []), id]));

  const handleSave = async () => {
    setErrorMsg(null);
    if (isShared && splitMode !== 'equal' && split.error) {
      setErrorMsg(split.error);
      return;
    }
    const payload = {
      title,
      total_amount: numericAmount,
      category,
      isPersonal: !isShared,
      member_ids: isShared ? orderedSelected : [],
      split_mode: isShared ? splitMode : 'equal',
      split_amounts: isShared && splitMode !== 'equal' ? split.amounts : null,
      paid_by: isShared ? paidBy : currentUserId,
      expense_date: expenseDate
    };
    try {
      setLoading(true);
      if (isEditing) await expenseApi.updateExpense(expenseToEdit.id, payload);
      else await expenseApi.createExpense(payload);
      onSaved();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="px-5 pt-4 pb-3 flex-row items-center bg-white border-b border-slate-100">
          <TouchableOpacity onPress={onBack} className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center mr-3">
            <Ionicons name="arrow-back" size={20} color="#334155" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-slate-800">{isEditing ? 'Ndrysho Shpenzimin' : 'Shto Shpenzim të Ri'}</Text>
        </View>

        <ScrollView className="flex-1 px-5 pt-5" keyboardShouldPersistTaps="handled">
          {errorMsg && (
            <View className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-2xl">
              <Text className="text-xs font-medium text-rose-700">{errorMsg}</Text>
            </View>
          )}

          {/* 1. Lloji */}
          <Label>Lloji i Shpenzimit</Label>
          <View className="flex-row bg-slate-200 rounded-2xl p-1 mb-1">
            {[
              { shared: true, label: 'E përbashkët', icon: 'people' },
              { shared: false, label: 'Individuale', icon: 'person' }
            ].map((opt) => (
              <TouchableOpacity
                key={opt.label}
                onPress={() => setIsShared(opt.shared)}
                className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${isShared === opt.shared ? 'bg-white' : ''}`}
              >
                <Ionicons name={opt.icon} size={16} color={isShared === opt.shared ? '#4338ca' : '#475569'} />
                <Text className={`text-xs font-bold ml-1.5 ${isShared === opt.shared ? 'text-indigo-700' : 'text-slate-600'}`}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text className="text-[11px] text-slate-500 mb-4 px-1">
            {isShared ? 'Ndahet barabartë dhe llogaritet në borxhet e banesës.' : 'Vetëm për ty: nuk ndikon te borxhet e banorëve.'}
          </Text>

          {/* 2. Titulli */}
          <Label>Përshkrimi</Label>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={isShared ? 'psh. Fatura e Rrymës, Qiraja...' : 'psh. Kafe, Drekë...'}
            placeholderTextColor="#94a3b8"
            className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 mb-4"
          />

          {/* 3. Shuma */}
          <Label>Shuma Totale (€)</Label>
          <View className="flex-row items-center bg-white border border-slate-200 rounded-2xl px-4 mb-4">
            <Text className="text-xl font-bold text-slate-400 mr-2">€</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
              className="flex-1 py-3 text-2xl font-bold text-slate-900"
            />
          </View>

          {/* 3b. Data */}
          <Label>Data e Shpenzimit</Label>
          <View className="flex-row items-center bg-white border border-slate-200 rounded-2xl px-2 py-2 mb-2">
            <TouchableOpacity onPress={() => setExpenseDate(shiftDays(expenseDate, -1))} className="w-9 h-9 rounded-xl bg-slate-100 items-center justify-center">
              <Ionicons name="chevron-back" size={18} color="#334155" />
            </TouchableOpacity>
            <Text className="flex-1 text-center text-sm font-semibold text-slate-800">{formatDay(expenseDate)}</Text>
            <TouchableOpacity
              onPress={() => setExpenseDate(shiftDays(expenseDate, 1))}
              disabled={expenseDate >= today}
              className={`w-9 h-9 rounded-xl bg-slate-100 items-center justify-center ${expenseDate >= today ? 'opacity-30' : ''}`}
            >
              <Ionicons name="chevron-forward" size={18} color="#334155" />
            </TouchableOpacity>
          </View>
          <View className="flex-row mb-4">
            <Chip active={expenseDate === today} onPress={() => setExpenseDate(today)}>Sot</Chip>
            <Chip active={expenseDate === shiftDays(today, -1)} onPress={() => setExpenseDate(shiftDays(today, -1))}>Dje</Chip>
          </View>

          {/* 4. Kategoria */}
          <Label>Kategoria</Label>
          <View className="flex-row flex-wrap mb-3">
            {CATEGORIES.map((cat) => {
              const active = category === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setCategory(cat.id)}
                  className={`flex-row items-center px-3 py-2 rounded-xl border mr-2 mb-2 ${active ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-slate-200'}`}
                >
                  <Ionicons name={cat.icon} size={14} color={cat.color} />
                  <Text className={`text-xs ml-1.5 ${active ? 'font-bold text-indigo-900' : 'font-semibold text-slate-700'}`}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 5. Pagesa & Ndarja */}
          {isShared ? (
            <View className="bg-indigo-50 border border-indigo-200 rounded-3xl p-4 mb-4">
              {members.length > 1 && (
                <View className="pb-2 mb-3 border-b border-indigo-200">
                  <Text className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider mb-2">Kush e pagoi?</Text>
                  <View className="flex-row flex-wrap">
                    {members.map((m) => (
                      <Chip key={m.id} active={paidBy === m.id} onPress={() => setPaidBy(m.id)} activeClass="bg-emerald-600 border-emerald-600">
                        {shortName(m)}
                      </Chip>
                    ))}
                  </View>
                </View>
              )}
              <Text className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider mb-2">Ndahet me ({selected.length})</Text>
              <View className="flex-row flex-wrap">
                {members.length === 0 && <ActivityIndicator color="#4f46e5" />}
                {members.map((m) => (
                  <Chip key={m.id} active={selected.includes(m.id)} onPress={() => toggleMember(m.id)}>
                    {selected.includes(m.id) ? '✓ ' : ''}{shortName(m)}
                  </Chip>
                ))}
              </View>
              {members.length === 1 && (
                <Text className="text-[11px] text-indigo-800 mb-2">
                  Je i vetëm në banesë. Fto shokët me kodin {household.code}.
                </Text>
              )}
              {/* Mënyra e ndarjes */}
              {selected.length > 1 && (
                <View className="flex-row bg-white border border-indigo-200 rounded-xl p-1 mb-2">
                  {[
                    { id: 'equal', label: 'Barabartë' },
                    { id: 'exact', label: 'Shuma €' },
                    { id: 'percent', label: 'Përqindje %' }
                  ].map((opt) => (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => changeSplitMode(opt.id)}
                      className={`flex-1 py-1.5 rounded-lg items-center ${splitMode === opt.id ? 'bg-indigo-600' : ''}`}
                    >
                      <Text className={`text-[11px] font-bold ${splitMode === opt.id ? 'text-white' : 'text-indigo-800'}`}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {splitMode === 'equal' || selected.length <= 1 ? (
                <View className="bg-white border border-indigo-200 rounded-2xl p-3 flex-row justify-between items-center mt-1">
                  <Text className="text-xs font-semibold text-indigo-900">Pjesa për person:</Text>
                  <Text className="text-base font-black text-indigo-700">{perPerson.toFixed(2)} €</Text>
                </View>
              ) : (
                <View className="bg-white border border-indigo-200 rounded-2xl p-3 mt-1">
                  {orderedSelected.map((id, i) => {
                    const m = members.find((x) => x.id === id);
                    return (
                      <View key={id} className="flex-row items-center mb-2">
                        <Text numberOfLines={1} className="flex-1 text-xs font-semibold text-slate-700">
                          {m ? shortName(m) : '...'}
                        </Text>
                        <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-2 w-28">
                          <TextInput
                            value={splitValues[id] ?? ''}
                            onChangeText={(t) => setSplitValues((prev) => ({ ...prev, [id]: t }))}
                            keyboardType="decimal-pad"
                            className="flex-1 py-1.5 text-sm font-bold text-slate-800 text-right"
                          />
                          <Text className="text-xs font-bold text-slate-400 ml-1">{splitMode === 'percent' ? '%' : '€'}</Text>
                        </View>
                        {splitMode === 'percent' && (
                          <Text className="w-16 text-right text-[11px] font-semibold text-indigo-700">{split.amounts[i]?.toFixed(2)} €</Text>
                        )}
                      </View>
                    );
                  })}
                  <Text className={`text-[11px] font-bold pt-2 border-t border-slate-100 ${split.error ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {split.error || `✓ Gjithçka e ndarë: ${(split.assignedCents / 100).toFixed(2)} €`}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View className="bg-slate-100 border border-slate-200 rounded-2xl p-3.5 mb-4">
              <Text className="text-xs text-slate-600">Ky shpenzim është 100% individual dhe nuk ndahet me banorët.</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            className={`bg-indigo-600 rounded-2xl py-4 items-center mb-12 ${loading ? 'opacity-60' : ''}`}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-sm">{isEditing ? 'Përditëso Shpenzimin' : 'Ruaj Shpenzimin'}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
