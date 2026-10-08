import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Users, Lock, CalendarDays, Zap, Home, Utensils, Wifi, Droplets, Receipt, Sparkles, ChevronDown, AlertCircle } from 'lucide-react';
import { expenseApi, isPersonalExpense } from '../api/expenseApi';
import { householdApi } from '../api/householdApi';
import { todayISO, computeSplitAmounts, formatEuro, expenseDateOf, dayLabel } from '../utils/balances';

const CATEGORIES = [
  { id: 'Rrymë', name: 'Rrymë', Icon: Zap, color: 'text-amber-600 bg-amber-50' },
  { id: 'Banesë', name: 'Qira / Banesë', Icon: Home, color: 'text-indigo-600 bg-indigo-50' },
  { id: 'Ushqim', name: 'Ushqim & Market', Icon: Utensils, color: 'text-emerald-600 bg-emerald-50' },
  { id: 'Internet', name: 'Internet / TV', Icon: Wifi, color: 'text-sky-600 bg-sky-50' },
  { id: 'Ujë', name: 'Ujë', Icon: Droplets, color: 'text-blue-600 bg-blue-50' },
  { id: 'Pastrim', name: 'Pastrim', Icon: Sparkles, color: 'text-pink-600 bg-pink-50' },
  { id: 'Të tjera', name: 'Të tjera', Icon: Receipt, color: 'text-slate-600 bg-slate-100' }
];

const SPLIT_MODES = [
  { id: 'equal', label: 'Barabartë' },
  { id: 'exact', label: 'Shuma €' },
  { id: 'percent', label: 'Përqindje' }
];

// Vlerat në fusha shfaqen me presje dhjetore (si gjithë aplikacioni); pranohet edhe pika
const toInput = (n) => String(n).replace('.', ',');

// Chip i vogël i përbashkët për zgjedhjet (pagues, anëtarë)
const Chip = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`px-3.5 py-2 rounded-full text-sm font-semibold border transition-all cursor-pointer whitespace-nowrap ${
      active ? 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
    }`}
  >
    {children}
  </button>
);

