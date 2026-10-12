import React from 'react';
import { Home, Plus, Settings } from 'lucide-react';

// Tab bar i poshtëm: Dashboard · "+" Shto (në mes, portokalli) · Cilësimet
export default function Navigation({ active, onNavigate, onAdd }) {
  const tabClass = (isActive) =>
    `flex flex-col items-center justify-center pt-2.5 pb-3 text-xs font-semibold cursor-pointer transition-colors ${
      isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
    }`;

  return (
    <nav
      className="absolute bottom-0 inset-x-0 z-20 bg-white border-t border-slate-100 grid grid-cols-3 items-end pb-[env(safe-area-inset-bottom)]"
      aria-label="Navigimi kryesor"
    >
      <button onClick={() => onNavigate('home')} aria-current={active === 'home' ? 'page' : undefined} className={tabClass(active === 'home')}>
        <Home className="w-5 h-5 mb-0.5" strokeWidth={active === 'home' ? 2.5 : 2} />
        <span>Dashboard</span>
      </button>

      {/* Butoni kryesor: ngrihet mbi shirit që të arrihet lehtë me gishtin e madh */}
      <div className="flex flex-col items-center pb-3">
        <button
          onClick={onAdd}
          className="-mt-6 w-14 h-14 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/40 ring-4 ring-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
          aria-label="Shto shpenzim"
        >
          <Plus className="w-7 h-7" strokeWidth={2.75} />
        </button>
        <span className="text-xs font-semibold text-slate-500 mt-0.5" aria-hidden="true">
          Shto
        </span>
      </div>

      <button
        onClick={() => onNavigate('settings')}
        aria-current={active === 'settings' ? 'page' : undefined}
        className={tabClass(active === 'settings')}
      >
        <Settings className="w-5 h-5 mb-0.5" strokeWidth={active === 'settings' ? 2.5 : 2} />
        <span>Cilësimet</span>
      </button>
    </nav>
  );
}
