import React from 'react';
import { Home, Plus, Settings } from 'lucide-react';

// Shiriti i poshtëm lundrues: sfond i bardhë me kornizë të hollë dhe hije të butë, cepa të rrumbullakosura.
// Ikonat janë line-art: gri (slate-500) kur janë joaktive, ngjyra e markës ("Petrol") për faqen aktuale,
// me një pikë të vogël poshtë. Ngjyrat vijnë nga tema (theme.css), ndaj në temën e errët shiriti
// bëhet automatikisht navy dhe theksi cyan.
// Butoni "Shto" në mes: rreth me gradient portokalli, i ngritur mbi shirit (CTA).
const ACTIVE = 'text-indigo-600';
const INACTIVE = 'text-slate-500 hover:text-slate-800';

function Tab({ isActive, onClick, Icon, label }) {
  return (
    <button
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      aria-label={label}
      title={label}
      className={`relative flex flex-col items-center justify-center h-16 transition-colors cursor-pointer ${isActive ? ACTIVE : INACTIVE}`}
    >
      <Icon
        className="w-6 h-6"
        strokeWidth={isActive ? 2.25 : 1.75}
      />
      <span className="text-[10px] font-semibold mt-1 tracking-wide">{label}</span>
      {/* Treguesi i faqes aktive */}
      <span
        aria-hidden="true"
        className={`absolute bottom-1.5 w-1 h-1 rounded-full bg-indigo-600 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}
      />
    </button>
  );
}

// `hidden`: gjatë scroll-it në mes të faqes shiriti largohet poshtë dhe rishfaqet
// në krye ose në fund të faqes (shih DashboardScreen).
function Navigation({ active, onNavigate, onAdd, hidden = false }) {
  return (
    <nav
      className={`absolute bottom-0 inset-x-0 z-30 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pointer-events-none transition-all duration-300 ease-out ${
        hidden ? 'translate-y-[calc(100%+2rem)] opacity-0' : 'translate-y-0 opacity-100'
      }`}
      aria-label="Navigimi kryesor"
      aria-hidden={hidden || undefined}
      /* inert: butonat e fshehur nuk marrin fokus me tastierë */
      inert={hidden ? '' : undefined}
    >
      <div
        className={`grid grid-cols-3 items-center rounded-[28px] bg-white ring-1 ring-slate-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.08),0_2px_6px_rgba(15,23,42,0.04)] ${
          hidden ? '' : 'pointer-events-auto'
        }`}
      >
        <Tab isActive={active === 'home'} onClick={() => onNavigate('home')} Icon={Home} label="Dashboard" />

        {/* Butoni kryesor: i ngritur mbi shirit; unaza me ngjyrën e shiritit e "pret" nga ai */}
        <div className="flex justify-center">
          <button
            onClick={onAdd}
            className="-mt-9 w-[62px] h-[62px] rounded-full bg-gradient-to-br from-[#fb923c] to-[#ea580c] text-[#ffffff] ring-[6px] ring-white shadow-[0_8px_20px_rgba(249,115,22,0.4)] hover:shadow-[0_8px_26px_rgba(249,115,22,0.55)] hover:brightness-105 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            aria-label="Shto shpenzim"
            title="Shto shpenzim"
          >
            <Plus className="w-7 h-7" strokeWidth={2.75} />
          </button>
        </div>

        <Tab isActive={active === 'settings'} onClick={() => onNavigate('settings')} Icon={Settings} label="Cilësimet" />
      </div>
    </nav>
  );
}

export default React.memo(Navigation);
