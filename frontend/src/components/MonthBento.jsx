import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatEuro, monthLabel } from '../utils/balances';
import { getCategoryDetails } from './ExpenseItem';
import Avatar from './Avatar';

// Rrjeta "bento" e muajit (si "Your plan" te dizajni referues):
//   majtas  (portokalli, e lartë): sa ke paguar nga xhepi këtë muaj + ndërrimi i muajit
//   djathtas lart (blu):           kategoria kryesore e muajit
//   djathtas poshtë (rozë):        anëtarët e banesës -> hap Cilësimet
// Kartelat pastel kanë ngjyra të fiksuara dhe tekst të errët edhe në temën e errët.
const INK = 'text-[#0f172a]';
const INK_SOFT = 'text-[#475569]';
const CHIP = 'bg-[#ffffff]/60';

const Chip = ({ children }) => <span className={`self-start px-2.5 py-1 rounded-full text-xs font-semibold ${CHIP} ${INK}`}>{children}</span>;

function MonthBento({ month, monthlyTotal, isCurrentMonth, onPrev, onNext, onToday, topCategory, members = [], avatarOf = {}, onMembers }) {
  const cat = topCategory ? getCategoryDetails(topCategory.category) : null;
  const navButton = `w-7 h-7 rounded-full flex items-center justify-center ${CHIP} ${INK} hover:bg-[#ffffff]/90 disabled:opacity-40 disabled:hover:bg-[#ffffff]/60 cursor-pointer disabled:cursor-default`;

  return (
    <div className="grid grid-cols-2 gap-3 mb-6 h-[210px]">
      {/* Muaji: totali nga xhepi */}
      <div className="rounded-[28px] bg-[#fdba74] p-4 flex flex-col justify-between min-w-0">
        <div className="flex items-center justify-between">
          <Chip>{isCurrentMonth ? 'Ky muaj' : 'Muaj i kaluar'}</Chip>
          <div className="flex space-x-1">
            <button onClick={onPrev} className={navButton} aria-label="Muaji i kaluar">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={onNext} disabled={isCurrentMonth} className={navButton} aria-label="Muaji tjetër">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="min-w-0">
          <p className={`text-lg font-bold ${INK}`}>{monthLabel(month)}</p>
          <p className={`text-xs mt-1 ${INK_SOFT}`}>Paguar nga xhepi yt</p>
          <p className={`text-[26px] leading-tight font-black tracking-tight truncate ${INK}`}>{formatEuro(monthlyTotal)}</p>
        </div>

        {isCurrentMonth ? (
          <p className={`text-xs ${INK_SOFT}`}>personale + të përbashkëta</p>
        ) : (
          <button onClick={onToday} className={`self-start text-xs font-bold underline cursor-pointer ${INK}`}>
            Kthehu te muaji aktual
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 min-w-0">
        {/* Kategoria kryesore */}
        <div className="relative flex-1 rounded-[28px] bg-[#bfdbfe] p-4 overflow-hidden flex flex-col">
          <Chip>Kryesore</Chip>
          {cat ? (
            <>
              <p className={`relative text-base font-bold mt-2 truncate ${INK}`}>{topCategory.category}</p>
              <p className={`relative text-xs ${INK_SOFT}`}>{topCategory.percentage}% e muajit</p>
              <cat.Icon aria-hidden="true" className="absolute -right-2 -bottom-3 w-16 h-16 text-[#1d4ed8] opacity-80" strokeWidth={1.75} />
            </>
          ) : (
            <p className={`text-xs mt-2 ${INK_SOFT}`}>Asnjë shpenzim këtë muaj</p>
          )}
        </div>

        {/* Anëtarët */}
        <button
          onClick={onMembers}
          className="h-16 shrink-0 rounded-[28px] bg-[#f5b3ee] hover:bg-[#f0a2e8] px-4 flex items-center justify-center cursor-pointer"
          aria-label={`Anëtarët e banesës (${members.length})`}
        >
          {members.slice(0, 4).map((m, i) => (
            <span key={m.id} className={`rounded-full ring-2 ring-[#f5b3ee] ${i > 0 ? '-ml-2' : ''}`}>
              <Avatar name={m.name} url={avatarOf[m.id]} className="w-9 h-9 text-[11px] font-extrabold" tone="bg-[#ffffff] text-[#0f172a]" />
            </span>
          ))}
          {members.length > 4 && <span className={`text-xs font-bold ml-1.5 ${INK}`}>+{members.length - 4}</span>}
        </button>
      </div>
    </div>
  );
}

export default React.memo(MonthBento);
