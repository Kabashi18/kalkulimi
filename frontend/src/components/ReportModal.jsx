import React, { useState, useEffect } from 'react';
import { X, Download, Printer, FileText, CheckCircle2, ArrowRight, Users, Euro } from 'lucide-react';
import { expenseApi } from '../api/expenseApi';
import { generatePdfReport } from '../utils/generatePdfReport';
import { formatEuro } from '../utils/balances';

export default function ReportModal({ isOpen, onClose, household }) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [group, setGroup] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadReport();
    }
  }, [isOpen, household?.id]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await expenseApi.getGroupReport(household);
      setReport(res.report);
      setGroup(res.group);
    } catch (err) {
      setError('Dështoi ngarkimi i raportit të grupit.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    if (report) {
      generatePdfReport(report, group?.name || 'Banesa');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Raporti i Barazimit</h2>
              <p className="text-xs text-slate-500">{group?.name || 'Banesa'} • {report?.month || 'Muaji Aktual'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading ? (
            <div className="py-12 text-center">
              <div className="inline-block w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 mt-2 font-medium">Duke përgatitur raportin...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs">
              {error}
            </div>
          ) : report ? (
            <>
              {/* 1. Statistikat Kryesore */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 text-center">
                  <span className="text-xs font-bold text-indigo-600 uppercase block mb-0.5">
                    Totali Faturave
                  </span>
                  <span className="text-base font-black text-indigo-900">
                    {formatEuro(report.totalAmount)}
                  </span>
                </div>

                <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3 text-center">
                  <span className="text-xs font-bold text-purple-600 uppercase block mb-0.5">
                    Anëtarë
                  </span>
                  <span className="text-base font-black text-purple-900">
                    {report.memberCount} vetë
                  </span>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-center">
                  <span className="text-xs font-bold text-emerald-600 uppercase block mb-0.5">
                    Pjesa për person
                  </span>
                  <span className="text-base font-black text-emerald-900">
                    {formatEuro(report.perPersonAverage)}
                  </span>
                </div>
              </div>

              {/* 2. Zgjidhja e Borxheve: Kush i detyrohet kujt? */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-1.5" />
                  Kush duhet t'i japë kujt dhe sa:
                </h4>

                {report.settlements.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    Të gjitha llogaritë mes anëtarëve janë plotësisht të barazuara!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {report.settlements.map((s, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2 font-medium text-slate-800">
                          <span className="font-bold text-rose-600">{s.from}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-bold text-emerald-600">{s.to}</span>
                        </div>
                        <span className="font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-lg">
                          {formatEuro(s.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Tabela e Pagesave Individuale */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Sa ka paguar secili anëtar:
                </h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Anëtari</th>
                        <th className="py-2.5 px-2 text-right">Ka Paguar</th>
                        <th className="py-2.5 px-2 text-right">Pjesa</th>
                        <th className="py-2.5 px-3 text-right">Bilanci</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {report.members.map((m) => (
                        <tr key={m.userId} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{m.name}</td>
                          <td className="py-2.5 px-2 text-right text-slate-600">{formatEuro(m.paid)}</td>
                          <td className="py-2.5 px-2 text-right text-slate-600">{formatEuro(m.owed)}</td>
                          <td
                            className={`py-2.5 px-3 text-right font-bold ${
                              m.netBalance > 0
                                ? 'text-emerald-600'
                                : m.netBalance < 0
                                ? 'text-rose-600'
                                : 'text-slate-500'
                            }`}
                          >
                            {formatEuro(m.netBalance, { sign: true })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer (Buttons) */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
          >
            Mbyll
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={loading || !report}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm shadow-indigo-500/25 transition-all active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Shkarko në PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
