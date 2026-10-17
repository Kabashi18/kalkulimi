import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AlertTriangle, Receipt, CheckCircle, LogOut, Copy, Check, Share2, DoorOpen, UserPlus, Moon, Bell, ChevronRight, ChevronLeft, Camera } from 'lucide-react';
import SummaryCard from '../components/SummaryCard';
import BalanceSettlement from '../components/BalanceSettlement';
import ExpenseItem from '../components/ExpenseItem';
import CategoryChart from '../components/CategoryChart';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import ReportModal from '../components/ReportModal';
import ConfirmDialog from '../components/ConfirmDialog';
import Navigation from '../components/Navigation';
import ReceiptViewer from '../components/ReceiptViewer';
import Avatar from '../components/Avatar';
import { expenseApi } from '../api/expenseApi';
import { householdApi } from '../api/householdApi';
import { isDarkTheme, setDarkTheme } from '../lib/theme';
import { pushApi } from '../api/pushApi';
import { profileApi } from '../api/profileApi';
import { useToast } from '../hooks/useToast';
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

// Tab-et: 'home' (Dashboard), 'expenses' (lista e plotë, hapet nga Dashboard-i), 'settings' (Cilësimet)
// Tab-i i fundit ruhet sa është hapur faqja (Dashboard-i rikrijohet pas ruajtjes së një shpenzimi)
let lastTab = 'home';
// Sa afër kreut / fundit (px) duhet të jetë përdoruesi që shiriti i poshtëm të shfaqet
const NAV_EDGE_PX = 24;

