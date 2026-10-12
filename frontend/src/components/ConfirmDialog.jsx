import React from 'react';
import { AlertTriangle, Info, DoorOpen } from 'lucide-react';
import Modal from './Modal';

const TONES = {
  danger: { Icon: AlertTriangle, iconBox: 'bg-rose-100 text-rose-600', button: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30' },
  warning: { Icon: AlertTriangle, iconBox: 'bg-amber-100 text-amber-600', button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30' },
  info: { Icon: Info, iconBox: 'bg-indigo-100 text-indigo-600', button: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30' },
  leave: { Icon: DoorOpen, iconBox: 'bg-rose-100 text-rose-600', button: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30' }
};

/**
 * Modal i përgjithshëm konfirmimi / njoftimi (zëvendëson window.confirm dhe alert).
 * Pa `onConfirm` shfaqet vetëm butoni "Në rregull".
 */
export default function ConfirmDialog({
  isOpen,
  title,
  children,
  tone = 'info',
  confirmLabel = 'Konfirmo',
  cancelLabel = 'Anulo',
  onConfirm,
  onClose,
  loading = false
}) {
  const { Icon, iconBox, button } = TONES[tone] || TONES.info;

  return (
    <Modal isOpen={isOpen} onClose={onClose} locked={loading} labelledBy="confirm-title" className="p-6 overflow-y-auto">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${iconBox}`}>
          <Icon className="w-6 h-6" />
        </div>
        <h3 id="confirm-title" className="text-xl font-extrabold text-slate-900 text-center mb-2">{title}</h3>
        <div className="text-sm text-slate-500 text-center mb-6 leading-relaxed">{children}</div>

        <div className="flex gap-3">
          {onConfirm ? (
            <>
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 text-sm font-bold text-slate-700 transition-colors cursor-pointer"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 py-3 rounded-2xl text-white text-sm font-bold flex items-center justify-center shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${button}`}
              >
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : confirmLabel}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className={`flex-1 py-3 rounded-2xl text-white text-sm font-bold shadow-sm transition-all active:scale-95 cursor-pointer ${button}`}
            >
              Në rregull
            </button>
          )}
        </div>
    </Modal>
  );
}
