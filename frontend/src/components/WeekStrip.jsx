import React from 'react';

// Shiriti i 7 ditëve të fundit (si kalendari javor te dizajni referues):
// dita e zgjedhur është pilulë e errët; pika sipër tregon që atë ditë ka shpenzime.
const WEEKDAYS_SHORT = ['Die', 'Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht'];

export const sameDay = (a, b) =>
  !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// Ditët nga 6 ditë më parë deri sot
export const lastSevenDays = (now = new Date()) =>
  Array.from({ length: 7 }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i)));

function WeekStrip({ days, selected, onSelect, hasExpenses }) {
  return (
    <div className="grid grid-cols-7 gap-1 mb-6" role="group" aria-label="Ditët e javës">
      {days.map((d) => {
        const active = sameDay(d, selected);
        const dot = hasExpenses(d);
        return (
          <button
            key={d.getTime()}
            onClick={() => onSelect(d)}
            aria-pressed={active}
            className={`flex flex-col items-center py-2 rounded-full border transition-colors cursor-pointer ${
              active ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 hover:bg-slate-100'
            }`}
          >
            {/* Pika: ka shpenzime atë ditë (hapësira mbahet edhe pa pikë që ditët të jenë njësoj) */}
            <span className={`w-1 h-1 rounded-full mb-1 ${dot ? (active ? 'bg-white' : 'bg-slate-900') : ''}`} />
            <span className={`text-xs ${active ? 'font-semibold' : 'text-slate-500'}`}>{WEEKDAYS_SHORT[d.getDay()]}</span>
            <span className={`text-sm font-bold mt-0.5 ${active ? '' : 'text-slate-900'}`}>{d.getDate()}</span>
          </button>
        );
      })}
    </div>
  );
}

export default React.memo(WeekStrip);
