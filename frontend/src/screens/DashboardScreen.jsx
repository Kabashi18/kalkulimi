import React, { useState, useEffect, useCallback } from 'react';
import { Plus, RotateCw, AlertTriangle, Receipt, CheckCircle, LogOut } from 'lucide-react';
import SummaryCard from '../components/SummaryCard';
import ExpenseItem from '../components/ExpenseItem';
import CategoryChart from '../components/CategoryChart';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import ReportModal from '../components/ReportModal';
import { expenseApi } from '../api/expenseApi';

export default function DashboardScreen({ onNavigateToAdd, onNavigateToEdit, user, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Gjendja për modalin e fshirjes
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Gjendja për modalin e raportit të barazimit (PDF)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Përcaktimi i sigurt i përdoruesit aktiv dhe ID-së
  const storedUser = (() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  const currentUserId =
    user?.id ||
    storedUser?.id ||
    (localStorage.getItem('userId') ? Number(localStorage.getItem('userId')) : 1);

  const currentGroupId =
    user?.group_id ||
    storedUser?.group_id ||
    1;

  const activeUserName =
    user?.name ||
    storedUser?.name ||
    summaryData?.user?.name ||
    'Përdorues';

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const res = await expenseApi.getSummary('me');
      setSummaryData(res?.summary || null);
      setExpenses(res?.expenses || []);
    } catch (err) {
      setError('Nuk mund të lidhet me serverin MySQL/Node. Sigurohuni që backend-i po punon.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
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

      // Shfaq njoftim suksesi të shpejtë
      setSuccessToast('Shpenzimi u fshi me sukses!');
      setTimeout(() => setSuccessToast(null), 3000);

      // Rifresko të dhënat
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

      {/* Top Mobile App Header */}
      <header className="px-5 py-4 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {user?.group_name || storedUser?.group_name || 'Banesa Jonë'}
          </span>
          <h1 className="text-lg font-bold text-slate-800">
            Përshëndetje, {activeUserName?.split(' ')?.[0] || activeUserName}
          </h1>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            title="Rifresko"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onNavigateToAdd}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-full flex items-center space-x-1 shadow-sm shadow-indigo-500/20 text-xs font-semibold transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Shto</span>
          </button>

          <button
            onClick={onLogout}
            className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 flex items-center justify-center text-rose-600 transition-colors ml-1"
            title="Dil nga llogaria"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
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

        {/* 1. Kartelat Përmbledhëse & Butoni "Shkarko Barazimin" */}
        <SummaryCard
          monthlyTotal={summaryData?.currentMonth?.totalPaidOutOfPocket || 0}
          settlement={summaryData?.settlementBalance || {}}
          onDownloadReport={() => setIsReportModalOpen(true)}
        />

        {/* 2. Grafiku i Kategorive (Pie / Bar Chart me Recharts) */}
        {summaryData?.categoryBreakdown && summaryData.categoryBreakdown.length > 0 && (
          <CategoryChart categoryData={summaryData.categoryBreakdown} />
        )}

        {/* 3. Titulli i Listës së Shpenzimeve */}
        <div className="flex justify-between items-center mb-3 mt-4">
          <h3 className="text-sm font-bold text-slate-800">Shpenzimet e Fundit</h3>
          <span className="text-xs font-medium text-slate-400">
            {expenses?.length || 0} regjistrime
          </span>
        </div>

        {/* Lista e Shpenzimeve me opsionet Ndrysho / Fshij */}
        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 mt-2 font-medium">Duke ngarkuar të dhënat...</p>
          </div>
        ) : !expenses || expenses.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-2xl border border-slate-100 p-6">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-400">
              <Receipt className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Nuk ka shpenzime të regjistruara</p>
            <p className="text-xs text-slate-400 mt-1">
              Klikoni butonin "+ Shto" lart për të regjistruar shpenzimin tuaj të parë.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {expenses.map((expense) => (
              <ExpenseItem
                key={expense?.id}
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
        groupId={currentGroupId}
      />
    </div>
  );
}
