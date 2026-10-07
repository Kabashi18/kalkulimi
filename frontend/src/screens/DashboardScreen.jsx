import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, RotateCw, AlertTriangle, Receipt, CheckCircle, LogOut, Copy, Check, Users, Share2, DoorOpen } from 'lucide-react';
import SummaryCard from '../components/SummaryCard';
import BalanceSettlement from '../components/BalanceSettlement';
import ExpenseItem from '../components/ExpenseItem';
import CategoryChart from '../components/CategoryChart';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import ReportModal from '../components/ReportModal';
import { expenseApi } from '../api/expenseApi';
import { householdApi } from '../api/householdApi';

export default function DashboardScreen({ onNavigateToAdd, onNavigateToEdit, user, household, onLogout, onLeftHousehold }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);
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
  const expenses = data?.expenses || [];

  const showToast = (message) => {
    setSuccessToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setSuccessToast(null), 3000);
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

  const handleLeave = async () => {
    if (!window.confirm(`Je i sigurt që do të largohesh nga "${household.name}"? Shpenzimet dhe borxhet mbeten te banesa.`)) return;
    try {
      await householdApi.leaveHousehold();
      onLeftHousehold?.();
    } catch (err) {
      alert(err.message);
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
      alert(err?.message || 'Dështoi fshirja e shpenzimit.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Toast Notification */}
      {successToast && (
        <div className="absolute top-16 left-4 right-4 z-30 bg-emerald-600 text-white text-xs font-bold py-2.5 px-4 rounded-2xl shadow-lg flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-200 shrink-0" />
          <span>{successToast}</span>
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

        {/* 1. Totali mujor nga xhepi */}
        <SummaryCard monthlyTotal={data?.summary?.currentMonth?.totalPaidOutOfPocket || 0} />

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
          />
        )}

        {/* 3. Grafiku i Kategorive */}
        {data?.summary?.categoryBreakdown?.length > 0 && (
          <CategoryChart categoryData={data.summary.categoryBreakdown} />
        )}

        {/* 4. Lista e Shpenzimeve */}
        <div className="flex justify-between items-center mb-3 mt-4">
          <h3 className="text-sm font-bold text-slate-800">Shpenzimet e Fundit</h3>
          <span className="text-xs font-medium text-slate-400">{expenses.length} regjistrime</span>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 mt-2 font-medium">Duke ngarkuar të dhënat...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-2xl border border-slate-100 p-6">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-400">
              <Receipt className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Nuk ka shpenzime të regjistruara</p>
            <p className="text-xs text-slate-400 mt-1">
              Klikoni butonin "+ Shto" lart për të regjistruar shpenzimin e parë të banesës.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {expenses.map((expense) => (
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

      {/* Modali i Gjenerimit të Raportit në PDF */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        household={household}
      />
    </div>
  );
}
