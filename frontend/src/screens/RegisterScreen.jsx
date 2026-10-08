import React, { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, UserPlus, ArrowRight, KeyRound } from 'lucide-react';
import { authApi } from '../api/authApi';

export default function RegisterScreen({ onRegisterSuccess, onNavigateToLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [householdCode, setHouseholdCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Ju lutem vendosni emrin dhe mbiemrin tuaj.');
      return;
    }

    if (!email.trim()) {
      setErrorMsg('Ju lutem vendosni email-in.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Fjalëkalimi duhet të ketë të paktën 6 karaktere.');
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.register({
        name: name.trim(),
        email: email.trim(),
        password,
        household_code: householdCode
      });

      // Pa konfirmim email-i, Supabase e kyç përdoruesin direkt (App e kap ndryshimin e sesionit)
      if (!res.needsConfirmation) return;

      if (onRegisterSuccess) {
        onRegisterSuccess({
          email: email.trim(),
          message: res.message || 'Llogaria u krijua me sukses! Ju lutem kyçuni me fjalëkalimin tuaj.'
        });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Dështoi regjistrimi i llogarisë.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto my-auto">
      {/* Karta Profesionale e Regjistrimit */}
      <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-xl sm:shadow-2xl border border-slate-100 transition-all duration-200">
        
        {/* Header & Logo */}
        <div className="text-center mb-7">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 mb-4">
            <UserPlus className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Krijo Llogari të Re
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">
            Bashkohu me banorët për të ndarë shpenzimet e banesës
          </p>
        </div>

        {/* Njoftim Gabimi */}
        {errorMsg && (
          <div className="p-3.5 mb-5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium animate-in fade-in zoom-in-95 duration-200">
            {errorMsg}
          </div>
        )}

        {/* Formulari i Regjistrimit */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fusha e Emrit */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Emri dhe Mbiemri
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User className="w-4 h-4 text-slate-500" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="psh. Artan Berisha"
                required
                className="w-full bg-slate-50/60 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200"
              />
            </div>
          </div>

          {/* Fusha e Email-it */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Adresa
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail className="w-4 h-4 text-slate-500" />
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
                <Lock className="w-4 h-4 text-slate-500" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Së paku 6 karaktere"
                required
                className="w-full bg-slate-50/60 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl pl-10 pr-11 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-600 transition-colors"
                title={showPassword ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Kodi i Banesës (opsional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Kodi i Banesës <span className="normal-case font-medium text-slate-500">(opsional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <KeyRound className="w-4 h-4 text-slate-500" />
              </div>
              <input
                type="text"
                value={householdCode}
                onChange={(e) => {
                  setHouseholdCode(e.target.value.toUpperCase());
                  setErrorMsg(null);
                }}
                placeholder="psh. BANESA-1234"
                autoCapitalize="characters"
                className="w-full bg-slate-50/60 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 tracking-wider"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Nëse një shok ju ka dhënë kodin, do të bashkoheni direkt me banesën e tij.
            </p>
          </div>

          {/* Butoni Kryesor i Regjistrimit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 text-sm transition-all duration-200 flex items-center justify-center space-x-2 group cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Krijo Llogarinë</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Lidhja për Kyçje */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Keni tashmë një llogari?{' '}
            <button
              onClick={onNavigateToLogin}
              className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline transition-colors ml-1 cursor-pointer"
            >
              Kyçu këtu
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
