import React, { useState } from 'react';
import { Mail, KeyRound, ArrowLeft, CheckCircle2, ArrowRight } from 'lucide-react';
import { authApi } from '../api/authApi';

// Hapi 1 i rivendosjes: dërgon lidhjen në email. Lidhja hap këtë faqe web te ResetPasswordScreen.
export default function ForgotPasswordScreen({ initialEmail = '', onBack }) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      setLoading(true);
      await authApi.requestPasswordReset(email, window.location.origin);
      setSent(true);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto my-auto">
      <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-xl sm:shadow-2xl border border-slate-100">
        <div className="text-center mb-7">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 mb-4">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Keni harruar fjalëkalimin?</h1>
          <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">
            Shkruani email-in dhe do t'ju dërgojmë një lidhje për të vendosur fjalëkalim të ri
          </p>
        </div>

        {sent ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              Nëse ekziston një llogari me <strong>{email.trim().toLowerCase()}</strong>, sapo ju dërguam një email.
              Hapni lidhjen në të (kontrolloni edhe Spam) për të vendosur fjalëkalimin e ri.
            </span>
          </div>
        ) : (
          <>
            {errorMsg && (
              <div className="p-3.5 mb-5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium">{errorMsg}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Adresa</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="artan@example.com"
                    required
                    autoFocus
                    className="w-full bg-slate-50/60 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-md shadow-indigo-500/20 text-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Dërgo lidhjen</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <button
            onClick={onBack}
            className="text-xs text-indigo-600 font-bold hover:underline inline-flex items-center space-x-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kthehu te kyçja</span>
          </button>
        </div>
      </div>
    </div>
  );
}
