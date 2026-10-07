import React from 'react';
import { Wallet, Calendar, ArrowDownCircle, ArrowUpCircle, CheckCircle2, TrendingUp, TrendingDown, Scale, Download } from 'lucide-react';

export default function SummaryCard({ monthlyTotal = 0, settlement = {}, onDownloadReport }) {
  const netBalance = Number(settlement.netAmount ?? settlement.netBalance ?? 0);
  const isOwed = netBalance >= 0.01;
  const owes = netBalance <= -0.01;
  const isSettled = !isOwed && !owes;

  // Caktimi i ngjyrave për Barazimin e Banesës (E gjelbër / E kuqe)
  let balanceBg = 'bg-emerald-50 border-emerald-200 text-emerald-900';
  let balanceTextColor = 'text-emerald-700';
  let balanceAmountColor = 'text-emerald-600';
  let BalanceIcon = ArrowDownCircle;
  let balanceTitle = 'Të tjerët të detyrohen';

  if (owes) {
    balanceBg = 'bg-rose-50 border-rose-200 text-rose-900';
    balanceTextColor = 'text-rose-700';
    balanceAmountColor = 'text-rose-600';
    BalanceIcon = ArrowUpCircle;
    balanceTitle = 'I detyrohesh banesës';
  } else if (isSettled) {
    balanceBg = 'bg-slate-50 border-slate-200 text-slate-900';
    balanceTextColor = 'text-slate-700';
    balanceAmountColor = 'text-slate-600';
    BalanceIcon = CheckCircle2;
    balanceTitle = 'Llogari të barazuara';
  }

  return (
    <div className="space-y-3 mb-5">
      {/* 1. Kartela: Totali i Shpenzuar këtë Muaj */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-3xl p-5 text-white shadow-lg shadow-indigo-500/20">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">
              Totali i Shpenzuar këtë Muaj
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight">
              {Number(monthlyTotal).toFixed(2)} €
            </h2>
          </div>
          <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/10">
            <Wallet className="w-6 h-6 text-white" />
          </div>
        </div>

        <div className="flex items-center mt-3 pt-3 border-t border-white/10 text-xs text-indigo-100">
          <Calendar className="w-3.5 h-3.5 mr-1.5 opacity-80" />
          <span>Muaji aktual (personale + të përbashkëta, nga xhepi yt)</span>
        </div>
      </div>

      {/* 2. Kartela: Barazimi i Banesës (Detyrimi / Krediti) */}
      <div className={`rounded-3xl p-5 border ${balanceBg} shadow-sm transition-all`}>
        <div className="flex justify-between items-center">
          <div className="flex-1 mr-3">
            <div className="flex items-center space-x-1.5 mb-1">
              <BalanceIcon className={`w-4 h-4 ${balanceTextColor}`} />
              <span className={`text-xs font-bold uppercase tracking-wider ${balanceTextColor}`}>
                Barazimi i Banesës
              </span>
            </div>

            <div className={`text-2xl font-black ${balanceAmountColor}`}>
              {Math.abs(netBalance).toFixed(2)} €
            </div>

            <p className={`text-xs mt-1 font-medium ${balanceTextColor}`}>
              {settlement.message || (isSettled ? '0.00 € - Gjithçka është në rregull' : balanceTitle)}
            </p>
          </div>

          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              isOwed ? 'bg-emerald-100 text-emerald-600' : owes ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {isOwed ? (
              <TrendingUp className="w-6 h-6" />
            ) : owes ? (
              <TrendingDown className="w-6 h-6" />
            ) : (
              <Scale className="w-6 h-6" />
            )}
          </div>
        </div>

        {/* Butoni për Shkarkimin e Raportit të Barazimit */}
        <div className="mt-3 pt-3 border-t border-black/5 flex justify-between items-center">
          <span className="text-[11px] text-slate-500 font-medium">Raporti i plotë i banesës</span>
          <button
            onClick={onDownloadReport}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white border border-slate-200 text-xs font-bold text-slate-800 shadow-xs transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Shkarko Barazimin</span>
          </button>
        </div>
      </div>
    </div>
  );
}
