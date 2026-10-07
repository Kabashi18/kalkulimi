import React from 'react';
import { Wallet, Calendar } from 'lucide-react';

// Kartela: Totali i shpenzuar nga xhepi këtë muaj (personale + të përbashkëta).
// Barazimi i borxheve shfaqet te BalanceSettlement.
export default function SummaryCard({ monthlyTotal = 0 }) {
  return (
    <div className="mb-4">
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
    </div>
  );
}
