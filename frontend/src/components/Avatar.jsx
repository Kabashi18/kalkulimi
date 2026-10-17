import React, { useState, useEffect } from 'react';

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

/**
 * Fotoja e profilit; nëse mungon ose nuk ngarkohet, shfaqen inicialet e emrit.
 * `className` jep madhësinë dhe tekstin (p.sh. "w-10 h-10 text-sm"); `tone` ngjyrën e inicialeve.
 */
export default function Avatar({ name, url, className = 'w-10 h-10 text-sm', tone = 'bg-slate-100 text-slate-700' }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);

  if (url && !broken) {
    return <img src={url} alt={name || ''} onError={() => setBroken(true)} className={`${className} rounded-full object-cover shrink-0 bg-slate-100`} />;
  }
  return (
    <div className={`${className} ${tone} rounded-full flex items-center justify-center font-bold shrink-0`} aria-hidden="true">
      {initials(name)}
    </div>
  );
}
