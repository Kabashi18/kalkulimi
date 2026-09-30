import React, { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, UserPlus, ArrowLeft } from 'lucide-react';
import { authApi } from '../api/authApi';

export default function RegisterScreen({ onRegisterSuccess, onNavigateToLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      setErrorMsg('Fjalëkalimi duhet të ketë së paku 6 karaktere.');
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.register({
        name: name.trim(),
        email: email.trim(),
        password,
        group_id: 1 // Lidhet me grupin e banesës
      });

      // Nuk e kyçim automatikisht, por e dërgojmë te Login me email-in e plotësuar dhe mesazh suksesi
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
    <div className="flex flex-col h-full bg-slate-50 justify-between p-6">
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-white shadow-lg shadow-purple-500/30 mb-3">
            <UserPlus className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Krijo Llogari</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Bashkohu me banorët për të ndarë shpenzimet
          </p>
        </div>

        {/* Mesazhi i gabimit */}
        {errorMsg && (
          <div className="p-3.5 mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium animate-in fade-in zoom-in-95 duration-150">
            {errorMsg}
          </div>
        )}

        {/* Formulari i Regjistrimit */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Emri */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Emri dhe Mbiemri
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="psh. Artan Berisha"
                required
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-2xl pl-11 pr-4 py-2.5 text-sm text-slate-800 outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Email Adresa
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="artan@example.com"
                required
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-2xl pl-11 pr-4 py-2.5 text-sm text-slate-800 outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Fjalëkalimi */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Fjalëkalimi
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Së paku 6 karaktere"
                required
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-2xl pl-11 pr-11 py-2.5 text-sm text-slate-800 outline-none transition-all shadow-sm"
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

          {/* Butoni i Regjistrimit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-[0.99] text-white font-bold py-3 rounded-2xl shadow-lg shadow-indigo-500/20 text-sm transition-all flex items-center justify-center space-x-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span>Krijo Llogarinë</span>
            )}
          </button>
        </form>

        {/* Ridrejtimi te Login */}
        <div className="text-center mt-5">
          <p className="text-xs text-slate-500">
            Keni tashmë një llogari?{' '}
            <button
              onClick={onNavigateToLogin}
              className="text-indigo-600 font-bold hover:underline"
            >
              Kyçu këtu
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
