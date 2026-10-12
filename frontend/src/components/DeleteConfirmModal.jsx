import React from 'react';
import { Trash2 } from 'lucide-react';
import Modal from './Modal';
import { formatEuro } from '../utils/balances';

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, expense, loading }) {
  if (!isOpen || !expense) return null;

  return (
    <Modal isOpen onClose={onClose} locked={loading} labelledBy="delete-title" className="p-6 overflow-y-auto">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6" />
        </div>

        <h3 id="delete-title" className="text-xl font-extrabold text-slate-900 text-center mb-2">
          A jeni i sigurt?
        </h3>
        
        <p className="text-sm text-slate-500 text-center mb-6 leading-relaxed">
          Po fshini shpenzimin <strong className="text-slate-800 font-semibold">"{expense.title}"</strong> me vlerë prej <strong className="text-slate-900 font-bold">{formatEuro(expense.total_amount)}</strong>. Ky veprim nuk mund të kthehet prapa.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 text-sm font-bold text-slate-700 transition-colors cursor-pointer"
          >
            Anulo
          </button>
          
          <button
            onClick={() => onConfirm(expense.id)}
            disabled={loading}
            className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold flex items-center justify-center space-x-1 shadow-sm shadow-rose-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
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
    </Modal>
  );
}
