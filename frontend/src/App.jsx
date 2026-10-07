import React, { useState, useEffect, useCallback } from 'react';
import DashboardScreen from './screens/DashboardScreen';
import AddExpenseScreen from './screens/AddExpenseScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HouseholdSetupScreen from './screens/HouseholdSetupScreen';
import { authApi } from './api/authApi';
import { householdApi } from './api/householdApi';
import { isSupabaseConfigured, supabaseConfigError } from './lib/supabaseClient';

const FullScreenSpinner = ({ text }) => (
  <div className="my-auto text-center">
    <div className="inline-block w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    <p className="text-xs text-slate-400 mt-2 font-medium">{text}</p>
  </div>
);

const ConfigMissing = () => (
  <div className="w-full max-w-md my-auto bg-white rounded-3xl p-7 shadow-xl border border-amber-200 text-sm text-slate-700 space-y-3">
    <h1 className="text-lg font-black text-slate-800">Mungon konfigurimi i Supabase</h1>
    {supabaseConfigError && (
      <p className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold">
        {supabaseConfigError}
      </p>
    )}
    <p>
      Vendosni <code className="bg-slate-100 px-1 rounded">VITE_SUPABASE_URL</code> dhe{' '}
      <code className="bg-slate-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> te{' '}
      <code className="bg-slate-100 px-1 rounded">frontend/.env.local</code> (lokalisht) ose te Environment Variables në Vercel,
      pastaj rinisni aplikacionin. Në Vercel, pas ndryshimit duhet bërë <strong>Redeploy</strong>.
    </p>
    <p className="text-xs text-slate-500">Udhëzimet e plota gjenden te supabase/README.md.</p>
  </div>
);

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = ende duke u kontrolluar
  const [profile, setProfile] = useState(undefined);
  const [profileError, setProfileError] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [authView, setAuthView] = useState('login');
  const [registrationNotice, setRegistrationNotice] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expenseToEdit, setExpenseToEdit] = useState(null);

  // Sesioni i Supabase: rikthehet automatikisht pas rifreskimit të faqes
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    authApi.getSession().then(setSession).catch(() => setSession(null));
    return authApi.onAuthChange(setSession);
  }, []);

  const userId = session?.user?.id;

  const loadProfile = useCallback(async () => {
    try {
      setProfileError(null);
      setProfile(await householdApi.getMyProfile());
    } catch (err) {
      setProfileError(err.message);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      setProfile(undefined);
      loadProfile();
    } else {
      setProfile(undefined);
    }
  }, [userId, loadProfile]);

  const handleRegisterSuccess = ({ email, message }) => {
    setRegistrationNotice({ email, message });
    setAuthView('login');
  };

  const handleLogout = async () => {
    await authApi.logout();
    setExpenseToEdit(null);
    setRegistrationNotice(null);
    setCurrentScreen('dashboard');
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

  const renderContent = () => {
    if (!isSupabaseConfigured) return <ConfigMissing />;
    if (session === undefined) return <FullScreenSpinner text="Duke kontrolluar sesionin..." />;

    if (!session) {
      return authView === 'login' ? (
        <LoginScreen
          onLoginSuccess={() => setRegistrationNotice(null)}
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
      );
    }

    if (profile === undefined) return <FullScreenSpinner text="Duke ngarkuar profilin..." />;

    if (!profile || !profile.household) {
      return (
        <HouseholdSetupScreen
          userName={profile?.name || session.user.email}
          error={profileError}
          onDone={loadProfile}
          onLogout={handleLogout}
        />
      );
    }

    return (
      <div className="w-full max-w-md bg-white sm:rounded-3xl shadow-xl sm:border sm:border-slate-200/80 overflow-hidden flex flex-col min-h-screen sm:min-h-[850px] relative my-auto">
        <main className="flex-1 flex flex-col min-h-0">
          {currentScreen === 'dashboard' ? (
            <DashboardScreen
              key={refreshKey}
              user={profile}
              household={profile.household}
              onLogout={handleLogout}
              onLeftHousehold={loadProfile}
              onNavigateToAdd={handleNavigateToAdd}
              onNavigateToEdit={handleNavigateToEdit}
            />
          ) : (
            <AddExpenseScreen
              onBack={handleBackToDashboard}
              onExpenseAdded={handleExpenseSaved}
              currentUserId={profile.id}
              household={profile.household}
              expenseToEdit={expenseToEdit}
            />
          )}
        </main>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 sm:bg-slate-100/80 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
      {renderContent()}
    </div>
  );
}
