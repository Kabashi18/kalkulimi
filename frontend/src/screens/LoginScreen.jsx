import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, ArrowRight, ShieldCheck } from 'lucide-react';
import { authApi, authStorage } from '../api/authApi';

export default function LoginScreen({ onLoginSuccess, onNavigateToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg('Ju lutem plotësoni email-in dhe fjalëkalimin.');
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.login({
        email: email.trim(),
        password
      });

      // Ruajmë të dhënat në localStorage
      authStorage.setToken(res.token);
      authStorage.setUser(res.user);

      if (onLoginSuccess) {
        onLoginSuccess(res.user, res.token);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Email ose fjalëkalimi është i pasaktë.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 justify-between p-6">
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-3xl mx-auto flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Mirësevini</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Kyçuni për të menaxhuar faturat dhe barazimin e banesës
          </p>
        </div>

        {/* Mesazhi i gabimit */}
        {errorMsg && (
          <div className="p-3.5 mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium animate-in fade-in zoom-in-95 duration-150">
            {errorMsg}
          </div>
        )}

        {/* Formulari i Kyçjes */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Email Adresa
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="artan@example.com"
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-800 outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Fjalëkalimi
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-2xl pl-11 pr-11 py-3 text-sm text-slate-800 outline-none transition-all shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-60 mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Kyçu në Llogari</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer Switch to Register */}
      <div className="text-center pt-4 border-t border-slate-200/60">
        <p className="text-xs text-slate-500">
          Nuk keni llogari ende?{' '}
          <button
            onClick={onNavigateToRegister}
            className="text-indigo-600 font-bold hover:underline inline-flex items-center"
          >
            <span>Regjistrohu këtu</span>
            <ArrowRight className="w-3 h-3 ml-1" />
          </button>
        </p>
      </div>
    </div>
  );
}
