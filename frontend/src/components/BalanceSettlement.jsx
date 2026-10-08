import React, { useState } from 'react';
import { CheckCircle2, HandCoins, Download, X, Undo2, ArrowRight } from 'lucide-react';
import { expenseApi } from '../api/expenseApi';
import { formatDateSq, formatEuro } from '../utils/balances';

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

const formatDate = (iso) => formatDateSq(new Date(iso), { year: false });

// Modali i konfirmimit të pagesës ("Laje Borxhin")
function SettleModal({ row, onClose, onConfirm, loading, error }) {
  const [amount, setAmount] = useState(row.amount.toFixed(2));
  const iPay = row.type === 'user_owes';
  const numeric = parseFloat(String(amount).replace(',', '.')) || 0;
  const tooMuch = numeric > row.amount + 0.001;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 p-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{iPay ? 'Laje borxhin' : 'Shëno pagesën e marrë'}</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {iPay ? `Konfirmo që ia ke kthyer paratë ${row.name}.` : `Konfirmo që ${row.name} t'i ka kthyer paratë.`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer shrink-0"
            aria-label="Mbyll"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-center space-x-3 py-3 mb-4 bg-slate-50 rounded-2xl text-sm font-semibold">
          <span className="text-slate-900">{iPay ? 'Ti' : row.name}</span>
          <ArrowRight className="w-4 h-4 text-slate-500" />
          <span className="text-slate-900">{iPay ? row.name : 'Ty'}</span>
        </div>

        <label htmlFor="settle-amount" className="block text-sm font-medium text-slate-700 mb-1.5">
          Shuma e paguar
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-500">€</span>
          <input
            id="settle-amount"
            type="number"
            step="0.01"
            min="0.01"
            max={row.amount}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl pl-10 pr-4 py-3 text-xl font-bold text-slate-900 outline-none"
          />
        </div>
        <p className={`text-xs mt-1.5 ${tooMuch ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
          {tooMuch ? `Shuma nuk mund të jetë më e madhe se borxhi (${formatEuro(row.amount)}).` : 'Mund të shënosh edhe pagesë të pjesshme.'}
        </p>

        {error && <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">{error}</div>}

        <button
          onClick={() => onConfirm(numeric)}
          disabled={loading || numeric <= 0 || tooMuch}
          className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>Konfirmo {formatEuro(numeric)}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Kartela kryesore e Dashboard-it: bilanci neto + borxhet me secilin shok + "Laje borxhin"
export default function BalanceSettlement({
  balance = {},
  settlements = [],
  currentUserId,
  householdId,
  onChanged,
  onDownloadReport,
  onError
}) {
  const [activeRow, setActiveRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [undoingId, setUndoingId] = useState(null);

  const breakdown = balance.breakdown || [];
  const net = Number(balance.netAmount || 0);
  const settled = breakdown.length === 0;
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
      onChanged?.('Pagesa u regjistrua për gjithë banesën.');
    } catch (err) {
      setModalError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUndo = async (id) => {
    try {
      setUndoingId(id);
      await expenseApi.deleteSettlement(id);
      onChanged?.('Pagesa u anulua.');
    } catch (err) {
      onError?.(err.message);
    } finally {
      setUndoingId(null);
    }
  };

  // Teksti dhe ngjyra e bilancit neto
  const headline = settled
    ? { text: 'Je i barazuar me të gjithë', color: 'text-slate-900' }
    : net > 0
      ? { text: 'Në total të kanë borxh', color: 'text-emerald-600' }
      : net < 0
        ? { text: 'Në total ke borxh', color: 'text-rose-600' }
        : { text: 'Borxhet anulojnë njëri-tjetrin', color: 'text-slate-900' };

  return (
    <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-4" aria-labelledby="balance-title">
      {/* Bilanci neto: përgjigjja e pyetjes "a i kam borxh dikujt?" */}
      <p id="balance-title" className="text-sm text-slate-500">{headline.text}</p>
      <p className={`text-4xl font-extrabold tracking-tight mt-0.5 ${headline.color}`}>
        {settled ? <CheckCircle2 className="w-9 h-9 text-emerald-500 inline -mt-1" /> : formatEuro(Math.abs(net))}
      </p>

      {/* Borxhet me secilin shok */}
      {!settled && (
        <ul className="mt-4 space-y-2">
          {breakdown.map((row) => {
            const iOwe = row.type === 'user_owes';
            return (
              <li key={row.userId} className="flex items-center justify-between py-1">
                <div className="flex items-center min-w-0 mr-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold mr-3 shrink-0">
                    {initials(row.name)}
                  </div>
                  {/* Dy rreshta që shuma të mos pritet kurrë */}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{row.name}</p>
                    <p className={`text-xs ${iOwe ? 'text-rose-600' : 'text-emerald-600'}`}>{iOwe ? 'Ti i ke borxh' : 'Të ka borxh'}</p>
                    <p className={`text-base font-bold leading-tight ${iOwe ? 'text-rose-600' : 'text-emerald-600'}`}>{formatEuro(row.amount)}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setModalError(null);
                    setActiveRow(row);
                  }}
                  className={`shrink-0 flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                    iOwe ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                  }`}
                >
                  <HandCoins className="w-4 h-4" />
                  <span>{iOwe ? 'Laje borxhin' : 'Shëno të marrë'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Pagesat e fundit */}
      {recent.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 mb-2">Pagesat e fundit</p>
          <ul className="space-y-1.5">
            {recent.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 truncate mr-2">
                  {s.from_user === currentUserId ? 'Ti' : s.from_name.split(' ')[0]} → {s.to_user === currentUserId ? 'ty' : s.to_name.split(' ')[0]}
                  <span className="text-slate-500"> · {formatDate(s.created_at)}</span>
                </span>
                <span className="flex items-center space-x-2 shrink-0">
                  <span className="font-semibold text-slate-900">{formatEuro(s.amount)}</span>
                  {s.created_by === currentUserId && (
                    <button
                      onClick={() => handleUndo(s.id)}
                      disabled={undoingId === s.id}
                      title="Anulo pagesën"
                      aria-label="Anulo pagesën"
                      className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 cursor-pointer"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={onDownloadReport}
        className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center space-x-1.5 cursor-pointer"
      >
        <Download className="w-4 h-4" />
        <span>Raporti i plotë i banesës (PDF)</span>
      </button>

      {activeRow && (
        <SettleModal row={activeRow} loading={saving} error={modalError} onClose={() => setActiveRow(null)} onConfirm={handleConfirm} />
      )}
    </section>
  );
}