export default function DashboardScreen({ onNavigateToAdd, onNavigateToEdit, user, household, onLogout, onLeftHousehold, onProfileChanged }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [toast, showToast] = useToast();
  const [tab, setTabState] = useState(lastTab);
  const contentRef = useRef(null);
  const setTab = useCallback((next) => {
    lastTab = next;
    setTabState(next);
    // Çdo ndërrim tab-i (edhe klikimi i tab-it aktual) fillon nga kreu i kontejnerit të përmbajtjes
    contentRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Shiriti i poshtëm (web): duket në krye të faqes, fshihet gjatë scroll-it teposhtë dhe rishfaqet
  // i fiksuar kur arrihet fundi. Kur përmbajtja nuk ka scroll, mbetet gjithmonë i dukshëm.
  const [navVisible, setNavVisible] = useState(true);
  const updateNavVisibility = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const atTop = el.scrollTop <= NAV_EDGE_PX;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - NAV_EDGE_PX;
    setNavVisible(atTop || atBottom);
  }, []);
  const [darkTheme, setDarkThemeState] = useState(isDarkTheme);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const avatarInputRef = useRef(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  // Modali i largimit: null | 'blocked' (ka borxhe) | 'confirm'
  const [leaveDialog, setLeaveDialog] = useState(null);
  const [leaving, setLeaving] = useState(false);

  // Gjendja për modalin e fshirjes
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Gjendja për modalin e raportit të barazimit (PDF)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  // Fotoja e faturës e hapur në madhësi të plotë: { url, title } ose null
  const [receiptToView, setReceiptToView] = useState(null);
  const closeReceipt = useCallback(() => setReceiptToView(null), []);
  const openReport = useCallback(() => setIsReportModalOpen(true), []);
  const closeReport = useCallback(() => setIsReportModalOpen(false), []);

  const currentUserId = user?.id;
  const activeUserName = user?.name || 'Përdorues';
  const members = data?.members || [];
  const expenses = useMemo(() => data?.expenses || [], [data]);
  // Fotot e profilit sipas id-së (anëtarët aktualë); null = shfaqen inicialet
  const avatarOf = useMemo(() => Object.fromEntries((data?.members || []).map((m) => [m.id, m.avatar_url || null])), [data]);
  const myAvatarUrl = user?.avatar_url || avatarOf[currentUserId] || null;

  // Muaji i zgjedhur: totali, grafiku dhe lista i referohen këtij muaji (borxhet janë gjithmonë totale)
  const [month, setMonth] = useState(() => startOfMonth());
  const [listFilter, setListFilter] = useState('all');
  const isCurrentMonth = month.getTime() === startOfMonth().getTime();
  const monthExpenses = useMemo(() => expenses.filter((e) => isInMonth(e, month)), [expenses, month]);
  const monthlyTotal = useMemo(() => computeMonthlyOutOfPocket(currentUserId, expenses, month), [currentUserId, expenses, month]);
  const categoryData = useMemo(() => computeCategoryBreakdown(monthExpenses), [monthExpenses]);
  const filterCounts = useMemo(() => {
    const personal = monthExpenses.filter(isPersonalExpense).length;
    return { all: monthExpenses.length, shared: monthExpenses.length - personal, personal };
  }, [monthExpenses]);
  const listedExpenses = useMemo(
    () =>
      listFilter === 'all'
        ? monthExpenses
        : monthExpenses.filter((e) => (listFilter === 'personal') === isPersonalExpense(e)),
    [monthExpenses, listFilter]
  );
  const prevMonth = useCallback(() => setMonth((m) => addMonths(m, -1)), []);
  const nextMonth = useCallback(() => setMonth((m) => addMonths(m, 1)), []);
  const thisMonth = useCallback(() => setMonth(startOfMonth()), []);

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

  // Lartësia e përmbajtjes ndryshon (tab, të dhënat, muaji, filtri) ose dritarja zmadhohet -> rillogarit
  useEffect(() => {
    updateNavVisibility();
  }, [updateNavVisibility, tab, data, loading, month, listFilter]);

  useEffect(() => {
    window.addEventListener('resize', updateNavVisibility);
    return () => window.removeEventListener('resize', updateNavVisibility);
  }, [updateNavVisibility]);

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
    };
  }, [household.id, loadData]);

  useEffect(() => {
    pushApi.isEnabled(currentUserId).then(setPushEnabled).catch(() => setPushEnabled(false));
  }, [currentUserId]);

  const handleTogglePush = async () => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      if (pushEnabled) {
        await pushApi.disable();
        setPushEnabled(false);
        showToast('Njoftimet push u çaktivizuan në këtë pajisje.');
      } else {
        await pushApi.enable(currentUserId);
        setPushEnabled(true);
        showToast('Njoftimet push u aktivizuan!');
      }
    } catch (err) {
      showToast(err?.message || 'Dështoi ndryshimi i njoftimeve.', 'error');
    } finally {
      setPushBusy(false);
    }
  };

  // Ngarkimi / heqja e fotos së profilit: e njëjta rrjedhë (busy -> toast -> rifreskim)
  const updateAvatar = async (action, successMessage, errorMessage) => {
    try {
      setAvatarBusy(true);
      await action();
      showToast(successMessage);
      onProfileChanged?.();
      loadData();
    } catch (err) {
      showToast(err?.message || errorMessage, 'error');
    } finally {
      setAvatarBusy(false);
    }
  };

  // Fotoja e profilit: zvogëlohet në 400x400, ngarkohet te Storage dhe ruhet te profili
  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    updateAvatar(() => profileApi.uploadAvatar(currentUserId, file), 'Fotoja e profilit u përditësua!', 'Dështoi ngarkimi i fotos.');
  };

  const handleRemoveAvatar = () =>
    updateAvatar(() => profileApi.removeAvatar(currentUserId), 'Fotoja e profilit u hoq.', 'Dështoi heqja e fotos.');

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
  const handleDeleteClick = useCallback((expense) => {
    setExpenseToDelete(expense);
    setIsDeleteModalOpen(true);
  }, []);

  // Callback-e të qëndrueshme: përbërësit me React.memo nuk rivizatohen gjatë scroll-it / ndërrimit të tab-ave
  const handleSettlementChanged = useCallback((msg) => {
    showToast(msg);
    loadData();
  }, [showToast, loadData]);
  const showError = useCallback((msg) => showToast(msg, 'error'), [showToast]);

  const renderExpense = (expense) => (
    <ExpenseItem
      key={expense.id}
      expense={expense}
      payerAvatarUrl={avatarOf[expense.paid_by_user_id]}
      currentUserId={currentUserId}
      onEdit={onNavigateToEdit}
      onDelete={handleDeleteClick}
      onViewReceipt={setReceiptToView}
    />
  );

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

  const monthCard = (
    <SummaryCard
      month={month}
      monthlyTotal={monthlyTotal}
      isCurrentMonth={isCurrentMonth}
      onPrev={prevMonth}
      onNext={nextMonth}
      onToday={thisMonth}
    />
  );

  const emptyState = (
    <div className="py-10 text-center bg-white rounded-3xl border border-slate-100 px-6">
      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-500">
        <Receipt className="w-6 h-6" />
      </div>
      <p className="text-base font-semibold text-slate-800">{expenses.length === 0 ? 'Asnjë shpenzim ende' : 'Asnjë shpenzim këtë muaj'}</p>
      <p className="text-sm text-slate-500 mt-1">
        {expenses.length === 0 ? 'Shtypni butonin "+ Shto" për shpenzimin e parë të banesës.' : 'Ndërroni muajin ose filtrin.'}
      </p>
    </div>
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

      {/* Header: titulli, banesa dhe kodi i saj majtas, profili djathtas */}
      <header className="px-4 sm:px-5 py-3 bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="flex justify-between items-start">
          <div className="min-w-0 mr-3">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Kalkulimi</p>
            <button
              onClick={() => setTab('settings')}
              className="block max-w-full text-left text-lg font-bold text-slate-900 hover:text-indigo-600 truncate cursor-pointer"
              title="Banesa dhe ftesa"
            >
              {household.name}
            </button>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="text-xs font-semibold tracking-widest text-slate-500 truncate">{household.code}</span>
              <button
                onClick={handleCopyCode}
                className="shrink-0 inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-600 cursor-pointer"
                aria-label="Kopjo kodin e banesës"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'U kopjua' : 'Kopjo'}</span>
              </button>
            </div>
          </div>

          <button
            onClick={() => setTab('settings')}
            className="shrink-0 rounded-full hover:ring-4 hover:ring-indigo-100 transition-shadow cursor-pointer"
            aria-label="Cilësimet e profilit"
            title={activeUserName}
          >
            <Avatar name={activeUserName} url={myAvatarUrl} className="w-10 h-10 text-sm font-black" tone="bg-indigo-100 text-indigo-700" />
          </button>
        </div>

      </header>

      {/* Përmbajtja */}
      <div ref={contentRef} onScroll={updateNavVisibility} className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-5 py-4 pb-32">
        {error && (
          <div className="p-3.5 mb-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-2.5 text-amber-900 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Vërejtje për lidhjen</p>
              <p className="text-amber-800 text-xs leading-relaxed mt-0.5">{error}</p>
            </div>
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
        ) : tab === 'home' ? (
          <>
            {/* PËRMBLEDHJA: borxhi kryesor, shpenzimet e fundit, pastaj muaji dhe kategoritë */}
            <BalanceSettlement
              avatarOf={avatarOf}
              balance={data?.summary?.settlementBalance}
              settlements={data?.settlements}
              currentUserId={currentUserId}
              householdId={household.id}
              onChanged={handleSettlementChanged}
              onDownloadReport={openReport}
              onError={showError}
            />

            {/* Ftesa: kur je ende i vetëm në banesë */}
            {members.length === 1 && (
              <div className="mb-4 p-5 rounded-2xl bg-white border border-indigo-100 shadow-sm">
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

            <div className="flex justify-between items-center mb-2.5 mt-6">
              <h2 className="text-base font-bold text-slate-900">Shpenzimet e Fundit</h2>
              {expenses.length > 0 && (
                <button
                  onClick={() => setTab('expenses')}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center cursor-pointer"
                >
                  Shiko të gjitha <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
            {expenses.length === 0 ? (
              emptyState
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100 mb-6">
                {expenses.slice(0, 3).map(renderExpense)}
              </div>
            )}

            {monthCard}
            {categoryData.length > 0 && <CategoryChart categoryData={categoryData} />}
          </>
        ) : tab === 'expenses' ? (
          <>
            {/* SHPENZIMET: muaji + filtri + lista e plotë sipas ditës */}
            <button
              onClick={() => setTab('home')}
              className="mb-3 -ml-1 inline-flex items-center text-sm font-semibold text-slate-600 hover:text-indigo-600 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Dashboard
            </button>
            {monthCard}
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

            {groupedExpenses.length === 0
              ? emptyState
              : groupedExpenses.map((group) => (
                  <section key={group.label} className="mb-4">
                    <h3 className="text-xs font-semibold text-slate-500 mb-1.5 px-1">{group.label}</h3>
                    <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100">
                      {group.items.map(renderExpense)}
                    </div>
                  </section>
                ))}
          </>
        ) : (
          <>
            {/* CILËSIMET: profili, preferencat, banesa me ftesën dhe anëtarët, dalja */}
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-4">Cilësimet</h2>

            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm mb-4 flex items-center">
              {/* Fotoja e profilit: prekja e saj hap zgjedhjen e fotos (në celular: kamera ose galeria) */}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarBusy}
                className="relative mr-4 shrink-0 rounded-full cursor-pointer disabled:opacity-60"
                aria-label="Ndrysho foton e profilit"
              >
                <Avatar name={activeUserName} url={myAvatarUrl} className="w-16 h-16 text-xl font-black" tone="bg-indigo-100 text-indigo-700" />
                <span className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-orange-500 text-white ring-2 ring-white flex items-center justify-center">
                  {avatarBusy ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                </span>
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
              <div className="min-w-0">
                <p className="text-base font-bold text-slate-900 truncate">{activeUserName}</p>
                <p className="text-sm text-slate-500 truncate">{user?.email}</p>
                <div className="flex items-center space-x-3 mt-1">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarBusy}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50 cursor-pointer"
                  >
                    {myAvatarUrl ? 'Ndrysho foton' : 'Shto foto'}
                  </button>
                  {myAvatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={avatarBusy}
                      className="text-sm font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50 cursor-pointer"
                    >
                      Hiq
                    </button>
                  )}
                </div>
              </div>
            </div>

            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 px-1">Preferencat</h3>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100 mb-6">
              {/* Tema e errët: opsion shtesë që përdoruesi e ndez vetë (parazgjedhja është e çelët) */}
              <button
                role="switch"
                aria-checked={darkTheme}
                onClick={() => {
                  setDarkTheme(!darkTheme);
                  setDarkThemeState(!darkTheme);
                }}
                className="w-full px-4 py-3.5 text-left text-sm font-medium text-slate-800 flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center space-x-3">
                  <Moon className="w-5 h-5 text-slate-500" />
                  <span>Tema e errët</span>
                </span>
                <span className={`w-11 h-6 rounded-full p-0.5 shrink-0 transition-colors ${darkTheme ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                    <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${darkTheme ? 'translate-x-5' : ''}`} />
                  </span>
              </button>
              {/* Njoftimet push për shpenzimet e përbashkëta, pagesat dhe anëtarët e rinj */}
              {pushApi.isConfigured() && (
                <button
                  role="switch"
                  aria-checked={pushEnabled}
                  disabled={pushBusy}
                  onClick={handleTogglePush}
                  className="w-full px-4 py-3.5 text-left text-sm font-medium text-slate-800 flex items-center justify-between cursor-pointer disabled:opacity-60"
                >
                  <span className="flex items-center space-x-3 min-w-0 mr-3">
                    <Bell className="w-5 h-5 text-slate-500 shrink-0" />
                    <span className="min-w-0">
                      <span className="block">Njoftimet push</span>
                      <span className="block text-xs font-normal text-slate-500">Shpenzime të reja, pagesa dhe anëtarë të rinj në këtë pajisje</span>
                    </span>
                  </span>
                  <span className={`w-11 h-6 rounded-full p-0.5 shrink-0 transition-colors ${pushEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                    <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${pushEnabled ? 'translate-x-5' : ''}`} />
                  </span>
                </button>
              )}
            </div>

            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 px-1">Banesa</h3>
            <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm mb-4">
              <h2 className="text-xl font-bold text-slate-900 mb-1 break-words">{household.name}</h2>
              <p className="text-sm text-slate-500 mb-3">Ftoji shokët: ata regjistrohen dhe shkruajnë këtë kod.</p>
              {invitePanel}
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-2.5">Anëtarët ({members.length})</h2>
            <ul className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100 mb-6">
              {members.map((m) => {
                const debt = openDebts.find((d) => d.userId === m.id);
                return (
                  <li key={m.id} className="flex items-center px-4 py-3">
                    <div className="mr-3">
                      <Avatar name={m.name} url={m.avatar_url} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {m.name} {m.id === currentUserId && <span className="font-normal text-slate-500">(ti)</span>}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{m.email}</p>
                    </div>
                    {m.id !== currentUserId && (
                      <span
                        className={`text-sm font-semibold shrink-0 ml-2 ${
                          !debt ? 'text-slate-500' : debt.type === 'user_owes' ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {!debt ? 'të barazuar' : debt.type === 'user_owes' ? `i ke ${formatEuro(debt.amount)}` : `të ka ${formatEuro(debt.amount)}`}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>

            <button
              onClick={handleLeave}
              className="w-full py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center space-x-2 cursor-pointer"
            >
              <DoorOpen className="w-4 h-4" />
              <span>Largohu nga banesa</span>
            </button>
            <button
              onClick={onLogout}
              className="w-full mt-3 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-100 inline-flex items-center justify-center space-x-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Dil nga llogaria</span>
            </button>
          </>
        )}
      </div>

      {/* Tab bar i poshtëm: Dashboard · Shto · Cilësimet */}
      <Navigation active={tab === 'settings' ? 'settings' : 'home'} onNavigate={setTab} onAdd={onNavigateToAdd} hidden={!navVisible} />

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
        <p>Përdor "Laje Borxhin" / "Shëno të marrë" te kartela e borxheve në Dashboard.</p>
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
      <ReportModal isOpen={isReportModalOpen} onClose={closeReport} household={household} />

      {/* Fotoja e faturës në madhësi të plotë */}
      <ReceiptViewer url={receiptToView?.url} title={receiptToView?.title} onClose={closeReceipt} />
    </div>
  );
}
