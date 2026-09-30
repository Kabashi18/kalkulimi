import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { PieChart as PieIcon, BarChart2 } from 'lucide-react';

const CATEGORY_COLORS = {
  'Rrymë': '#f59e0b',
  'Banesë': '#6366f1',
  'Qira': '#6366f1',
  'Qiraja': '#6366f1',
  'Ushqim': '#10b981',
  'Internet': '#0ea5e9',
  'Internet / TV': '#0ea5e9',
  'Ujë': '#3b82f6',
  'Pastrim': '#ec4899',
  'Të tjera': '#94a3b8',
  'Të Përgjithshme': '#8b5cf6',
};

const DEFAULT_COLOR = '#6366f1';

export default function CategoryChart({ categoryData = [] }) {
  const [chartType, setChartType] = useState('pie'); // 'pie' ose 'bar'

  // Përgatitja e të dhënave me 'total' dhe fallback te 'amount'
  const formattedData = (categoryData || [])
    .map((item) => ({
      name: item.category || 'Të tjera',
      value: Number(item.total !== undefined ? item.total : (item.amount || 0)),
      percentage: Number(item.percentage || 0),
      color: CATEGORY_COLORS[item.category] || DEFAULT_COLOR,
    }))
    .filter((item) => item.value > 0);

  const totalSum = formattedData.reduce((acc, curr) => acc + curr.value, 0);

  if (formattedData.length === 0 || totalSum === 0) {
    return (
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-5 text-center">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
          Struktura e Shpenzimeve
        </h3>
        <p className="text-xs text-slate-400 py-6">Nuk ka të dhëna për këtë muaj</p>
      </div>
    );
  }

  // Custom Tooltip për të shfaqur të dhënat në mënyrë të qartë
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl border border-slate-700">
          <p className="font-bold">{data.name}</p>
          <p className="text-indigo-300 font-semibold">
            {Number(data.value).toFixed(2)} € ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-5">
      {/* Header i grafikut me ndërrues Pie / Bar */}
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Struktura e Shpenzimeve
          </h3>
          <p className="text-[11px] text-slate-400">Ku shkuan paratë sipas kategorive</p>
        </div>

        <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setChartType('pie')}
            className={`p-1.5 rounded-lg transition-all ${
              chartType === 'pie'
                ? 'bg-white text-indigo-600 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Grafik Rrethor (Pie)"
          >
            <PieIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`p-1.5 rounded-lg transition-all ${
              chartType === 'bar'
                ? 'bg-white text-indigo-600 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Grafik me Shtylla (Bar)"
          >
            <BarChart2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Zona e vizualizimit të grafikut */}
      <div className="h-52 w-full flex items-center justify-center my-1 relative">
        {chartType === 'pie' ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Pie
                data={formattedData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                animationDuration={600}
              >
                {formattedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {formattedData.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legjenda e kategorive me përqindje */}
      <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-100">
        {formattedData.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs bg-slate-50/60 p-1.5 rounded-xl">
            <div className="flex items-center space-x-2 truncate mr-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-slate-700 font-medium truncate">{item.name}</span>
            </div>
            <span className="font-bold text-slate-800 shrink-0">
              {item.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
