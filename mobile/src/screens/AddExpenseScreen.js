import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { expenseApi } from '../api/expenseApi';
import { householdApi } from '../api/householdApi';
import { isPersonalExpense, expenseDateOf, todayISO, computeSplitAmounts, formatDateSq, formatEuro, dayLabel } from '../utils/balances';
import { C } from '../lib/theme';

const CATEGORIES = [
  { id: 'Rrymë', name: 'Rrymë', icon: 'flash', color: '#d97706', bg: 'bg-amber-50 dark:bg-amber-950' },
  { id: 'Banesë', name: 'Qira / Banesë', icon: 'home', color: '#4f46e5', bg: 'bg-indigo-50 dark:bg-indigo-950' },
  { id: 'Ushqim', name: 'Ushqim & Market', icon: 'fast-food', color: '#059669', bg: 'bg-emerald-50 dark:bg-emerald-950' },
  { id: 'Internet', name: 'Internet / TV', icon: 'wifi', color: '#0284c7', bg: 'bg-sky-50 dark:bg-sky-950' },
  { id: 'Ujë', name: 'Ujë', icon: 'water', color: '#2563eb', bg: 'bg-blue-50 dark:bg-blue-950' },
  { id: 'Pastrim', name: 'Pastrim', icon: 'sparkles', color: '#db2777', bg: 'bg-pink-50 dark:bg-pink-950' },
  { id: 'Të tjera', name: 'Të tjera', icon: 'receipt-outline', color: '#475569', bg: 'bg-slate-100 dark:bg-slate-800' }
];

const SPLIT_MODES = [
  { id: 'equal', label: 'Barabartë' },
  { id: 'exact', label: 'Shuma €' },
  { id: 'percent', label: 'Përqindje' }
];

// Vlerat në fusha shfaqen me presje dhjetore (si gjithë aplikacioni); pranohet edhe pika
const toInput = (n) => String(n).replace('.', ',');

// Zgjedhës i thjeshtë datash pa varësi native: ◀ data ▶
const shiftDays = (iso, days) => {
  const d = expenseDateOf({ expense_date: iso });
  d.setDate(d.getDate() + days);
  return todayISO(d);
};

