import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, Wallet, CheckCircle2, ArrowRight } from 'lucide-react';
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

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
    if (successMessage) setSuccessBanner(successMessage);
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
    <div className="w-full max-w-md mx-auto my-auto">
      {/* Karta Profesionale e Login-it */}
      <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-xl sm:shadow-2xl border border-slate-100 transition-all duration-200">
        
        {/* Header & Logo */}
        <div className="text-center mb-7">
          <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 mb-4">
            <Wallet className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Mirësevini përsëri
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 font-medium leading-relaxed">
            Menaxhoni faturat dhe barazimin e banesës lehtësisht
          </p>
        </div>

        {/* Njoftim Suksesi (p.sh. pas krijimit të llogarisë) */}
        {successBanner && (
          <div className="p-3.5 mb-5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-start space-x-2.5 animate-in fade-in zoom-in-95 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{successBanner}</span>
          </div>
        )}

        {/* Njoftim Gabimi */}
        {errorMsg && (
          <div className="p-3.5 mb-5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium animate-in fade-in zoom-in-95 duration-200">
            {errorMsg}
          </div>
        )}

        {/* Formulari i Kyçjes */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fusha e Email-it */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Adresa
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="artan@example.com"
                required
                className="w-full bg-slate-50/60 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200"
              />
            </div>
          </div>

          {/* Fusha e Fjalëkalimit */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Fjalëkalimi
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="••••••••"
                required
                className="w-full bg-slate-50/60 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl pl-10 pr-11 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                title={showPassword ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Butoni Kryesor i Kyçjes */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 text-sm transition-all duration-200 flex items-center justify-center space-x-2 group cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Kyçu në Llogari</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Lidhja për Regjistrim */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Nuk keni ende një llogari?{' '}
            <button
              onClick={onNavigateToRegister}
              className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline transition-colors ml-1 cursor-pointer"
            >
              Krijo llogari të re
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
