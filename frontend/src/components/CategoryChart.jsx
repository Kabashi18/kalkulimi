import React from 'react';
import { formatEuro } from '../utils/balances';

// Ngjyrat e kategorive (të njëjtat si ikonat në listë)
const CATEGORY_COLORS = {
  'Rrymë': '#f59e0b',
  'Banesë': '#6366f1',
  'Qira': '#6366f1',
  'Ushqim': '#10b981',
  'Internet': '#0ea5e9',
  'Ujë': '#3b82f6',
  'Pastrim': '#ec4899',
  'Të tjera': '#94a3b8'
};
const DEFAULT_COLOR = '#94a3b8';

// Shirita horizontalë: krahasohen më lehtë se një pie chart dhe shuma lexohet direkt
export default function CategoryChart({ categoryData = [] }) {
  const rows = (categoryData || [])
    .map((item) => ({
      name: item.category || 'Të tjera',
      value: Number(item.total ?? item.amount ?? 0),
      percentage: Number(item.percentage || 0),
      color: CATEGORY_COLORS[item.category] || DEFAULT_COLOR
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  if (rows.length === 0) return null;
  const max = rows[0].value;

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-4">
      <h2 className="text-base font-bold text-slate-900">Sipas kategorive</h2>
      <p className="text-xs text-slate-500 mb-4">Të gjitha shpenzimet e dukshme të muajit</p>

      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.name}>
            <div className="flex justify-between items-baseline text-sm mb-1">
              <span className="font-medium text-slate-700">{r.name}</span>
              <span className="font-semibold text-slate-900">
                {formatEuro(r.value)} <span className="text-xs font-normal text-slate-400">· {r.percentage}%</span>
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden" aria-hidden="true">
              <div className="h-full rounded-full" style={{ width: `${Math.max(3, (r.value / max) * 100)}%`, backgroundColor: r.color }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
