import React, { useState } from 'react';
import { CheckCircle2, HandCoins, Download, X, Undo2, ArrowRight } from 'lucide-react';
import { expenseApi } from '../api/expenseApi';
import Modal from './Modal';
import Avatar from './Avatar';
import { formatDateSq, formatEuro } from '../utils/balances';

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

// Ngjyrat e kartelës "hero" janë të fiksuara (jo variablat e temës): sfond lavandë me tekst të errët
// edhe në temën e errët, si kartelat pastel të dizajnit referues.
const INK = 'text-[#0f172a]';
const INK_SOFT = 'text-[#3b3363]';
const GREEN = 'text-[#047857]';
const RED = 'text-[#be123c]';
const AVATAR_TONES = ['bg-[#fde68a] text-[#0f172a]', 'bg-[#a7f3d0] text-[#0f172a]', 'bg-[#fbcfe8] text-[#0f172a]'];

// Forma dekorative në cep (si objektet 3D te dizajni referues): unaza dhe "cilindra" të mbivendosur
function HeroShapes() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute -top-7 -right-3.5 w-[150px] h-[130px]">
      <span className="absolute top-1.5 right-5 w-[74px] h-[74px] rounded-full border-[18px] border-[#fb923c]" />
      <span className="absolute top-[42px] right-[62px] w-[58px] h-[46px] rounded-2xl bg-[#334155] -rotate-[18deg]" />
      <span className="absolute top-[70px] right-1.5 w-[50px] h-[50px] rounded-full border-[12px] border-[#facc15]" />
      <span className="absolute top-[58px] right-[34px] w-[44px] h-[52px] rounded-[14px] bg-[#a8a29e] rotate-12" />
    </div>
  );
}

// Kartela kryesore "hero" e Dashboard-it: bilanci neto + borxhet me secilin shok + "Laje borxhin"
function BalanceSettlement({
  avatarOf = {},
  members = [],
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

  const headline = settled
    ? { text: 'Je i barazuar me të gjithë', color: INK }
    : net > 0
      ? { text: 'Në total të kanë borxh', color: GREEN }
      : net < 0
        ? { text: 'Në total ke borxh', color: RED }
        : { text: 'Borxhet anulojnë njëri-tjetrin', color: INK };

  // Shokët e banesës si avatarë të mbivendosur (+N)
  const others = members.filter((m) => m.id !== currentUserId);
  const shown = others.slice(0, 3);
  const extra = others.length - shown.length;

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

  // Borxhi më i madh që ti ua ke të tjerëve del i pari, pastaj ata që të kanë ty
  const rows = [...breakdown].sort((x, y) => (x.type === y.type ? y.amount - x.amount : x.type === 'user_owes' ? -1 : 1));

  const openSettle = (row) => {
    setModalError(null);
    setActiveRow(row);
  };

  return (
    <section className="relative overflow-hidden rounded-[28px] bg-[#bcaaf9] p-5 mb-5" aria-labelledby="balance-title">
      <HeroShapes />

      <h2 id="balance-title" className={`relative text-[30px] leading-[32px] font-black tracking-tight ${INK}`}>
        Bilanci
        <br />
        yt
      </h2>
      <p className={`relative text-xs font-semibold mt-1.5 ${INK_SOFT}`}>{headline.text}</p>

      <div className="relative flex items-end justify-between mt-3">
        {settled ? (
          <CheckCircle2 className={`w-10 h-10 ${INK}`} />
        ) : (
          <p className={`text-[34px] leading-none font-black tracking-tight ${headline.color}`}>{formatEuro(Math.abs(net))}</p>
        )}

        {shown.length > 0 && (
          <div className="flex items-center mb-0.5">
            {shown.map((m, i) => (
              <span key={m.id} className={`rounded-full ring-2 ring-[#bcaaf9] ${i > 0 ? '-ml-2.5' : ''}`} title={m.name}>
                <Avatar name={m.name} url={avatarOf[m.id]} className="w-8 h-8 text-[11px] font-extrabold" tone={AVATAR_TONES[i % AVATAR_TONES.length]} />
              </span>
            ))}
            {extra > 0 && (
              <span className="-ml-2.5 w-8 h-8 rounded-full ring-2 ring-[#bcaaf9] bg-[#6d5bd0] text-[#ffffff] text-[11px] font-extrabold flex items-center justify-center">
                +{extra}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Borxhet me secilin shok */}
      {!settled && (
        <ul className="relative mt-4 rounded-2xl bg-[#ffffff]/55 p-3 space-y-3">
          {rows.map((row) => {
            const iOwe = row.type === 'user_owes';
            return (
              <li key={row.userId} className="flex items-center justify-between">
                <div className="flex items-center min-w-0 mr-3">
                  <div className="mr-3">
                    <Avatar name={row.name} url={avatarOf[row.userId]} className="w-9 h-9 text-xs font-extrabold" tone="bg-[#ffffff] text-[#0f172a]" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate ${INK}`}>{row.name}</p>
                    <p className={`text-xs font-bold ${iOwe ? RED : GREEN}`}>
                      {iOwe ? 'Ti i ke ' : 'Të ka '}
                      {formatEuro(row.amount)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => openSettle(row)}
                  className={`shrink-0 flex items-center space-x-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                    iOwe ? 'bg-[#0f172a] text-[#ffffff] hover:bg-[#1e293b]' : 'bg-[#ffffff] text-[#0f172a] hover:bg-[#f1f5f9]'
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
        <div className="relative mt-4">
          <p className={`text-xs font-bold mb-1.5 ${INK_SOFT}`}>Pagesat e fundit</p>
          <ul className="space-y-1">
            {recent.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-sm">
                <span className={`truncate mr-2 ${INK_SOFT}`}>
                  {s.from_user === currentUserId ? 'Ti' : s.from_name.split(' ')[0]} → {s.to_user === currentUserId ? 'ty' : s.to_name.split(' ')[0]}
                  <span className="opacity-70"> · {formatDate(s.created_at)}</span>
                </span>
                <span className="flex items-center space-x-2 shrink-0">
                  <span className={`font-bold ${INK}`}>{formatEuro(s.amount)}</span>
                  {s.created_by === currentUserId && (
                    <button
                      onClick={() => handleUndo(s.id)}
                      disabled={undoingId === s.id}
                      title="Anulo pagesën"
                      aria-label="Anulo pagesën"
                      className={`w-7 h-7 rounded-full flex items-center justify-center hover:bg-[#ffffff]/60 disabled:opacity-40 cursor-pointer ${INK_SOFT}`}
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
        className={`relative mt-4 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#ffffff]/55 hover:bg-[#ffffff]/75 text-xs font-bold cursor-pointer ${INK}`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>Raporti i plotë (PDF)</span>
      </button>

      {activeRow && (
        <SettleModal row={activeRow} loading={saving} error={modalError} onClose={() => setActiveRow(null)} onConfirm={handleConfirm} />
      )}
    </section>
  );
}

export default React.memo(BalanceSettlement);
