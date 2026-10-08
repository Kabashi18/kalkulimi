import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { formatEuro } from '../utils/balances';

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, expense, loading }) {
  if (!isOpen || !expense) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-slate-900 text-center mb-1">
          A jeni i sigurt?
        </h3>
        
        <p className="text-xs text-slate-500 text-center mb-4 leading-relaxed">
          Po fshini shpenzimin <strong className="text-slate-800 font-semibold">"{expense.title}"</strong> me vlerë prej <strong className="text-slate-900 font-bold">{formatEuro(expense.total_amount)}</strong>. Ky veprim nuk mund të kthehet prapa.
        </p>

        <div className="flex space-x-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
          >
            Anulo
          </button>
          
          <button
            onClick={() => onConfirm(expense.id)}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center space-x-1 shadow-sm shadow-rose-600/30 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Fshij</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
