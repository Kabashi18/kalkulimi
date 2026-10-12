import React, { useState } from 'react';
import { CheckCircle2, HandCoins, Download, X, Undo2, ArrowRight } from 'lucide-react';
import { expenseApi } from '../api/expenseApi';
import Modal from './Modal';
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
  const invalid = numeric <= 0 || tooMuch;

  return (
    <Modal isOpen onClose={onClose} locked={loading} labelledBy="settle-title" className="p-6 overflow-y-auto">
      <div className="flex justify-between items-start mb-5">
        <div className="min-w-0">
          <h3 id="settle-title" className="text-2xl font-extrabold tracking-tight text-slate-900">
            {iPay ? 'Laje Borxhin' : 'Shëno pagesën e marrë'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {iPay ? `Konfirmo që ia ke kthyer paratë ${row.name}.` : `Konfirmo që ${row.name} t'i ka kthyer paratë.`}
          </p>
        </div>
        <button
          onClick={onClose}
          disabled={loading}
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer shrink-0 ml-3"
          aria-label="Mbyll"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-center space-x-3 py-3 mb-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold">
        <span className="text-slate-900 truncate">{iPay ? 'Ti' : row.name}</span>
        <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
        <span className="text-slate-900 truncate">{iPay ? row.name : 'Ty'}</span>
      </div>

      {/* Fusha e shumës: elementi kryesor i modalit */}
      <label htmlFor="settle-amount" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
        Shuma e paguar
      </label>
      <div
        className={`relative rounded-2xl border-2 transition-colors ${
          tooMuch ? 'border-rose-400 bg-rose-50' : 'border-orange-300 bg-orange-50 focus-within:border-orange-500'
        }`}
      >
        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-500">€</span>
        <input
          id="settle-amount"
          type="number"
          step="0.01"
          min="0.01"
          max={row.amount}
          inputMode="decimal"
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !invalid && !loading && onConfirm(numeric)}
          className="w-full bg-transparent pl-12 pr-4 py-4 text-3xl font-extrabold text-slate-900 outline-none"
        />
      </div>
      <p className={`text-xs mt-2 ${tooMuch ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
        {tooMuch ? `Shuma nuk mund të jetë më e madhe se borxhi (${formatEuro(row.amount)}).` : `Borxhi total: ${formatEuro(row.amount)} · mund të paguash edhe pjesërisht.`}
      </p>

      {error && <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">{error}</div>}

      <div className="grid grid-cols-2 gap-3 mt-6">
        <button
          onClick={onClose}
          disabled={loading}
          className="py-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 text-sm font-bold text-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          Anulo
        </button>
        <button
          onClick={() => onConfirm(numeric)}
          disabled={loading || invalid}
          className="py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold flex items-center justify-center space-x-2 shadow-md shadow-orange-500/30 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>{iPay ? 'Paguaj' : 'Konfirmo'}</span>
            </>
          )}
        </button>
      </div>
    </Modal>
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

  // Borxhi kryesor: më i madhi që ti ua ke të tjerëve; përndryshe më i madhi që të kanë ty
  const byAmount = (a, b) => b.amount - a.amount;
  const primary = breakdown.filter((r) => r.type === 'user_owes').sort(byAmount)[0] || [...breakdown].sort(byAmount)[0] || null;
  const others = breakdown.filter((r) => r !== primary);
  const primaryOwes = primary?.type === 'user_owes';

  const openSettle = (row) => {
    setModalError(null);
    setActiveRow(row);
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-md shadow-slate-900/5 p-5 mb-4" aria-labelledby="balance-title">
      {/* Borxhi kryesor: përgjigjja e pyetjes "a i kam borxh dikujt?" */}
      {!primary ? (
        <div className="flex items-center space-x-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 shrink-0" />
          <div>
            <p id="balance-title" className="text-lg font-bold text-slate-900">Je i barazuar me të gjithë</p>
            <p className="text-sm text-slate-500">Nuk ke borxhe të hapura.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center min-w-0">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-sm font-bold mr-3 shrink-0">
              {initials(primary.name)}
            </div>
            <p id="balance-title" className="text-base font-semibold text-slate-600 min-w-0">
              {primaryOwes ? 'Ti i ke borxh ' : ''}
              <span className="text-slate-900 font-bold break-words">{primary.name}</span>
              {primaryOwes ? ':' : ' të ka borxh:'}
            </p>
          </div>
          <p className={`text-4xl sm:text-5xl font-extrabold tracking-tight mt-3 break-words ${primaryOwes ? 'text-rose-600' : 'text-emerald-600'}`}>
            {formatEuro(primary.amount)}
          </p>
          <button
            onClick={() => openSettle(primary)}
            className={`w-full mt-4 py-3.5 rounded-2xl font-bold text-base flex items-center justify-center space-x-2 transition-all active:scale-[0.98] cursor-pointer ${
              primaryOwes
                ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/30'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            <HandCoins className="w-5 h-5" />
            <span>{primaryOwes ? 'Laje Borxhin' : 'Shëno të marrë'}</span>
          </button>
          {net !== 0 && others.length > 0 && (
            <p className="text-xs text-slate-500 mt-3">
              Bilanci neto me të gjithë:{' '}
              <span className={`font-semibold ${net < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {net < 0 ? 'ke borxh ' : 'të kanë borxh '}
                {formatEuro(Math.abs(net))}
              </span>
            </p>
          )}
        </>
      )}

      {/* Borxhet e tjera me shokët */}
      {others.length > 0 && (
        <ul className="mt-4 pt-3 border-t border-slate-100 space-y-2">
          {others.map((row) => {
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
                    <p className={`text-sm font-bold leading-tight ${iOwe ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {iOwe ? 'i ke ' : 'të ka '}
                      {formatEuro(row.amount)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => openSettle(row)}
                  className={`shrink-0 flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                    iOwe ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                  }`}
                >
                  <HandCoins className="w-4 h-4" />
                  <span>{iOwe ? 'Laje Borxhin' : 'Shëno të marrë'}</span>
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