export default function AddExpenseScreen({ onBack, onExpenseAdded, currentUserId, household, expenseToEdit = null }) {
  const isEditing = !!expenseToEdit;

  const [title, setTitle] = useState(expenseToEdit ? expenseToEdit.title : '');
  const [amount, setAmount] = useState(expenseToEdit ? toInput(Number(expenseToEdit.total_amount)) : '');
  const [category, setCategory] = useState(expenseToEdit ? expenseToEdit.category : 'Ushqim');

  // 'shared' (E përbashkët - parazgjedhje) ose 'personal' (Vetëm për mua)
  const [expenseType, setExpenseType] = useState(
    expenseToEdit ? (isPersonalExpense(expenseToEdit) ? 'personal' : 'shared') : 'shared'
  );

  // Anëtarët realë të banesës; si parazgjedhje ndahet me të gjithë
  const [members, setMembers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(expenseToEdit?.member_ids?.length ? expenseToEdit.member_ids : null);
  // Data e shpenzimit (p.sh. fatura e shtatorit e regjistruar në tetor)
  const [expenseDate, setExpenseDate] = useState(expenseToEdit?.expense_date || todayISO());
  // Kush e pagoi (si parazgjedhje: përdoruesi i kyçur)
  const [paidBy, setPaidBy] = useState(expenseToEdit?.paid_by_user_id || currentUserId);

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

  // Detajet (pagues / anëtarë / ndarje / datë) janë të palosura: 90% e rasteve nuk i ndryshojnë
  const [detailsOpen, setDetailsOpen] = useState(isEditing && expenseToEdit?.split_mode && expenseToEdit.split_mode !== 'equal');
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
  // Rendi i anëtarëve në ndarje ndjek listën e banesës (që shumat të mos ndërrojnë vend)
  const orderedSelected = members.length ? members.filter((m) => selected.includes(m.id)).map((m) => m.id) : selected;

  const toggleMember = (id) => {
    setSelectedIds((prev) => {
      const list = prev || [];
      return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    });
  };

  // Pranohet edhe presja si ndarës dhjetor ("23,50")
  const numericAmount = parseFloat(String(amount).replace(',', '.')) || 0;
  const isShared = expenseType === 'shared';
  const parsedValues = Object.fromEntries(Object.entries(splitValues).map(([k, v]) => [k, String(v).replace(',', '.')]));
  const split = computeSplitAmounts(numericAmount, orderedSelected, splitMode, parsedValues);
  const perPerson = memberCount > 0 ? numericAmount / memberCount : numericAmount;
  const customSplit = isShared && splitMode !== 'equal' && memberCount > 1;
  const splitInvalid = customSplit && !!split.error;

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
      setSplitValues(
        Object.fromEntries(orderedSelected.map((id, i) => [id, toInput(i === n - 1 ? Math.round((100 - base * (n - 1)) * 100) / 100 : base)]))
      );
    }
  };

  // Rreshti përmbledhës: "Paguar nga ti · barabartë me 3 · sot"
  const nameOf = (id) => (id === currentUserId ? 'ti' : (members.find((m) => m.id === id)?.name || '...').split(' ')[0]);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!amount || numericAmount <= 0) {
      setErrorMsg('Shkruani shumën e shpenzimit.');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Shkruani për çfarë ishte shpenzimi.');
      return;
    }
    if (isShared && memberCount === 0) {
      setDetailsOpen(true);
      setErrorMsg('Zgjidhni të paktën një anëtar me të cilin ndahet shpenzimi.');
      return;
    }
    if (splitInvalid) {
      setDetailsOpen(true);
      setErrorMsg(split.error);
      return;
    }

    try {
      setLoading(true);
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
      if (isEditing) await expenseApi.updateExpense(expenseToEdit.id, payload);
      else await expenseApi.createExpense(payload);
      onExpenseAdded?.();
      onBack?.();
    } catch (err) {
      setErrorMsg(err.message || 'Ndodhi një gabim gjatë ruajtjes së shpenzimit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full bg-white">
      {/* Header */}
      <header className="px-4 py-3 border-b border-slate-100 flex items-center space-x-2 sticky top-0 bg-white z-10">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700 cursor-pointer"
          aria-label="Kthehu"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-slate-900">{isEditing ? 'Ndrysho shpenzimin' : 'Shpenzim i ri'}</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {errorMsg && (
          <div role="alert" className="mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Shuma: e madhe, si kalkulator */}
        <div className="pt-8 pb-6 text-center">
          <label htmlFor="amount" className="sr-only">Shuma</label>
          <div className="flex items-baseline justify-center">
            <input
              id="amount"
              type="text"
              inputMode="decimal"
              autoFocus={!isEditing}
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
              placeholder="0,00"
              // Gjerësia ndjek numrin e shifrave, që "€" të qëndrojë ngjitur me shumën
              style={{ width: `${Math.max(amount.length, 4) + 0.5}ch` }}
              className="max-w-[80%] text-right text-5xl font-extrabold text-slate-900 placeholder-slate-300 outline-none bg-transparent tracking-tight"
            />
            <span className="text-3xl font-bold text-slate-500 ml-1">€</span>
          </div>
        </div>

        {/* 2. Për çfarë */}
        <label htmlFor="title" className="sr-only">Përshkrimi</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isShared ? 'Për çfarë? psh. Market, Qiraja...' : 'Për çfarë? psh. Kafe, Libër...'}
          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl px-4 py-3.5 text-base text-slate-900 placeholder-slate-400 outline-none transition-all"
        />

        {/* 3. Kategoria: rrjetë me 2 kolona; e fundit (tek) qendërzohet */}
        <p className="text-sm font-semibold text-slate-700 mt-5 mb-2" id="category-label">Kategoria</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="category-label">
          {CATEGORIES.map(({ id, name, Icon, color }, i) => {
            const active = category === id;
            const lonelyLast = i === CATEGORIES.length - 1 && CATEGORIES.length % 2 === 1;
            return (
              <button
                type="button"
                key={id}
                role="radio"
                aria-checked={active}
                onClick={() => setCategory(id)}
                className={`flex items-center p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  lonelyLast ? 'col-span-2 justify-self-center w-[calc(50%-0.25rem)]' : ''
                } ${active ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-100' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center mr-2.5 shrink-0 ${color}`}>
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                <span className={`text-sm leading-tight flex-1 min-w-0 ${active ? 'font-bold text-indigo-950' : 'font-medium text-slate-700'}`}>{name}</span>
              </button>
            );
          })}
        </div>

        {/* 4. E përbashkët / Vetëm për mua */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl gap-1 mt-5">
          {[
            { id: 'shared', label: 'E përbashkët', Icon: Users },
            { id: 'personal', label: 'Vetëm për mua', Icon: Lock }
          ].map(({ id, label, Icon }) => (
            <button
              type="button"
              key={id}
              onClick={() => setExpenseType(id)}
              aria-pressed={expenseType === id}
              className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                expenseType === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* 5. Përmbledhja: prekja e saj hap detajet */}
        <button
          type="button"
          onClick={() => setDetailsOpen(!detailsOpen)}
          aria-expanded={detailsOpen}
          className={`w-full mt-3 px-4 py-3.5 rounded-2xl border text-left flex items-center justify-between cursor-pointer transition-all ${
            splitInvalid ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="text-sm text-slate-600 leading-relaxed">
            {isShared && (
              <>
                Paguar nga <strong className="text-slate-900">{nameOf(paidBy)}</strong> ·{' '}
              </>
            )}
            <strong className="text-slate-900">{splitText}</strong> · <strong className="text-slate-900">{dateText}</strong>
            {splitInvalid && <span className="block text-rose-600 font-semibold">{split.error}</span>}
          </span>
          <ChevronDown className={`w-5 h-5 text-slate-500 shrink-0 ml-2 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
        </button>

        {detailsOpen && (
          <div className="mt-3 space-y-5 animate-in fade-in duration-150">
            {isShared && members.length > 1 && (
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Kush e pagoi?</p>
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => (
                    <Chip key={m.id} active={paidBy === m.id} onClick={() => setPaidBy(m.id)}>
                      {m.id === currentUserId ? 'Unë' : m.name.split(' ')[0]}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            {isShared && (
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Ndahet me</p>
                <div className="flex flex-wrap gap-2">
                  {members.length === 0 && <span className="text-sm text-slate-500">Duke ngarkuar anëtarët...</span>}
                  {members.map((m) => (
                    <Chip key={m.id} active={selected.includes(m.id)} onClick={() => toggleMember(m.id)}>
                      {selected.includes(m.id) && <Check className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />}
                      {m.id === currentUserId ? 'Unë' : m.name.split(' ')[0]}
                    </Chip>
                  ))}
                </div>
                {members.length === 1 && (
                  <p className="text-sm text-slate-500 mt-2">
                    Je i vetëm në banesë. Fto shokët me kodin <strong>{household.code}</strong>.
                  </p>
                )}
              </div>
            )}

            {isShared && memberCount > 1 && (
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Si ndahet?</p>
                <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-xl gap-1">
                  {SPLIT_MODES.map((opt) => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => changeSplitMode(opt.id)}
                      aria-pressed={splitMode === opt.id}
                      className={`py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                        splitMode === opt.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {splitMode === 'equal' ? (
                  <p className="text-sm text-slate-500 mt-2">
                    Secili paguan <strong className="text-slate-900">{formatEuro(perPerson)}</strong>
                  </p>
                ) : (
                  <div className="mt-3 border border-slate-200 rounded-2xl divide-y divide-slate-100">
                    {orderedSelected.map((id, i) => (
                      <div key={id} className="flex items-center justify-between px-3.5 py-2.5 space-x-2">
                        <span className="text-sm font-medium text-slate-800 truncate flex-1">{id === currentUserId ? 'Unë' : nameOf(id)}</span>
                        <div className="relative w-28 shrink-0">
                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label={`Pjesa e ${id === currentUserId ? 'imja' : nameOf(id)}`}
                            value={splitValues[id] ?? ''}
                            onChange={(e) => setSplitValues((prev) => ({ ...prev, [id]: e.target.value.replace(/[^\d.,]/g, '') }))}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl pl-3 pr-7 py-2 text-sm font-semibold text-slate-900 outline-none text-right"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-500">{splitMode === 'percent' ? '%' : '€'}</span>
                        </div>
                        {splitMode === 'percent' && (
                          <span className="w-20 text-right text-sm text-slate-500 shrink-0">{formatEuro(split.amounts[i] || 0)}</span>
                        )}
                      </div>
                    ))}
                    <p className={`px-3.5 py-2.5 text-sm font-semibold flex items-center space-x-1.5 ${split.error ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {split.error ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      <span>{split.error || `Gjithçka e ndarë: ${formatEuro(split.assignedCents / 100)}`}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            <div>
              <label htmlFor="expense-date" className="text-sm font-semibold text-slate-700 mb-2 block">
                Data
              </label>
              <div className="relative">
                <CalendarDays className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="expense-date"
                  type="date"
                  value={expenseDate}
                  max={todayISO()}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-900 outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. Butoni "Ruaj": gjithmonë i dukshëm poshtë */}
      <div className="px-5 py-4 border-t border-slate-100 bg-white">
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Check className="w-5 h-5" />
              <span>
                {isEditing ? 'Ruaj ndryshimet' : 'Ruaj shpenzimin'}
                {numericAmount > 0 && ` · ${formatEuro(numericAmount)}`}
              </span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
