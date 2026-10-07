import React from 'react';
import { AlertTriangle, Info, DoorOpen } from 'lucide-react';

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
  if (!isOpen) return null;
  const { Icon, iconBox, button } = TONES[tone] || TONES.info;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={loading ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${iconBox}`}>
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 text-center mb-2">{title}</h3>
        <div className="text-xs text-slate-500 text-center mb-5 leading-relaxed">{children}</div>

        <div className="flex space-x-2">
          {onConfirm ? (
            <>
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${button}`}
              >
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : confirmLabel}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer ${button}`}
            >
              Në rregull
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
