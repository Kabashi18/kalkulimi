import React, { useEffect } from 'react';

/**
 * Mbështjellësi i përbashkët i modaleve: sfond i errët transparent me blur, mbyllje me Escape
 * ose klik jashtë, dhe bllokim i lëvizjes së faqes poshtë. Në celular hapet si "sheet" nga poshtë
 * (me dorezë dhe hapësirë për shiritin e iPhone-it); animacionet çaktivizohen me "reduce motion".
 * Ngjyrat vijnë nga variablat e temës, prandaj funksionon njësoj në temën e çelët dhe të errët.
 */
export default function Modal({ isOpen, onClose, labelledBy, size = 'sm', locked = false, className = '', children }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && !locked && onClose?.();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, locked, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 motion-safe:animate-fade-in"
      onClick={locked ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`relative bg-white w-full ${size === 'lg' ? 'sm:max-w-lg' : 'sm:max-w-sm'} max-h-[92vh] sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 motion-safe:animate-sheet-up sm:motion-safe:animate-pop-in ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Doreza e "sheet"-it, si te aplikacionet native (vetëm në celular) */}
        <div className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-300" aria-hidden="true" />
        {children}
        {/* Hapësira për shiritin e iPhone-it; e veçantë që të mos mbishkruajë padding-un e modalit */}
        <div className="sm:hidden h-[env(safe-area-inset-bottom)]" aria-hidden="true" />
      </div>
    </div>
  );
}
