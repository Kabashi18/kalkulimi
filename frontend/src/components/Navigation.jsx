import React from 'react';
import { Home, Plus, Settings } from 'lucide-react';

// Shiriti i poshtëm (stil Facebook): Dashboard · "+" Shto (në mes, portokalli) · Cilësimet.
// Qëndron gjithmonë në fund të ekranit: përmbajtja lëviz sipër tij (shih App.jsx / DashboardScreen).
// Sfond gjysmë-i tejdukshëm me blur, cepa të rrumbullakosura sipër, hije e lehtë dhe
// një vijë e vogël mbi tab-in aktiv.
function Tab({ isActive, onClick, Icon, label }) {
  return (
    <button
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={`relative flex flex-col items-center justify-center h-16 text-xs font-semibold cursor-pointer transition-colors ${
        isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      {/* Treguesi i tab-it aktiv (si te Facebook) */}
      <span
        aria-hidden="true"
        className={`absolute top-0 h-[3px] w-10 rounded-b-full bg-indigo-600 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}
      />
      <Icon className="w-6 h-6 mb-0.5" strokeWidth={isActive ? 2.5 : 2} />
      <span>{label}</span>
    </button>
  );
}

// `hidden`: gjatë scroll-it në mes të faqes shiriti largohet poshtë (bashkë me butonin "+" të ngritur)
// dhe rishfaqet në krye ose në fund të faqes (shih DashboardScreen).
function Navigation({ active, onNavigate, onAdd, hidden = false }) {
  return (
    <nav
      className={`absolute bottom-0 inset-x-0 z-30 transition-all duration-300 ease-out ${
        hidden ? 'translate-y-[calc(100%+2.5rem)] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
      }`}
      aria-label="Navigimi kryesor"
      aria-hidden={hidden || undefined}
      /* inert: butonat e fshehur nuk marrin fokus me tastierë */
      inert={hidden ? '' : undefined}
    >
      <div className="grid grid-cols-3 items-end rounded-t-3xl border-t border-slate-200/70 bg-white/85 backdrop-blur-xl shadow-[0_-6px_24px_rgba(15,23,42,0.08)] pb-[env(safe-area-inset-bottom)]">
        <Tab isActive={active === 'home'} onClick={() => onNavigate('home')} Icon={Home} label="Dashboard" />

        {/* Butoni kryesor: ngrihet mbi shirit që të arrihet lehtë me gishtin e madh */}
        <div className="flex flex-col items-center h-16 justify-end pb-2">
          <button
            onClick={onAdd}
            className="-mt-7 w-14 h-14 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/40 ring-4 ring-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            aria-label="Shto shpenzim"
          >
            <Plus className="w-7 h-7" strokeWidth={2.75} />
          </button>
          <span className="text-xs font-semibold text-slate-500 mt-1" aria-hidden="true">
            Shto
          </span>
        </div>

        <Tab isActive={active === 'settings'} onClick={() => onNavigate('settings')} Icon={Settings} label="Cilësimet" />
      </div>
    </nav>
  );
}

export default React.memo(Navigation);
