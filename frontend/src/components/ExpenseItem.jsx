import React, { useState, useRef, useEffect } from 'react';
import { isPersonalExpense } from '../api/expenseApi';
import { expenseDateOf, formatDateSq } from '../utils/balances';
import { Zap, Home, Utensils, Wifi, Droplets, Receipt, Sparkles, MoreVertical, Edit2, Trash2, User, Users } from 'lucide-react';

const getCategoryDetails = (category = '') => {
  const cat = category.toLowerCase();

  if (cat.includes('rrym') || cat.includes('energji') || cat.includes('drita')) {
    return { Icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
  }
  if (cat.includes('qira') || cat.includes('banes')) {
    return { Icon: Home, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' };
  }
  if (cat.includes('ushqim') || cat.includes('market') || cat.includes('dreka') || cat.includes('kafe')) {
    return { Icon: Utensils, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
  }
  if (cat.includes('internet') || cat.includes('wifi') || cat.includes('tv')) {
    return { Icon: Wifi, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200' };
  }
  if (cat.includes('uj') || cat.includes('ujësjellës')) {
    return { Icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
  }
  if (cat.includes('pastrim') || cat.includes('mirmbajtje')) {
    return { Icon: Sparkles, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200' };
  }

  return { Icon: Receipt, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' };
};

export default function ExpenseItem({ expense, currentUserId = 1, onEdit, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const { Icon, color, bg, border } = getCategoryDetails(expense.category);
  const isPayer = expense.is_payer === 1 || (currentUserId != null && expense.paid_by_user_id === currentUserId);
  const isShared = !isPersonalExpense(expense);

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

  // Data e shpenzimit (jo koha e regjistrimit)
  const date = expenseDateOf(expense);
  const formattedDate = formatDateSq(date);

  return (
    <div className="relative flex items-center justify-between p-3.5 mb-2.5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-slate-200 transition-all">
      {/* Pjesa e majtë: Ikona & Detajet */}
      <div className="flex items-center flex-1 mr-2 min-w-0">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mr-3 border shrink-0 ${bg} ${border}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-slate-800 truncate">
            {expense.title}
          </h4>
          <div className="flex items-center mt-0.5 flex-wrap gap-1.5">
            <span className="text-[10px] text-slate-400">{formattedDate}</span>
            {isShared ? (
              <span className="bg-indigo-50 text-indigo-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-indigo-200/80 flex items-center space-x-1">
                <Users className="w-2.5 h-2.5" />
                <span>E përbashkët</span>
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-full border border-slate-200 flex items-center space-x-1">
                <User className="w-2.5 h-2.5" />
                <span>Personale</span>
              </span>
            )}
            {isShared && expense.split_mode && expense.split_mode !== 'equal' && (
              <span className="bg-amber-50 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                {expense.split_mode === 'percent' ? 'Me përqindje' : 'Shuma të ndryshme'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pjesa e mesme: Shuma & Pjesa */}
      <div className="text-right shrink-0 mr-2">
        <div className="text-sm font-black text-slate-900">
          {Number(expense.total_amount).toFixed(2)} €
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          {isPayer ? 'Paguar nga ti' : `Nga: ${expense.paid_by_name || 'Shoku'}`}
        </div>
        {isShared && expense.my_split_amount ? (
          <div className="text-[10px] font-bold text-indigo-600">
            Pjesa jote: {Number(expense.my_split_amount).toFixed(2)} €
          </div>
        ) : !isShared && (
          <div className="text-[10px] font-medium text-slate-400">
            100% nga ti
          </div>
        )}
      </div>

      {/* Butoni me 3 pika (...) për Menaxhimin (Edit / Delete) - për paguesin ose regjistruesin */}
      {(expense.can_edit ?? isPayer) ? (
      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
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
              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-2 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Ndrysho</span>
            </button>

            <button
              onClick={() => {
                setShowMenu(false);
                if (onDelete) onDelete(expense);
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center space-x-2 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Fshij</span>
            </button>
          </div>
        )}
      </div>
      ) : (
        <div className="w-8 shrink-0" />
      )}
    </div>
  );
}
