import React, { useState, useRef, useEffect } from 'react';
import { Zap, Home, Utensils, Wifi, Droplets, Receipt, Sparkles, MoreVertical, Edit2, Trash2 } from 'lucide-react';

const getCategoryDetails = (category = '') => {
  const cat = category.toLowerCase();

  if (cat.includes('rrym') || cat.includes('energji') || cat.includes('drita')) {
    return { Icon: Zap, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' };
  }
  if (cat.includes('qira') || cat.includes('banes')) {
    return { Icon: Home, color: 'text-indigo-600', bg: 'bg-indigo-100', border: 'border-indigo-200' };
  }
  if (cat.includes('ushqim') || cat.includes('market') || cat.includes('dreka') || cat.includes('kafe')) {
    return { Icon: Utensils, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200' };
  }
  if (cat.includes('internet') || cat.includes('wifi') || cat.includes('tv')) {
    return { Icon: Wifi, color: 'text-sky-600', bg: 'bg-sky-100', border: 'border-sky-200' };
  }
  if (cat.includes('uj') || cat.includes('ujësjellës')) {
    return { Icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' };
  }
  if (cat.includes('pastrim') || cat.includes('mirmbajtje')) {
    return { Icon: Sparkles, color: 'text-pink-600', bg: 'bg-pink-100', border: 'border-pink-200' };
  }

  return { Icon: Receipt, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' };
};

export default function ExpenseItem({ expense, currentUserId = 1, onEdit, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const { Icon, color, bg, border } = getCategoryDetails(expense.category);
  const isPayer = expense.paid_by_user_id === currentUserId || expense.is_payer === 1;
  const isShared = expense.group_id !== null;

  // Mbylle menunë nëse klikohet jashtë
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formattedDate = expense.created_at
    ? new Date(expense.created_at).toLocaleDateString('sq-AL', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div className="relative flex items-center justify-between p-3.5 mb-2.5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-slate-200 transition-all">
      {/* Pjesa e majtë: Ikona & Detajet */}
      <div className="flex items-center flex-1 mr-2 min-w-0">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center mr-3 border shrink-0 ${bg} ${border}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-slate-800 truncate">
            {expense.title}
          </h4>
          <div className="flex items-center mt-0.5 flex-wrap gap-1.5">
            <span className="text-[10px] text-slate-400">{formattedDate}</span>
            {isShared ? (
              <span className="bg-purple-50 text-purple-700 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border border-purple-200">
                Banesë
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-600 text-[9px] font-medium px-1.5 py-0.5 rounded-full border border-slate-200">
                Personal
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pjesa e mesme: Shuma */}
      <div className="text-right shrink-0 mr-2">
        <div className="text-sm font-bold text-slate-900">
          {Number(expense.total_amount).toFixed(2)} €
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          {isPayer ? 'Paguar nga ti' : `Nga: ${expense.paid_by_name || 'Shoku'}`}
        </div>
        {isShared && expense.my_split_amount && (
          <div className="text-[10px] font-semibold text-indigo-600">
            Pjesa jote: {Number(expense.my_split_amount).toFixed(2)} €
          </div>
        )}
      </div>

      {/* Butoni me 3 pika (...) për Menaxhimin (Edit / Delete) */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          title="Opsionet"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute right-0 top-9 z-20 w-32 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setShowMenu(false);
                if (onEdit) onEdit(expense);
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-2 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Ndrysho</span>
            </button>

            <button
              onClick={() => {
                setShowMenu(false);
                if (onDelete) onDelete(expense);
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center space-x-2 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Fshij</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
