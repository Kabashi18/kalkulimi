import React, { useState, useRef, useEffect } from 'react';
import { Zap, Home, Utensils, Wifi, Droplets, Receipt, Sparkles, MoreVertical, Edit2, Trash2, Users, Lock } from 'lucide-react';
import { expenseEffectFor, formatEuro } from '../utils/balances';

const getCategoryDetails = (category = '') => {
  const cat = category.toLowerCase();
  if (cat.includes('rrym') || cat.includes('energji') || cat.includes('drita')) return { Icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' };
  if (cat.includes('qira') || cat.includes('banes')) return { Icon: Home, color: 'text-indigo-600', bg: 'bg-indigo-50' };
  if (cat.includes('ushqim') || cat.includes('market') || cat.includes('dreka') || cat.includes('kafe')) return { Icon: Utensils, color: 'text-emerald-600', bg: 'bg-emerald-50' };
  if (cat.includes('internet') || cat.includes('wifi') || cat.includes('tv')) return { Icon: Wifi, color: 'text-sky-600', bg: 'bg-sky-50' };
  if (cat.includes('uj')) return { Icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-50' };
  if (cat.includes('pastrim') || cat.includes('mirmbajtje')) return { Icon: Sparkles, color: 'text-pink-600', bg: 'bg-pink-50' };
  return { Icon: Receipt, color: 'text-slate-600', bg: 'bg-slate-100' };
};

// Në të djathtë shfaqet efekti mbi TY (si te Splitwise), jo vetëm totali
const EFFECT_STYLES = {
  lent: { label: 'ti dhe hua', color: 'text-emerald-600' },
  borrowed: { label: 'ti more hua', color: 'text-rose-600' },
  personal: { label: 'personale', color: 'text-slate-500' },
  none: { label: 'nuk të përfshin', color: 'text-slate-400' }
};

export default function ExpenseItem({ expense, currentUserId, onEdit, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const { Icon, color, bg } = getCategoryDetails(expense.category);
  const isPayer = expense.is_payer === 1 || (currentUserId != null && expense.paid_by_user_id === currentUserId);
  const effect = expenseEffectFor(currentUserId, expense);
  const effectStyle = EFFECT_STYLES[effect.type];
  const isPersonal = effect.type === 'personal';
  const customSplit = !isPersonal && expense.split_mode && expense.split_mode !== 'equal';

  // Mbylle menunë nëse klikohet jashtë
  useEffect(() => {
    if (!showMenu) return undefined;
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  return (
    <div className="flex items-center px-3.5 py-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 shrink-0 ${bg}`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>

      <div className="flex-1 min-w-0 mr-2">
        <p className="text-sm font-semibold text-slate-900 truncate">{expense.title}</p>
        <p className="text-xs text-slate-500 truncate flex items-center">
          {isPersonal ? (
            <Lock className="w-3 h-3 mr-1 shrink-0" aria-label="Personale" />
          ) : (
            <Users className="w-3 h-3 mr-1 shrink-0" aria-label="E përbashkët" />
          )}
          <span className="truncate">
            {isPayer ? 'Ti pagove' : `${(expense.paid_by_name || 'Shoku').split(' ')[0]} pagoi`} {formatEuro(expense.total_amount)}
            {customSplit && (expense.split_mode === 'percent' ? ' · me %' : ' · shuma të ndryshme')}
          </span>
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className={`text-xs ${effectStyle.color}`}>{effectStyle.label}</p>
        {effect.type !== 'none' && (
          <p className={`text-sm font-bold ${effectStyle.color === 'text-slate-500' ? 'text-slate-700' : effectStyle.color}`}>
            {formatEuro(effect.amount)}
          </p>
        )}
      </div>

      {/* Ndrysho / Fshij: vetëm për paguesin ose regjistruesin */}
      {(expense.can_edit ?? isPayer) ? (
        <div className="relative shrink-0 ml-1" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
            aria-label="Opsionet e shpenzimit"
            aria-expanded={showMenu}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-10 z-20 w-36 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => {
                  setShowMenu(false);
                  onEdit?.(expense);
                }}
                className="w-full px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
              >
                <Edit2 className="w-4 h-4 text-slate-500" />
                <span>Ndrysho</span>
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  onDelete?.(expense);
                }}
                className="w-full px-3.5 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center space-x-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Fshij</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="w-10 shrink-0" />
      )}
    </div>
  );
}
