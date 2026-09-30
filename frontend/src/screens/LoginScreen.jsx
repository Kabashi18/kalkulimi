import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { authApi } from '../api/authApi';

export default function LoginScreen({ 
  onLoginSuccess, 
  onNavigateToRegister, 
  initialEmail = '', 
  successMessage = null 
}) {
  const [email, setEmail] = useState(initialEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successBanner, setSuccessBanner] = useState(successMessage);

  // Nëse ndryshon initialEmail ose successMessage nga jashtë (p.sh. pas regjistrimit)
  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
    if (successMessage) {
      setSuccessBanner(successMessage);
    }
  }, [initialEmail, successMessage]);

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

      if (onLoginSuccess) {
        onLoginSuccess(res.user, res.token);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Email-i ose fjalëkalimi nuk është i saktë.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 justify-between p-6">
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-3xl mx-auto flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 mb-3">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Mirësevini</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Kyçuni për të menaxhuar faturat dhe barazimin e banesës
          </p>
        </div>

        {/* Mesazhi i Suksesit (p.sh. pas krijimit të llogarisë) */}
        {successBanner && (
          <div className="p-3.5 mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-start space-x-2.5 animate-in fade-in zoom-in-95 duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{successBanner}</span>
          </div>
        )}

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
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="artan@example.com"
                required
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
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="••••••••"
                required
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

          {/* Butoni i Kyçjes */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold py-3 rounded-2xl shadow-lg shadow-indigo-500/25 text-sm transition-all flex items-center justify-center space-x-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span>Kyçu në Llogari</span>
            )}
          </button>
        </form>

        {/* Lidhja për Regjistrim */}
        <div className="text-center mt-6">
          <p className="text-xs text-slate-500">
            Nuk keni ende një llogari?{' '}
            <button
              onClick={onNavigateToRegister}
              className="text-indigo-600 font-bold hover:underline"
            >
              Krijo llogari të re
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
