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
    <div className="min-h-screen bg-slate-100/80 flex justify-center items-start sm:py-8 sm:px-4 text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Kontejneri Kryesor i Aplikacionit (Pastër, Modern & Responsive) */}
      <div className="w-full max-w-md bg-white sm:rounded-3xl shadow-xl sm:border sm:border-slate-200/80 overflow-hidden flex flex-col min-h-screen sm:min-h-[850px] relative">
        
        {/* Ekrani Aktiv */}
        <main className="flex-1 flex flex-col min-h-0">
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
