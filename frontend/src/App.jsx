import React, { useState, useEffect } from 'react';
import DashboardScreen from './screens/DashboardScreen';
import AddExpenseScreen from './screens/AddExpenseScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import { authStorage } from './api/authApi';

export default function App() {
  // Gjendja e autentifikimit nga sesioni aktiv
  const [currentUser, setCurrentUser] = useState(() => authStorage.getUser());
  const [authToken, setAuthToken] = useState(() => authStorage.getToken());

  // Gjendja e navigimit dhe pamjes
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [authView, setAuthView] = useState('login'); // 'login' ose 'register'
  const [registrationNotice, setRegistrationNotice] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expenseToEdit, setExpenseToEdit] = useState(null);

  // Dëgjuesi për rastet e skadimit të autorizimit
  useEffect(() => {
    const handleUnauthorized = () => {
      authStorage.clear();
      setCurrentUser(null);
      setAuthToken(null);
      setRegistrationNotice(null);
      setAuthView('login');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  // Trajtimi i kyçjes me sukses
  const handleAuthSuccess = (user, token) => {
    setCurrentUser(user);
    setAuthToken(token);
    setRegistrationNotice(null);
    setCurrentScreen('dashboard');
    setRefreshKey((prev) => prev + 1);
  };

  // Trajtimi i regjistrimit me sukses (Ridrejton te Login me email të plotësuar dhe mesazh suksesi)
  const handleRegisterSuccess = ({ email, message }) => {
    setRegistrationNotice({
      email,
      message: message || 'Llogaria u krijua me sukses! Ju lutem kyçuni me fjalëkalimin tuaj.'
    });
    setAuthView('login');
  };

  // Trajtimi i daljes (Logout) - Fshin vetëm sesionin aktual, ruan të gjithë përdoruesit në 'app_users'
  const handleLogout = () => {
    authStorage.clear();
    setCurrentUser(null);
    setAuthToken(null);
    setExpenseToEdit(null);
    setRegistrationNotice(null);
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
      {/* Kontejneri Kryesor Responsive */}
      <div className="w-full max-w-md bg-white sm:rounded-3xl shadow-xl sm:border sm:border-slate-200/80 overflow-hidden flex flex-col min-h-screen sm:min-h-[850px] relative">
        <main className="flex-1 flex flex-col min-h-0">
          {!isAuthenticated ? (
            authView === 'login' ? (
              <LoginScreen
                onLoginSuccess={handleAuthSuccess}
                onNavigateToRegister={() => {
                  setRegistrationNotice(null);
                  setAuthView('register');
                }}
                initialEmail={registrationNotice?.email || ''}
                successMessage={registrationNotice?.message || null}
              />
            ) : (
              <RegisterScreen
                onRegisterSuccess={handleRegisterSuccess}
                onNavigateToLogin={() => {
                  setRegistrationNotice(null);
                  setAuthView('login');
                }}
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
