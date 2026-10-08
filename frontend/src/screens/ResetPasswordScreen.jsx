import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { authApi } from '../api/authApi';

// Hapi 2 i rivendosjes: shfaqet kur përdoruesi hap lidhjen nga email-i (ngjarja PASSWORD_RECOVERY)
export default function ResetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    if (password !== confirm) {
      setErrorMsg('Fjalëkalimet nuk përputhen.');
      return;
    }
    try {
      setLoading(true);
      await authApi.updatePassword(password);
      onDone();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full bg-slate-50/60 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl pl-10 pr-11 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all';

  return (
    <div className="w-full max-w-md mx-auto my-auto">
      <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-xl sm:shadow-2xl border border-slate-100">
        <div className="text-center mb-7">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 mb-4">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Vendos fjalëkalimin e ri</h1>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">Së paku 6 karaktere</p>
        </div>

        {errorMsg && (
          <div className="p-3.5 mb-5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium">{errorMsg}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Fjalëkalimi i ri', value: password, set: setPassword },
            { label: 'Përsërit fjalëkalimin', value: confirm, set: setConfirm }
          ].map((f, i) => (
            <div key={f.label}>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">{f.label}</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={show ? 'text' : 'password'}
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  required
                  minLength={6}
                  autoFocus={i === 0}
                  autoComplete="new-password"
                  className={inputClass}
                />
                {i === 0 && (
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-600"
                    title={show ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'}
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-md shadow-indigo-500/20 text-sm transition-all flex items-center justify-center disabled:opacity-60 cursor-pointer"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Ruaj fjalëkalimin'}
          </button>
        </form>
      </div>
    </div>
  );
}
