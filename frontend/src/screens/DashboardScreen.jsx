import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Plus, RotateCw, AlertTriangle, Receipt, CheckCircle, LogOut, Copy, Check, Users, Share2, DoorOpen, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import SummaryCard from '../components/SummaryCard';
import BalanceSettlement from '../components/BalanceSettlement';
import ExpenseItem from '../components/ExpenseItem';
import CategoryChart from '../components/CategoryChart';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import ReportModal from '../components/ReportModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { expenseApi } from '../api/expenseApi';
import { householdApi } from '../api/householdApi';
import {
  isPersonalExpense,
  isInMonth,
  monthLabel,
  startOfMonth,
  addMonths,
  computeMonthlyOutOfPocket,
  computeCategoryBreakdown
} from '../utils/balances';

const LIST_FILTERS = [
  { id: 'all', label: 'Të gjitha' },
  { id: 'shared', label: 'Të përbashkëta' },
  { id: 'personal', label: 'Personale' }
];

export default function DashboardScreen({ onNavigateToAdd, onNavigateToEdit, user, household, onLogout, onLeftHousehold }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }
  // Modali i largimit: null | 'blocked' (ka borxhe) | 'confirm'
  const [leaveDialog, setLeaveDialog] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const toastTimer = useRef(null);

  // Gjendja për modalin e fshirjes
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Gjendja për modalin e raportit të barazimit (PDF)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const currentUserId = user?.id;
  const activeUserName = user?.name || 'Përdorues';
  const members = data?.members || [];
  const expenses = useMemo(() => data?.expenses || [], [data]);

  // Muaji i zgjedhur: totali, grafiku dhe lista i referohen këtij muaji (borxhet janë gjithmonë totale)
  const [month, setMonth] = useState(() => startOfMonth());
  const [listFilter, setListFilter] = useState('all');
  const isCurrentMonth = month.getTime() === startOfMonth().getTime();
  const monthExpenses = useMemo(() => expenses.filter((e) => isInMonth(e, month)), [expenses, month]);
  const monthlyTotal = useMemo(() => computeMonthlyOutOfPocket(currentUserId, expenses, month), [currentUserId, expenses, month]);
  const categoryData = useMemo(() => computeCategoryBreakdown(monthExpenses), [monthExpenses]);
  const filterCounts = {
    all: monthExpenses.length,
    shared: monthExpenses.filter((e) => !isPersonalExpense(e)).length,
    personal: monthExpenses.filter((e) => isPersonalExpense(e)).length
  };
  const listedExpenses = monthExpenses.filter((e) =>
    listFilter === 'all' ? true : listFilter === 'personal' ? isPersonalExpense(e) : !isPersonalExpense(e)
  );

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), type === 'error' ? 5000 : 3000);
  };

  const loadData = useCallback(async () => {
    try {
      setError(null);
      setData(await expenseApi.getSummary(household.id));
    } catch (err) {
      setError(err?.message || 'Nuk mund të lidhet me serverin. Kontrolloni internetin.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [household.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sinkronizimi në kohë reale: kur një shok shton shpenzim ose lan borxh, Dashboard-i rifreskohet vetë
  useEffect(() => {
    const unsubscribe = expenseApi.subscribeToHousehold(household.id, loadData);
    // Rezervë: rifresko kur përdoruesi kthehet te skeda (p.sh. telefoni ishte në gjumë)
    const onVisible = () => document.visibilityState === 'visible' && loadData();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
      clearTimeout(toastTimer.current);
    };
  }, [household.id, loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(household.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast(`Kodi: ${household.code}`);
    }
  };

  const handleShareCode = async () => {
    const text = `Bashkohu me banesën "${household.name}" te Kalkulimi me kodin: ${household.code}\n${window.location.origin}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Ftesë për banesën', text });
      } catch {
        /* përdoruesi e anuloi ndarjen */
      }
    } else {
      handleCopyCode();
    }
  };

  // Kontroll i shpejtë në UI; databaza e zbaton rregullin gjithsesi (leave_household)
  const openDebts = data?.summary?.settlementBalance?.breakdown || [];
  const handleLeave = () => setLeaveDialog(openDebts.length > 0 ? 'blocked' : 'confirm');

  const confirmLeave = async () => {
    try {
      setLeaving(true);
      await householdApi.leaveHousehold();
      setLeaveDialog(null);
      onLeftHousehold?.();
    } catch (err) {
      setLeaveDialog(null);
      showToast(err.message, 'error');
    } finally {
      setLeaving(false);
    }
  };

  // Trajtimi i fshirjes
  const handleDeleteClick = (expense) => {
    setExpenseToDelete(expense);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (id) => {
    try {
      setDeleteLoading(true);
      await expenseApi.deleteExpense(id);
      setIsDeleteModalOpen(false);
      setExpenseToDelete(null);
      showToast('Shpenzimi u fshi me sukses!');
      loadData();
    } catch (err) {
      setIsDeleteModalOpen(false);
      showToast(err?.message || 'Dështoi fshirja e shpenzimit.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className={`absolute top-16 left-4 right-4 z-30 text-white text-xs font-bold py-2.5 px-4 rounded-2xl shadow-lg flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
            toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-200 shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-200 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="px-5 py-4 bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="min-w-0">
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:text-indigo-600 cursor-pointer"
              title="Fto shokët e banesës"
            >
              <span className="truncate">{household.name}</span>
              <span className="flex items-center space-x-0.5 bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md normal-case">
                <Users className="w-3 h-3" />
                <span>{members.length || 1}</span>
              </span>
            </button>
            <h1 className="text-lg font-bold text-slate-800 truncate">
              Përshëndetje, {activeUserName.split(' ')[0]}
            </h1>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
              title="Rifresko"
            >
              <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onNavigateToAdd}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-full flex items-center space-x-1 shadow-sm shadow-indigo-500/20 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Shto</span>
            </button>

            <button
              onClick={onLogout}
              className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 flex items-center justify-center text-rose-600 transition-colors ml-1 cursor-pointer"
              title="Dil nga llogaria"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Paneli i ftesës: kodi i banesës + anëtarët */}
        {showInvite && (
          <div className="mt-3 p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl animate-in fade-in duration-150">
            <p className="text-[11px] font-semibold text-indigo-900 mb-2">
              Ftoji shokët: ata regjistrohen dhe shkruajnë këtë kod.
            </p>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm font-black tracking-widest text-indigo-700 text-center">
                {household.code}
              </div>
              <button
                onClick={handleCopyCode}
                className="w-9 h-9 rounded-xl bg-white border border-indigo-200 flex items-center justify-center text-indigo-600 hover:bg-indigo-100 cursor-pointer"
                title="Kopjo kodin"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={handleShareCode}
                className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-700 cursor-pointer"
                title="Dërgo ftesën"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3">
              {members.map((m) => (
                <span
                  key={m.id}
                  className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                    m.id === currentUserId
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  {m.id === currentUserId ? `${m.name} (ti)` : m.name}
                </span>
              ))}
            </div>

            <button
              onClick={handleLeave}
              className="mt-3 text-[11px] font-semibold text-slate-500 hover:text-rose-600 inline-flex items-center space-x-1 cursor-pointer"
            >
              <DoorOpen className="w-3.5 h-3.5" />
              <span>Largohu nga banesa</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-20">
        {error && (
          <div className="p-3 mb-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-2.5 text-amber-800 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Vërejtje për Lidhjen</p>
              <p className="text-amber-700 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* 0. Kartela e ftesës: shfaqet kur je ende i vetëm në banesë */}
        {!loading && members.length === 1 && (
          <div className="mb-4 p-5 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
            <div className="flex items-center space-x-2 mb-1">
              <UserPlus className="w-5 h-5" />
              <h3 className="text-sm font-black">Fto shokët e banesës</h3>
            </div>
            <p className="text-xs text-emerald-50 mb-3 leading-relaxed">
              Je i vetëm në "{household.name}". Dërgoju shokëve këtë kod: ata regjistrohen dhe e shkruajnë për t'u bashkuar.
            </p>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-white/15 border border-white/30 rounded-xl px-3 py-2.5 text-base font-black tracking-widest text-center">
                {household.code}
              </div>
              <button
                onClick={handleCopyCode}
                className="w-11 h-11 rounded-xl bg-white/15 border border-white/30 flex items-center justify-center hover:bg-white/25 cursor-pointer"
                title="Kopjo kodin"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
              <button
                onClick={handleShareCode}
                className="h-11 px-4 rounded-xl bg-white text-emerald-700 font-bold text-xs flex items-center space-x-1.5 hover:bg-emerald-50 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Dërgo</span>
              </button>
            </div>
          </div>
        )}

        {/* 1. Zgjedhësi i muajit + totali i atij muaji */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setMonth((m) => addMonths(m, -1))}
            className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 cursor-pointer"
            title="Muaji i kaluar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <span className="text-sm font-black text-slate-800">{monthLabel(month)}</span>
            {!isCurrentMonth && (
              <button
                onClick={() => setMonth(startOfMonth())}
                className="block mx-auto text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                Kthehu te muaji aktual
              </button>
            )}
          </div>
          <button
            onClick={() => setMonth((m) => addMonths(m, 1))}
            disabled={isCurrentMonth}
            className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 disabled:opacity-30 disabled:cursor-default cursor-pointer"
            title="Muaji tjetër"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <SummaryCard monthlyTotal={monthlyTotal} monthName={monthLabel(month)} isCurrentMonth={isCurrentMonth} />

        {/* 2. Kush i ka borxh kujt + "Laje Borxhin" */}
        {!loading && (
          <BalanceSettlement
            balance={data?.summary?.settlementBalance}
            settlements={data?.settlements || []}
            currentUserId={currentUserId}
            householdId={household.id}
            onChanged={(msg) => {
              showToast(msg);
              loadData();
            }}
            onDownloadReport={() => setIsReportModalOpen(true)}
            onError={(msg) => showToast(msg, 'error')}
          />
        )}

        {/* 3. Grafiku i Kategorive (muaji i zgjedhur) */}
        {categoryData.length > 0 && <CategoryChart categoryData={categoryData} />}

        {/* 4. Lista e Shpenzimeve të muajit + filtri */}
        <div className="flex justify-between items-center mb-2 mt-4">
          <h3 className="text-sm font-bold text-slate-800">Shpenzimet: {monthLabel(month)}</h3>
          <span className="text-xs font-medium text-slate-400">{listedExpenses.length} regjistrime</span>
        </div>
        <div className="flex space-x-1.5 mb-3 overflow-x-auto">
          {LIST_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setListFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border whitespace-nowrap transition-all cursor-pointer ${
                listFilter === f.id
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {f.label} <span className="opacity-60">{filterCounts[f.id]}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 mt-2 font-medium">Duke ngarkuar të dhënat...</p>
          </div>
        ) : listedExpenses.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-2xl border border-slate-100 p-6">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-400">
              <Receipt className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {expenses.length === 0 ? 'Nuk ka shpenzime të regjistruara' : `Asnjë shpenzim në ${monthLabel(month)}`}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {expenses.length === 0
                ? 'Klikoni butonin "+ Shto" lart për të regjistruar shpenzimin e parë të banesës.'
                : 'Ndërroni muajin me shigjetat ose ndryshoni filtrin.'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {listedExpenses.map((expense) => (
              <ExpenseItem
                key={expense.id}
                expense={expense}
                currentUserId={currentUserId}
                onEdit={onNavigateToEdit}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modali i Konfirmimit të Fshirjes */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        expense={expenseToDelete}
        loading={deleteLoading}
      />

      {/* Modalet e largimit nga banesa */}
      <ConfirmDialog
        isOpen={leaveDialog === 'blocked'}
        tone="warning"
        title="Ka borxhe të pashlyera"
        onClose={() => setLeaveDialog(null)}
      >
        <p className="mb-2">Nuk mund të largohesh nga banesa pa i larë më parë këto borxhe:</p>
        <ul className="text-left inline-block space-y-0.5 mb-2">
          {openDebts.map((d) => (
            <li key={d.userId} className={d.type === 'user_owes' ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'}>
              {d.type === 'user_owes' ? `Ti i ke borxh ${d.name}: ${d.amount.toFixed(2)} €` : `${d.name} të ka borxh: ${d.amount.toFixed(2)} €`}
            </li>
          ))}
        </ul>
        <p>Përdor "Laje Borxhin" / "Shëno të marrë" te kartela e borxheve.</p>
      </ConfirmDialog>
      <ConfirmDialog
        isOpen={leaveDialog === 'confirm'}
        tone="leave"
        title="Largohu nga banesa?"
        confirmLabel="Largohu"
        loading={leaving}
        onConfirm={confirmLeave}
        onClose={() => setLeaveDialog(null)}
      >
        Do të largohesh nga <strong className="text-slate-800">"{household.name}"</strong>. Shpenzimet mbeten te banesa dhe mund
        të rikthehesh me kodin <strong className="text-slate-800">{household.code}</strong>.
      </ConfirmDialog>

      {/* Modali i Gjenerimit të Raportit në PDF */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        household={household}
      />
    </div>
  );
}
