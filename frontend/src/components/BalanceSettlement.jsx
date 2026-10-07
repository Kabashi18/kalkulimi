import React, { useState } from 'react';
import { Scale, ArrowUpCircle, ArrowDownCircle, CheckCircle2, HandCoins, Download, X, Undo2, ArrowRight } from 'lucide-react';
import { expenseApi } from '../api/expenseApi';

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('sq-AL', { day: '2-digit', month: 'short' });

// Modali i konfirmimit të pagesës ("Laje Borxhin")
function SettleModal({ row, onClose, onConfirm, loading, error }) {
  const [amount, setAmount] = useState(row.amount.toFixed(2));
  const iPay = row.type === 'user_owes';
  const numeric = parseFloat(amount) || 0;
  const tooMuch = numeric > row.amount + 0.001;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-base font-black text-slate-800">
              {iPay ? 'Laje Borxhin' : 'Shëno Pagesën e Marrë'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {iPay
                ? `Konfirmo që ia ke kthyer paratë ${row.name}.`
                : `Konfirmo që ${row.name} t'i ka kthyer paratë.`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-center space-x-3 py-3 mb-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-bold">
          <span className="text-rose-600">{iPay ? 'Ti' : row.name}</span>
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <span className="text-emerald-600">{iPay ? row.name : 'Ty'}</span>
        </div>

        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
          Shuma e paguar (€)
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">€</span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max={row.amount}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl pl-10 pr-4 py-3 text-xl font-bold text-slate-900 outline-none"
          />
        </div>
        <p className={`text-[11px] mt-1.5 ${tooMuch ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
          {tooMuch
            ? `Shuma nuk mund të jetë më e madhe se borxhi (${row.amount.toFixed(2)} €).`
            : 'Mund të shënosh edhe pagesë të pjesshme.'}
        </p>

        {error && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">{error}</div>
        )}

        <button
          onClick={() => onConfirm(numeric)}
          disabled={loading || numeric <= 0 || tooMuch}
          className="w-full mt-5 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>Konfirmo {numeric.toFixed(2)} €</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function BalanceSettlement({
  balance = {},
  settlements = [],
  currentUserId,
  householdId,
  onChanged,
  onDownloadReport
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
      onChanged?.('Pagesa u regjistrua! Borxhi u përditësua për të gjithë banesën.');
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
      alert(err.message);
    } finally {
      setUndoingId(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 mb-5">
      {/* Titulli + Bilanci neto */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center space-x-1.5 mb-1">
            <Scale className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Kush i ka borxh kujt</span>
          </div>
          <p className="text-[11px] text-slate-400">Përditësohet në kohë reale për gjithë banesën</p>
        </div>
        <div className="text-right">
          <div
            className={`text-lg font-black ${
              net > 0 ? 'text-emerald-600' : net < 0 ? 'text-rose-600' : 'text-slate-500'
            }`}
          >
            {net > 0 ? '+' : net < 0 ? '−' : ''}
            {Math.abs(net).toFixed(2)} €
          </div>
          <span className="text-[10px] font-semibold text-slate-400 uppercase">Bilanci neto</span>
        </div>
      </div>

      {/* Lista e borxheve dypalëshe */}
      {breakdown.length === 0 ? (
        <div className="py-5 text-center bg-slate-50 rounded-2xl border border-slate-100">
          <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
          <p className="text-sm font-bold text-slate-700">Jeni të barazuar me të gjithë!</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Askush nuk ka borxh askujt.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {breakdown.map((row) => {
            const iOwe = row.type === 'user_owes';
            return (
              <div
                key={row.userId}
                className={`flex items-center justify-between p-3 rounded-2xl border ${
                  iOwe ? 'bg-rose-50/60 border-rose-200' : 'bg-emerald-50/60 border-emerald-200'
                }`}
              >
                <div className="flex items-center min-w-0 mr-2">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black mr-2.5 shrink-0 ${
                      iOwe ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {initials(row.name)}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold truncate ${iOwe ? 'text-rose-900' : 'text-emerald-900'}`}>
                      {iOwe ? (
                        <>Ti i ke borxh <strong>{row.name}</strong></>
                      ) : (
                        <><strong>{row.name}</strong> të ka borxh</>
                      )}
                    </p>
                    <div className="flex items-center space-x-1">
                      {iOwe ? (
                        <ArrowUpCircle className="w-3.5 h-3.5 text-rose-500" />
                      ) : (
                        <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                      <span className={`text-base font-black ${iOwe ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {row.amount.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setModalError(null);
                    setActiveRow(row);
                  }}
                  className={`shrink-0 flex items-center space-x-1 px-3 py-2 rounded-xl text-[11px] font-bold shadow-sm transition-all active:scale-95 cursor-pointer ${
                    iOwe
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300'
                  }`}
                >
                  <HandCoins className="w-3.5 h-3.5" />
                  <span>{iOwe ? 'Laje Borxhin' : 'Shëno të marrë'}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagesat e fundit */}
      {recent.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Pagesat e fundit</p>
          <div className="space-y-1.5">
            {recent.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 truncate mr-2">
                  <strong className="text-slate-800">{s.from_user === currentUserId ? 'Ti' : s.from_name}</strong>
                  {' → '}
                  <strong className="text-slate-800">{s.to_user === currentUserId ? 'ty' : s.to_name}</strong>
                  <span className="text-slate-400"> · {formatDate(s.created_at)}</span>
                </span>
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="font-bold text-slate-800">{s.amount.toFixed(2)} €</span>
                  {s.created_by === currentUserId && (
                    <button
                      onClick={() => handleUndo(s.id)}
                      disabled={undoingId === s.id}
                      title="Anulo pagesën"
                      className="text-slate-400 hover:text-rose-600 disabled:opacity-40 cursor-pointer"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raporti PDF */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
        <span className="text-[11px] text-slate-500 font-medium">Raporti i plotë i banesës</span>
        <button
          onClick={onDownloadReport}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-indigo-600" />
          <span>Shkarko Barazimin</span>
        </button>
      </div>

      {activeRow && (
        <SettleModal
          row={activeRow}
          loading={saving}
          error={modalError}
          onClose={() => setActiveRow(null)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