const Chip = ({ active, onPress, children }) => (
  <TouchableOpacity
    onPress={onPress}
    className={`px-3.5 py-2 rounded-full border mr-2 mb-2 ${active ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-300 dark:border-indigo-700' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}
  >
    <Text className={`text-sm font-semibold ${active ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>{children}</Text>
  </TouchableOpacity>
);

const SectionLabel = ({ children }) => <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{children}</Text>;

export default function AddExpenseScreen({ currentUserId, household, expenseToEdit = null, onBack, onSaved }) {
  const isEditing = !!expenseToEdit;
  const [title, setTitle] = useState(expenseToEdit?.title || '');
  const [amount, setAmount] = useState(expenseToEdit ? toInput(Number(expenseToEdit.total_amount)) : '');
  const [category, setCategory] = useState(expenseToEdit?.category || 'Ushqim');
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
        toInput(expenseToEdit.split_mode === 'percent' ? Math.round((sp.amount_owed / total) * 10000) / 100 : sp.amount_owed)
      ])
    );
  });
  const [members, setMembers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(expenseToEdit?.member_ids?.length ? expenseToEdit.member_ids : null);
  // Detajet janë të palosura: 90% e rasteve nuk i ndryshojnë
  const [detailsOpen, setDetailsOpen] = useState(isEditing && !!expenseToEdit?.split_mode && expenseToEdit.split_mode !== 'equal');
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
  const memberCount = selected.length;
  // Rendi i anëtarëve në ndarje ndjek listën e banesës
  const orderedSelected = members.length ? members.filter((m) => selected.includes(m.id)).map((m) => m.id) : selected;
  const numericAmount = parseFloat(String(amount).replace(',', '.')) || 0;
  const perPerson = memberCount > 0 ? numericAmount / memberCount : numericAmount;
  const parsedValues = Object.fromEntries(Object.entries(splitValues).map(([k, v]) => [k, String(v).replace(',', '.')]));
  const split = computeSplitAmounts(numericAmount, orderedSelected, splitMode, parsedValues);
  const customSplit = isShared && splitMode !== 'equal' && memberCount > 1;
  const splitInvalid = customSplit && !!split.error;

  const nameOf = (id) => (id === currentUserId ? 'ti' : (members.find((m) => m.id === id)?.name || '...').split(' ')[0]);
  const shortName = (m) => (m.id === currentUserId ? 'Unë' : m.name.split(' ')[0]);

  const toggleMember = (id) =>
    setSelectedIds((prev) => ((prev || []).includes(id) ? prev.filter((x) => x !== id) : [...(prev || []), id]));

  // Kur zgjidhet "Shuma" ose "%", fushat plotësohen me ndarjen e barabartë si pikënisje
  const changeSplitMode = (mode) => {
    setSplitMode(mode);
    if (mode === 'equal' || orderedSelected.length === 0) return;
    const n = orderedSelected.length;
    if (mode === 'exact') {
      const eq = computeSplitAmounts(numericAmount, orderedSelected, 'equal').amounts;
      setSplitValues(Object.fromEntries(orderedSelected.map((id, i) => [id, toInput(eq[i].toFixed(2))])));
    } else {
      const base = Math.floor(10000 / n) / 100;
      setSplitValues(Object.fromEntries(orderedSelected.map((id, i) => [id, toInput(i === n - 1 ? Math.round((100 - base * (n - 1)) * 100) / 100 : base)])));
    }
  };

  // Rreshti përmbledhës: "Paguar nga ti · barabartë me të gjithë (3) · sot"
  const dateText = (() => {
    const label = dayLabel(expenseDateOf({ expense_date: expenseDate }));
    return label === 'Sot' || label === 'Dje' ? label.toLowerCase() : label;
  })();
  const splitText = !isShared
    ? 'vetëm për ty'
    : memberCount <= 1
      ? `vetëm për ${nameOf(orderedSelected[0])}`
      : splitMode === 'exact'
        ? `me shuma të ndryshme mes ${memberCount}`
        : splitMode === 'percent'
          ? `me përqindje mes ${memberCount}`
          : memberCount === members.length
            ? `barabartë me të gjithë (${memberCount})`
            : `barabartë mes ${memberCount}`;

  const handleSave = async () => {
    setErrorMsg(null);
    if (numericAmount <= 0) return setErrorMsg('Shkruani shumën e shpenzimit.');
    if (!title.trim()) return setErrorMsg('Shkruani për çfarë ishte shpenzimi.');
    if (isShared && memberCount === 0) {
      setDetailsOpen(true);
      return setErrorMsg('Zgjidhni të paktën një anëtar me të cilin ndahet shpenzimi.');
    }
    if (splitInvalid) {
      setDetailsOpen(true);
      return setErrorMsg(split.error);
    }
    const payload = {
      title: title.trim(),
      total_amount: numericAmount,
      category,
      isPersonal: !isShared,
      member_ids: isShared ? orderedSelected : [],
      split_mode: customSplit ? splitMode : 'equal',
      split_amounts: customSplit ? split.amounts : null,
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
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        {/* Header */}
        <View className="px-3 pt-4 pb-3 flex-row items-center border-b border-slate-100 dark:border-slate-800">
          <TouchableOpacity onPress={onBack} className="w-10 h-10 rounded-full items-center justify-center" accessibilityLabel="Kthehu">
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text className="text-base font-bold text-slate-900 dark:text-slate-100 ml-1">{isEditing ? 'Ndrysho shpenzimin' : 'Shpenzim i ri'}</Text>
        </View>

        <ScrollView className="flex-1 px-5" keyboardShouldPersistTaps="handled">
          {errorMsg && (
            <View className="mt-4 p-3.5 bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 rounded-2xl flex-row">
              <Ionicons name="alert-circle-outline" size={16} color={C.dangerStrong} style={{ marginTop: 1 }} />
              <Text className="text-sm text-rose-700 dark:text-rose-300 ml-2 flex-1">{errorMsg}</Text>
            </View>
          )}

          {/* 1. Shuma e madhe */}
          <View className="flex-row items-baseline justify-center pt-8 pb-6">
            <TextInput
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^\d.,]/g, ''))}
              placeholder="0,00"
              placeholderTextColor={C.placeholderSoft}
              keyboardType="decimal-pad"
              autoFocus={!isEditing}
              className="text-5xl font-extrabold text-slate-900 dark:text-slate-100 text-center"
              style={{ minWidth: 120 }}
              accessibilityLabel="Shuma"
            />
            <Text className="text-3xl font-bold text-slate-500 dark:text-slate-400 ml-1">€</Text>
          </View>

          {/* 2. Për çfarë */}
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={isShared ? 'Për çfarë? psh. Market, Qiraja...' : 'Për çfarë? psh. Kafe, Libër...'}
            placeholderTextColor={C.faint}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-base text-slate-900 dark:text-slate-100"
            accessibilityLabel="Përshkrimi"
          />

          {/* 3. Kategoria: rrjetë me 2 kolona; e fundit (tek) qendërzohet */}
          <View style={{ height: 20 }} />
          <SectionLabel>Kategoria</SectionLabel>
          <View className="flex-row flex-wrap justify-center">
            {CATEGORIES.map((cat) => {
              const active = category === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setCategory(cat.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  className={`flex-row items-center p-2.5 rounded-2xl border mb-2 ${active ? 'border-indigo-500 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
                  // 48.5% + 2 × 0.75% = 50%: dy për rresht; një e vetme mbetet në qendër
                  style={{ width: '48.5%', marginHorizontal: '0.75%' }}
                >
                  <View className={`w-9 h-9 rounded-xl items-center justify-center mr-2.5 ${cat.bg}`}>
                    <Ionicons name={cat.icon} size={18} color={cat.color} />
                  </View>
                  <Text className={`text-sm flex-1 ${active ? 'font-bold text-indigo-950 dark:text-indigo-50' : 'font-medium text-slate-700 dark:text-slate-300'}`}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 4. E përbashkët / Vetëm për mua */}
          <View className="flex-row bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 mt-3">
            {[
              { shared: true, label: 'E përbashkët', icon: 'people-outline' },
              { shared: false, label: 'Vetëm për mua', icon: 'lock-closed-outline' }
            ].map((opt) => {
              const active = isShared === opt.shared;
              return (
                <TouchableOpacity
                  key={opt.label}
                  onPress={() => setIsShared(opt.shared)}
                  className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${active ? 'bg-white dark:bg-slate-900' : ''}`}
                >
                  <Ionicons name={opt.icon} size={16} color={active ? C.text : C.muted} />
                  <Text className={`text-sm font-semibold ml-1.5 ${active ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 5. Përmbledhja: prekja e saj hap detajet */}
          <TouchableOpacity
            onPress={() => setDetailsOpen(!detailsOpen)}
            className={`mt-3 px-4 py-3.5 rounded-2xl border flex-row items-center ${splitInvalid ? 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
          >
            <View className="flex-1">
              <Text className="text-sm text-slate-600 dark:text-slate-400">
                {isShared ? 'Paguar nga ' : ''}
                {isShared && <Text className="font-bold text-slate-900 dark:text-slate-100">{nameOf(paidBy)}</Text>}
                {isShared ? ' · ' : ''}
                <Text className="font-bold text-slate-900 dark:text-slate-100">{splitText}</Text> · <Text className="font-bold text-slate-900 dark:text-slate-100">{dateText}</Text>
              </Text>
              {splitInvalid && <Text className="text-sm font-semibold text-rose-600 dark:text-rose-400 mt-0.5">{split.error}</Text>}
            </View>
            <Ionicons name={detailsOpen ? 'chevron-up' : 'chevron-down'} size={20} color={C.faint} />
          </TouchableOpacity>

          {detailsOpen && (
            <View className="mt-4">
              {isShared && members.length > 1 && (
                <View className="mb-4">
                  <SectionLabel>Kush e pagoi?</SectionLabel>
                  <View className="flex-row flex-wrap">
                    {members.map((m) => (
                      <Chip key={m.id} active={paidBy === m.id} onPress={() => setPaidBy(m.id)}>
                        {shortName(m)}
                      </Chip>
                    ))}
                  </View>
                </View>
              )}

              {isShared && (
                <View className="mb-4">
                  <SectionLabel>Ndahet me</SectionLabel>
                  <View className="flex-row flex-wrap">
                    {members.length === 0 && <ActivityIndicator color={C.brand} />}
                    {members.map((m) => (
                      <Chip key={m.id} active={selected.includes(m.id)} onPress={() => toggleMember(m.id)}>
                        {selected.includes(m.id) ? '✓ ' : ''}
                        {shortName(m)}
                      </Chip>
                    ))}
                  </View>
                  {members.length === 1 && (
                    <Text className="text-sm text-slate-500 dark:text-slate-400">Je i vetëm në banesë. Fto shokët me kodin {household.code}.</Text>
                  )}
                </View>
              )}

              {isShared && memberCount > 1 && (
                <View className="mb-4">
                  <SectionLabel>Si ndahet?</SectionLabel>
                  <View className="flex-row bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                    {SPLIT_MODES.map((opt) => (
                      <TouchableOpacity
                        key={opt.id}
                        onPress={() => changeSplitMode(opt.id)}
                        className={`flex-1 py-2 rounded-lg items-center ${splitMode === opt.id ? 'bg-white dark:bg-slate-900' : ''}`}
                      >
                        <Text className={`text-sm font-semibold ${splitMode === opt.id ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {splitMode === 'equal' ? (
                    <Text className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                      Secili paguan <Text className="font-bold text-slate-900 dark:text-slate-100">{formatEuro(perPerson)}</Text>
                    </Text>
                  ) : (
                    <View className="mt-3 border border-slate-200 dark:border-slate-800 rounded-2xl">
                      {orderedSelected.map((id, i) => {
                        const m = members.find((x) => x.id === id);
                        return (
                          <View key={id} className="flex-row items-center px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800">
                            <Text numberOfLines={1} className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                              {m ? shortName(m) : '...'}
                            </Text>
                            <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 w-28">
                              <TextInput
                                value={splitValues[id] ?? ''}
                                onChangeText={(t) => setSplitValues((prev) => ({ ...prev, [id]: t.replace(/[^\d.,]/g, '') }))}
                                keyboardType="decimal-pad"
                                className="flex-1 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 text-right"
                              />
                              <Text className="text-sm text-slate-500 dark:text-slate-400 ml-1">{splitMode === 'percent' ? '%' : '€'}</Text>
                            </View>
                            {splitMode === 'percent' && (
                              <Text className="w-20 text-right text-sm text-slate-500 dark:text-slate-400">{formatEuro(split.amounts[i] || 0)}</Text>
                            )}
                          </View>
                        );
                      })}
                      <Text className={`px-3.5 py-2.5 text-sm font-semibold ${split.error ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {split.error || `✓ Gjithçka e ndarë: ${formatEuro(split.assignedCents / 100)}`}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <View className="mb-4">
                <SectionLabel>Data</SectionLabel>
                <View className="flex-row items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-2 py-2">
                  <TouchableOpacity onPress={() => setExpenseDate(shiftDays(expenseDate, -1))} className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center" accessibilityLabel="Dita e kaluar">
                    <Ionicons name="chevron-back" size={18} color={C.strong} />
                  </TouchableOpacity>
                  <Text className="flex-1 text-center text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {formatDateSq(expenseDateOf({ expense_date: expenseDate }), { weekday: true })}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setExpenseDate(shiftDays(expenseDate, 1))}
                    disabled={expenseDate >= today}
                    className={`w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center ${expenseDate >= today ? 'opacity-30' : ''}`}
                    accessibilityLabel="Dita tjetër"
                  >
                    <Ionicons name="chevron-forward" size={18} color={C.strong} />
                  </TouchableOpacity>
                </View>
                <View className="flex-row mt-2">
                  <Chip active={expenseDate === today} onPress={() => setExpenseDate(today)}>Sot</Chip>
                  <Chip active={expenseDate === shiftDays(today, -1)} onPress={() => setExpenseDate(shiftDays(today, -1))}>Dje</Chip>
                </View>
              </View>
            </View>
          )}
          <View style={{ height: 24 }} />
        </ScrollView>

        {/* 6. Butoni "Ruaj": gjithmonë i dukshëm poshtë */}
        <View className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <TouchableOpacity onPress={handleSave} disabled={loading} className={`bg-indigo-600 dark:bg-indigo-400 rounded-2xl py-4 items-center ${loading ? 'opacity-60' : ''}`}>
            {loading ? (
              <ActivityIndicator color={C.onBrand} />
            ) : (
              <Text className="text-white dark:text-slate-900 font-bold text-base">
                {isEditing ? 'Ruaj ndryshimet' : 'Ruaj shpenzimin'}
                {numericAmount > 0 ? ` · ${formatEuro(numericAmount)}` : ''}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
