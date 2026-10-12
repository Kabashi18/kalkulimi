import React, { useEffect } from 'react';

/**
 * Mbështjellësi i përbashkët i modaleve: sfond i errët transparent me blur, mbyllje me Escape
 * ose klik jashtë, dhe bllokim i lëvizjes së faqes poshtë. Në celular hapet si "sheet" nga poshtë.
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
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={locked ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`bg-white w-full ${size === 'lg' ? 'max-w-lg' : 'max-w-sm'} max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
