import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatEuro, monthLabel } from '../utils/balances';

// Kartela e muajit: zgjedhësi ◀ muaji ▶ + sa ke paguar nga xhepi (personale + të përbashkëta).
// Borxhet (gjithmonë totale) shfaqen te BalanceSettlement.
export default function SummaryCard({ month, monthlyTotal = 0, isCurrentMonth = true, onPrev, onNext, onToday }) {
  const navButton =
    'w-9 h-9 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-default';

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between">
        <button onClick={onPrev} className={navButton} aria-label="Muaji i kaluar">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-900">{monthLabel(month)}</p>
          {!isCurrentMonth && (
            <button onClick={onToday} className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer">
              Kthehu te muaji aktual
            </button>
          )}
        </div>
        <button onClick={onNext} disabled={isCurrentMonth} className={navButton} aria-label="Muaji tjetër">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-baseline justify-between">
        <span className="text-sm text-slate-500">Paguar nga xhepi yt</span>
        <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{formatEuro(monthlyTotal)}</span>
      </div>
      <p className="text-xs text-slate-500 mt-0.5 text-right">personale + të përbashkëta që i pagove ti</p>
    </div>
  );
}
