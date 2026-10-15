import React, { useEffect, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';

/**
 * Fotoja e faturës në madhësi të plotë (lightbox): sfond i zi, mbyllje me Escape, me klik jashtë
 * fotos ose me butonin ×. URL-ja është e përkohshme (signed URL, skadon pas 1 ore).
 */
export default function ReceiptViewer({ url, title, onClose }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!url) return undefined;
    setLoaded(false);
    setFailed(false);
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [url, onClose]);

  if (!url) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title ? `Fatura: ${title}` : 'Fatura'}
      className="fixed inset-0 z-[60] bg-black/90 flex flex-col motion-safe:animate-fade-in"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white/90" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-semibold truncate mr-3">{title ? `Fatura · ${title}` : 'Fatura'}</p>
        <div className="flex items-center gap-1 shrink-0">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center"
            aria-label="Hap foton në një skedë të re"
            title="Hap në skedë të re"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center cursor-pointer"
            aria-label="Mbyll"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center p-3 sm:p-6">
        {!loaded && !failed && <div className="w-8 h-8 border-2 border-white/80 border-t-transparent rounded-full animate-spin" aria-label="Duke ngarkuar" />}
        {failed && <p className="text-sm text-white/80">Fotoja nuk mund të ngarkohet. Rifreskoni faqen dhe provoni sërish.</p>}
        <img
          src={url}
          alt={title ? `Fatura e shpenzimit ${title}` : 'Fatura'}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          onClick={(e) => e.stopPropagation()}
          className={`max-w-full max-h-full object-contain rounded-lg shadow-2xl ${loaded ? '' : 'hidden'}`}
        />
      </div>
    </div>
  );
}
