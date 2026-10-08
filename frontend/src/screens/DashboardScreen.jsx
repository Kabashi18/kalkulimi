import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Plus, AlertTriangle, Receipt, CheckCircle, LogOut, Copy, Check, Users, Share2, DoorOpen, UserPlus, ChevronDown, Moon } from 'lucide-react';
import SummaryCard from '../components/SummaryCard';
import BalanceSettlement from '../components/BalanceSettlement';
import ExpenseItem from '../components/ExpenseItem';
import CategoryChart from '../components/CategoryChart';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import ReportModal from '../components/ReportModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { expenseApi } from '../api/expenseApi';
import { householdApi } from '../api/householdApi';
import { isDarkTheme, setDarkTheme } from '../lib/theme';
import {
  isPersonalExpense,
  isInMonth,
  startOfMonth,
  addMonths,
  expenseDateOf,
  dayLabel,
  formatEuro,
  computeMonthlyOutOfPocket,
  computeCategoryBreakdown
} from '../utils/balances';

const LIST_FILTERS = [
  { id: 'all', label: 'Të gjitha' },
  { id: 'shared', label: 'Të përbashkëta' },
  { id: 'personal', label: 'Personale' }
];

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

export default function DashboardScreen({ onNavigateToAdd, onNavigateToEdit, user, household, onLogout, onLeftHousehold }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }
  const [showInvite, setShowInvite] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkTheme, setDarkThemeState] = useState(isDarkTheme);
  const [copied, setCopied] = useState(false);
  const toastTimer = useRef(null);
  const menuRef = useRef(null);

  // Modali i largimit: null | 'blocked' (ka borxhe) | 'confirm'
  const [leaveDialog, setLeaveDialog] = useState(null);
  const [leaving, setLeaving] = useState(false);

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

  // Lista e grupuar sipas ditës: [{ label: 'Sot', items: [...] }, ...]
  const groupedExpenses = useMemo(() => {
    const groups = [];
    listedExpenses.forEach((e) => {
      const label = dayLabel(expenseDateOf(e));
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(e);
      else groups.push({ label, items: [e] });
    });
    return groups;
  }, [listedExpenses]);

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

  // Mbyll menunë e profilit kur klikohet jashtë
  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

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

  const invitePanel = (
    <>
      <div className="flex items-center space-x-2">
        <div className="flex-1 bg-white border border-indigo-200 rounded-xl px-3 py-2.5 text-base font-black tracking-widest text-indigo-700 text-center">
          {household.code}
        </div>
        <button
          onClick={handleCopyCode}
          className="w-11 h-11 rounded-xl bg-white border border-indigo-200 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 cursor-pointer"
          title="Kopjo kodin"
          aria-label="Kopjo kodin"
        >
          {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
        </button>
        <button
          onClick={handleShareCode}
          className="h-11 px-4 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center space-x-1.5 hover:bg-indigo-700 cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          <span>Dërgo</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={`absolute top-16 left-4 right-4 z-30 text-white text-sm font-semibold py-3 px-4 rounded-2xl shadow-lg flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
            toast.type === 'error' ? 'bg-rose-600' : 'bg-slate-900'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header: banesa + përshëndetja majtas, profili djathtas */}
      <header className="px-5 py-3.5 bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <div className="min-w-0">
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="flex items-center space-x-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 cursor-pointer"
              title="Banesa dhe ftesa"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="truncate max-w-[180px]">{household.name}</span>
              <span className="text-slate-500">· {members.length || 1}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showInvite ? 'rotate-180' : ''}`} />
            </button>
            <h1 className="text-lg font-bold text-slate-900 truncate">Përshëndetje, {activeUserName.split(' ')[0]}</h1>
          </div>

          {/* Menuja e profilit (dalja nuk është më buton i kuq në header) */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-black text-sm flex items-center justify-center hover:bg-indigo-200 cursor-pointer"
              aria-label="Menuja e profilit"
              aria-expanded={menuOpen}
            >
              {initials(activeUserName)}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-12 z-30 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2 border-b border-slate-100 mb-1">
                  <p className="text-sm font-bold text-slate-900 truncate">{activeUserName}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setShowInvite(true);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-2.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-slate-500" />
                  <span>Banesa & ftesa</span>
                </button>
                {/* Tema e errët: opsion shtesë që përdoruesi e ndez vetë (parazgjedhja është e çelët) */}
                <button
                  role="switch"
                  aria-checked={darkTheme}
                  onClick={() => {
                    setDarkTheme(!darkTheme);
                    setDarkThemeState(!darkTheme);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center space-x-2.5">
                    <Moon className="w-4 h-4 text-slate-500" />
                    <span>Tema e errët</span>
                  </span>
                  <span className={`w-9 h-5 rounded-full p-0.5 transition-colors ${darkTheme ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                    <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${darkTheme ? 'translate-x-4' : ''}`} />
                  </span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center space-x-2.5 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Dil nga llogaria</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Paneli i banesës: kodi i ftesës + anëtarët + largimi */}
        {showInvite && (
          <div className="mt-3 p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl animate-in fade-in duration-150">
            <p className="text-sm text-indigo-950 mb-2.5">Ftoji shokët: ata regjistrohen dhe shkruajnë këtë kod.</p>
            {invitePanel}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {members.map((m) => (
                <span
                  key={m.id}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    m.id === currentUserId ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-white text-slate-700 border border-slate-200'
                  }`}
                >
                  {m.id === currentUserId ? `${m.name} (ti)` : m.name}
                </span>
              ))}
            </div>
            <button
              onClick={handleLeave}
              className="mt-3 text-xs font-semibold text-slate-500 hover:text-rose-600 inline-flex items-center space-x-1 cursor-pointer"
            >
              <DoorOpen className="w-3.5 h-3.5" />
              <span>Largohu nga banesa</span>
            </button>
          </div>
        )}
      </header>

      {/* Përmbajtja */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-28">
        {error && (
          <div className="p-3.5 mb-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-2.5 text-amber-900 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Vërejtje për lidhjen</p>
              <p className="text-amber-800 text-xs leading-relaxed mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Ftesa: kur je ende i vetëm në banesë */}
        {!loading && members.length === 1 && (
          <div className="mb-4 p-5 rounded-3xl bg-white border border-indigo-100 shadow-sm">
            <div className="flex items-center space-x-2 mb-1">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Fto shokët e banesës</h3>
            </div>
            <p className="text-sm text-slate-500 mb-3">
              Je i vetëm në "{household.name}". Dërgoju shokëve këtë kod për t'u bashkuar.
            </p>
            {invitePanel}
          </div>
        )}

        {loading ? (
          /* Skeleton gjatë ngarkimit të parë */
          <div className="space-y-4 animate-pulse" aria-label="Duke ngarkuar">
            <div className="h-40 bg-white rounded-3xl border border-slate-100" />
            <div className="h-28 bg-white rounded-3xl border border-slate-100" />
            <div className="h-16 bg-white rounded-2xl border border-slate-100" />
            <div className="h-16 bg-white rounded-2xl border border-slate-100" />
          </div>
        ) : (
          <>
            {/* 1. Kryesorja: kush i ka borxh kujt */}
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

            {/* 2. Muaji: zgjedhësi + totali nga xhepi */}
            <SummaryCard
              month={month}
              monthlyTotal={monthlyTotal}
              isCurrentMonth={isCurrentMonth}
              onPrev={() => setMonth((m) => addMonths(m, -1))}
              onNext={() => setMonth((m) => addMonths(m, 1))}
              onToday={() => setMonth(startOfMonth())}
            />

            {/* 3. Kategoritë e muajit */}
            {categoryData.length > 0 && <CategoryChart categoryData={categoryData} />}

            {/* 4. Shpenzimet e muajit, të grupuara sipas ditës */}
            <div className="flex justify-between items-center mb-2.5 mt-6">
              <h2 className="text-base font-bold text-slate-900">Shpenzimet</h2>
              <span className="text-sm text-slate-500">{listedExpenses.length}</span>
            </div>
            <div className="flex space-x-2 mb-4 overflow-x-auto">
              {LIST_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setListFilter(f.id)}
                  aria-pressed={listFilter === f.id}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    listFilter === f.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {f.label} <span className="opacity-60">{filterCounts[f.id]}</span>
                </button>
              ))}
            </div>

            {groupedExpenses.length === 0 ? (
              <div className="py-10 text-center bg-white rounded-3xl border border-slate-100 px-6">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-500">
                  <Receipt className="w-6 h-6" />
                </div>
                <p className="text-base font-semibold text-slate-800">
                  {expenses.length === 0 ? 'Asnjë shpenzim ende' : 'Asnjë shpenzim këtë muaj'}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {expenses.length === 0
                    ? 'Shtypni butonin + poshtë djathtas për shpenzimin e parë të banesës.'
                    : 'Ndërroni muajin ose filtrin.'}
                </p>
              </div>
            ) : (
              groupedExpenses.map((group) => (
                <section key={group.label} className="mb-4">
                  <h3 className="text-xs font-semibold text-slate-500 mb-1.5 px-1">{group.label}</h3>
                  <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100">
                    {group.items.map((expense) => (
                      <ExpenseItem
                        key={expense.id}
                        expense={expense}
                        currentUserId={currentUserId}
                        onEdit={onNavigateToEdit}
                        onDelete={handleDeleteClick}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </>
        )}
      </div>

      {/* Butoni lundrues "+" (arrihet lehtë me gishtin e madh) */}
      <button
        onClick={onNavigateToAdd}
        className="absolute bottom-6 right-5 z-20 h-14 pl-4 pr-5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer"
        aria-label="Shto shpenzim"
      >
        <Plus className="w-5 h-5" />
        <span>Shto</span>
      </button>

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
              {d.type === 'user_owes' ? `Ti i ke borxh ${d.name}: ${formatEuro(d.amount)}` : `${d.name} të ka borxh: ${formatEuro(d.amount)}`}
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
      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} household={household} />
    </div>
  );
}
