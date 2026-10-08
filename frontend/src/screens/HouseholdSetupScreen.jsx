import React, { useState } from 'react';
import { Home, KeyRound, Plus, ArrowRight, LogOut } from 'lucide-react';
import { householdApi } from '../api/householdApi';

// Shfaqet pas kyçjes kur përdoruesi nuk bën ende pjesë në asnjë banesë
export default function HouseholdSetupScreen({ userName, error = null, onDone, onLogout }) {
  const [mode, setMode] = useState('join'); // 'join' | 'create'
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(error);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      setLoading(true);
      if (mode === 'join') {
        await householdApi.joinHousehold(code);
      } else {
        await householdApi.createHousehold(name);
      }
      await onDone();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full bg-slate-50/60 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200';

  return (
    <div className="w-full max-w-md mx-auto my-auto">
      <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-xl sm:shadow-2xl border border-slate-100">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 mb-4">
            <Home className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Mirë se erdhe, {userName?.split(' ')?.[0]}!
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 font-medium leading-relaxed">
            Bashkohu me banesën e shokëve ose krijo një të re për të ndarë shpenzimet
          </p>
        </div>

        {/* Zgjedhja: Bashkohu / Krijo */}
        <div className="grid grid-cols-2 p-1 bg-slate-200/70 rounded-2xl gap-1 mb-5">
          {[
            { id: 'join', label: 'Kam një kod', Icon: KeyRound },
            { id: 'create', label: 'Krijo banesë', Icon: Plus }
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setMode(id);
                setErrorMsg(null);
              }}
              className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                mode === id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {errorMsg && (
          <div className="p-3.5 mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'join' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Kodi i Banesës
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="BANESA-1234"
                  autoCapitalize="characters"
                  required
                  className={`${inputClass} tracking-widest font-bold`}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Kërkojani kodin shokut që e ka krijuar banesën (e gjen te Dashboard-i i tij).
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Emri i Banesës
              </label>
              <div className="relative">
                <Home className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="psh. Banesa në Qendër"
                  maxLength={80}
                  className={inputClass}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Do të marrësh një kod unik (p.sh. BANESA-4821) për t'ua dhënë shokëve.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl shadow-md shadow-indigo-500/20 text-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>{mode === 'join' ? 'Bashkohu me Banesën' : 'Krijo Banesën'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <button
            onClick={onLogout}
            className="text-xs text-slate-500 hover:text-rose-600 font-semibold inline-flex items-center space-x-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Dil nga llogaria</span>
          </button>
        </div>
      </div>
    </div>
  );
}
