import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Users, Zap, Home, Utensils, Wifi, Droplets, Receipt } from 'lucide-react';
import { expenseApi } from '../api/expenseApi';

const CATEGORIES = [
  { id: 'Rrymë', name: 'Rrymë', Icon: Zap, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'Qira', name: 'Qira', Icon: Home, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { id: 'Ushqim', name: 'Ushqim', Icon: Utensils, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'Internet', name: 'Internet / TV', Icon: Wifi, color: 'text-sky-600 bg-sky-50 border-sky-200' },
  { id: 'Ujë', name: 'Ujë', Icon: Droplets, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'Të tjera', name: 'Të tjera', Icon: Receipt, color: 'text-slate-600 bg-slate-50 border-slate-200' },
];

export default function AddExpenseScreen({ onBack, onExpenseAdded, currentUserId = 1, expenseToEdit = null }) {
  const isEditing = !!expenseToEdit;

  const [title, setTitle] = useState(expenseToEdit ? expenseToEdit.title : '');
  const [amount, setAmount] = useState(expenseToEdit ? Number(expenseToEdit.total_amount).toString() : '');
  const [category, setCategory] = useState(expenseToEdit ? expenseToEdit.category : 'Rrymë');
  const [isShared, setIsShared] = useState(expenseToEdit ? expenseToEdit.group_id !== null : true);
  const [memberCount, setMemberCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const numericAmount = parseFloat(amount) || 0;
  const splitPerPerson = isShared && memberCount > 0 ? (numericAmount / memberCount).toFixed(2) : numericAmount.toFixed(2);

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
        group_id: isShared ? 1 : null,
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
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-slate-800">
          {isEditing ? 'Ndrysho Shpenzimin' : 'Shto Shpenzim të Ri'}
        </h1>
      </header>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* 1. Titulli */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            Përshkrimi i Shpenzimit
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="psh. Fatura e Rrymës, Blerje Ushqimore..."
            className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-2xl px-4 py-3 text-sm text-slate-800 outline-none transition-all shadow-sm"
          />
        </div>

        {/* 2. Shuma në Euro */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            Shuma në Euro (€)
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
              className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-2xl pl-10 pr-4 py-3 text-xl font-bold text-slate-900 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {/* 3. Kategoria */}
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
                  className={`flex items-center p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-100 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center mr-2.5 shrink-0 ${cat.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-xs font-semibold ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Switch: Personal apo me Banesën */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800">
                {isShared ? 'Shpenzim i Përbashkët' : 'Shpenzim Personal'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isShared
                  ? 'Fatura do të ndahet në mënyrë të barabartë mes anëtarëve'
                  : 'Regjistrohet vetëm për llogarinë tënde'}
              </p>
            </div>

            {/* Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* 5. Zgjedhja e personave nëse është i përbashkët */}
          {isShared && (
            <div className="pt-3 border-t border-slate-100">
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Numri i personave në ndarje:
                </span>
                <span className="text-xs font-bold text-indigo-600">{memberCount} persona</span>
              </div>

              {/* Butonat për numrin e personave */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[2, 3, 4, 5].map((count) => (
                  <button
                    type="button"
                    key={count}
                    onClick={() => setMemberCount(count)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      memberCount === count
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {count} vetë
                  </button>
                ))}
              </div>

              {/* Llogaritja live e ndarjes për person */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-indigo-900">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-semibold">Secili paguan:</span>
                </div>
                <span className="text-base font-extrabold text-indigo-700">
                  {splitPerPerson} €
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 6. Butoni "Ruaj / Përditëso Shpenzimin" */}
        <div className="pt-2 pb-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-60"
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
