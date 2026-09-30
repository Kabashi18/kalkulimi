import React, { useState, useEffect } from 'react';
import DashboardScreen from './screens/DashboardScreen';
import AddExpenseScreen from './screens/AddExpenseScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import { authStorage } from './api/authApi';

export default function App() {
  // Gjendja e autentifikimit nga localStorage
  const [currentUser, setCurrentUser] = useState(() => authStorage.getUser());
  const [authToken, setAuthToken] = useState(() => authStorage.getToken());

  // Gjendja e ekranit aktual
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [authView, setAuthView] = useState('login'); // 'login' ose 'register'
  const [refreshKey, setRefreshKey] = useState(0);
  const [expenseToEdit, setExpenseToEdit] = useState(null);

  // Dëgjo për rastet kur tokeni skadon ose refuzohet nga serveri (401)
  useEffect(() => {
    const handleUnauthorized = () => {
      authStorage.clear();
      setCurrentUser(null);
      setAuthToken(null);
      setAuthView('login');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  // Trajtimi i kyçjes / regjistrimit me sukses
  const handleAuthSuccess = (user, token) => {
    setCurrentUser(user);
    setAuthToken(token);
    setCurrentScreen('dashboard');
    setRefreshKey((prev) => prev + 1);
  };

  // Trajtimi i daljes (Logout)
  const handleLogout = () => {
    authStorage.clear();
    setCurrentUser(null);
    setAuthToken(null);
    setExpenseToEdit(null);
    setAuthView('login');
  };

  const handleExpenseSaved = () => {
    setRefreshKey((prev) => prev + 1);
    setExpenseToEdit(null);
    setCurrentScreen('dashboard');
  };

  const handleNavigateToAdd = () => {
    setExpenseToEdit(null);
    setCurrentScreen('addExpense');
  };

  const handleNavigateToEdit = (expense) => {
    setExpenseToEdit(expense);
    setCurrentScreen('addExpense');
  };

  const handleBackToDashboard = () => {
    setExpenseToEdit(null);
    setCurrentScreen('dashboard');
  };

  const isAuthenticated = !!(currentUser && authToken);

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center items-center p-0 sm:p-4">
      {/* Kontejneri me pamje mobile (Mobile Mockup Container) */}
      <div className="w-full max-w-md h-screen sm:h-[844px] bg-slate-50 sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative sm:border-[8px] sm:border-slate-800">
        
        {/* Shiriti i lartë mobil (Status Bar për pamje realiste) */}
        <div className="h-6 bg-white shrink-0 flex justify-between items-center px-6 text-[10px] font-bold text-slate-400 select-none border-b border-slate-50">
          <span>9:41</span>
          <div className="w-16 h-3.5 bg-slate-800 rounded-full mx-auto"></div>
          <div className="flex items-center space-x-1">
            <span>5G</span>
            <span>100%</span>
          </div>
        </div>

        {/* Ekrani Aktiv: Autentifikim apo Aplikacioni Kryesor */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {!isAuthenticated ? (
            authView === 'login' ? (
              <LoginScreen
                onLoginSuccess={handleAuthSuccess}
                onNavigateToRegister={() => setAuthView('register')}
              />
            ) : (
              <RegisterScreen
                onRegisterSuccess={handleAuthSuccess}
                onNavigateToLogin={() => setAuthView('login')}
              />
            )
          ) : currentScreen === 'dashboard' ? (
            <DashboardScreen
              key={refreshKey}
              user={currentUser}
              onLogout={handleLogout}
              onNavigateToAdd={handleNavigateToAdd}
              onNavigateToEdit={handleNavigateToEdit}
            />
          ) : (
            <AddExpenseScreen
              onBack={handleBackToDashboard}
              onExpenseAdded={handleExpenseSaved}
              currentUserId={currentUser?.id}
              expenseToEdit={expenseToEdit}
            />
          )}
        </main>
      </div>
    </div>
  );
}
