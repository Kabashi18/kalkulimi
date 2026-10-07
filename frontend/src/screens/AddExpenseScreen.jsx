import React, { useState } from 'react';
import { ArrowLeft, Check, Users, User, Zap, Home, Utensils, Wifi, Droplets, Receipt, Sparkles, Info } from 'lucide-react';
import { expenseApi, isPersonalExpense } from '../api/expenseApi';

const CATEGORIES = [
  { id: 'Rrymë', name: 'Rrymë', Icon: Zap, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'Banesë', name: 'Banesë / Qira', Icon: Home, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { id: 'Ushqim', name: 'Ushqim & Market', Icon: Utensils, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'Internet', name: 'Internet / TV', Icon: Wifi, color: 'text-sky-600 bg-sky-50 border-sky-200' },
  { id: 'Ujë', name: 'Ujësjellës', Icon: Droplets, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'Pastrim', name: 'Pastrim & Mirëmbajtje', Icon: Sparkles, color: 'text-pink-600 bg-pink-50 border-pink-200' },
  { id: 'Të tjera', name: 'Të tjera', Icon: Receipt, color: 'text-slate-600 bg-slate-50 border-slate-200' },
];

export default function AddExpenseScreen({ onBack, onExpenseAdded, currentUserId = 1, expenseToEdit = null }) {
  const isEditing = !!expenseToEdit;

  const [title, setTitle] = useState(expenseToEdit ? expenseToEdit.title : '');
  const [amount, setAmount] = useState(expenseToEdit ? Number(expenseToEdit.total_amount).toString() : '');
  const [category, setCategory] = useState(expenseToEdit ? expenseToEdit.category : 'Rrymë');
  
  // Zgjedhja: 'shared' (E përbashkët - Default) ose 'personal' (Individuale)
  const [expenseType, setExpenseType] = useState(
    expenseToEdit 
      ? (isPersonalExpense(expenseToEdit) ? 'personal' : 'shared')
      : 'shared'
  );
  
  const [memberCount, setMemberCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const numericAmount = parseFloat(amount) || 0;
  const isShared = expenseType === 'shared';
  const splitPerPerson = isShared && memberCount > 0 
    ? (numericAmount / memberCount).toFixed(2) 
    : numericAmount.toFixed(2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Ju lutem shkruani një titull për shpenzimin.');
      return;
    }

    if (!amount || numericAmount <= 0) {
      setErrorMsg('Ju lutem vendosni një shumë të saktë pozitive në euro.');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        title: title.trim(),
        total_amount: numericAmount,
        category: category,
        paid_by_user_id: currentUserId,
        isPersonal: !isShared,
        is_shared: isShared,
        is_personal: !isShared,
        group_id: isShared ? 1 : null,
        member_count: isShared ? memberCount : 1
      };

      if (isEditing) {
        await expenseApi.updateExpense(expenseToEdit.id, payload);
      } else {
        await expenseApi.createExpense(payload);
      }

      if (onExpenseAdded) onExpenseAdded();
      if (onBack) onBack();
    } catch (err) {
      setErrorMsg(err.message || 'Ndodhi një gabim gjatë ruajtjes së shpenzimit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <header className="px-5 py-4 bg-white border-b border-slate-100 flex items-center space-x-3 sticky top-0 z-10">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-slate-800">
          {isEditing ? 'Ndrysho Shpenzimin' : 'Shto Shpenzim të Ri'}
        </h1>
      </header>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 space-y-4 pb-12">
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium animate-in fade-in duration-150">
            {errorMsg}
          </div>
        )}

        {/* 1. Lloji i Shpenzimit: E Përbashkët vs Individuale (Segmented Control) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
            Lloji i Shpenzimit
          </label>
          <div className="grid grid-cols-2 p-1 bg-slate-200/70 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setExpenseType('shared')}
              className={`flex items-center justify-center space-x-2 py-3 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                isShared
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>E përbashkët</span>
            </button>

            <button
              type="button"
              onClick={() => setExpenseType('personal')}
              className={`flex items-center justify-center space-x-2 py-3 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                !isShared
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Individuale</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 px-1 flex items-center space-x-1">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              {isShared
                ? 'Ndahet barabartë mes banorëve dhe llogaritet në barazimin e borxheve.'
                : 'Vetëm për ty (nuk ndikon te borxhet apo llogaritë e banorëve).'}
            </span>
          </p>
        </div>

        {/* 2. Titulli */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            Përshkrimi i Shpenzimit
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isShared ? "psh. Fatura e Rrymës, Interneti, Qiraja..." : "psh. Kafe, Dreka personale, Libër..."}
            required
            className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl px-4 py-3 text-sm text-slate-800 outline-none transition-all shadow-sm"
          />
        </div>

        {/* 3. Shuma në Euro */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            Shuma Totale (€)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
              €
            </span>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl pl-10 pr-4 py-3 text-xl font-bold text-slate-900 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {/* 4. Kategoria */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
            Zgjidh Kategorinë
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.id;
              const { Icon } = cat;
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-200/50 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center mr-2.5 shrink-0 ${cat.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-xs font-semibold ${isSelected ? 'text-indigo-950 font-bold' : 'text-slate-700'}`}>
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Kartela e Ndarjes (Shfaqet vetëm për Shpenzime të Përbashkëta) */}
        {isShared ? (
          <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-3xl p-4 shadow-sm space-y-3 animate-in fade-in duration-200">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                Numri i personave në ndarje:
              </span>
              <span className="text-xs font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-200 shadow-2xs">
                {memberCount} banorë
              </span>
            </div>

            {/* Butonat për numrin e banorëve */}
            <div className="grid grid-cols-4 gap-2">
              {[2, 3, 4, 5].map((count) => (
                <button
                  type="button"
                  key={count}
                  onClick={() => setMemberCount(count)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    memberCount === count
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-indigo-100 hover:bg-indigo-100/50'
                  }`}
                >
                  {count} vetë
                </button>
              ))}
            </div>

            {/* Llogaritja live e ndarjes për person */}
            <div className="bg-white border border-indigo-200 rounded-2xl p-3 flex items-center justify-between shadow-xs">
              <div className="flex items-center space-x-2 text-indigo-900">
                <Users className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-semibold">Pjesa për person:</span>
              </div>
              <span className="text-base font-black text-indigo-700">
                {splitPerPerson} €
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-100/80 border border-slate-200 rounded-2xl p-3.5 flex items-center space-x-2.5 text-slate-600 text-xs">
            <User className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Ky shpenzim është <strong>100% individual</strong> dhe nuk do të ndahet me banorët e tjerë.</span>
          </div>
        )}

        {/* 6. Butoni "Ruaj / Përditëso Shpenzimin" */}
        <div className="pt-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Check className="w-5 h-5" />
                <span>{isEditing ? 'Përditëso Shpenzimin' : 'Ruaj Shpenzimin'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
