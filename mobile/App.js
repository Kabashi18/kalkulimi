import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AuthScreen from './src/screens/AuthScreen';
import HouseholdSetupScreen from './src/screens/HouseholdSetupScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AddExpenseScreen from './src/screens/AddExpenseScreen';
import { authApi } from './src/api/authApi';
import { householdApi } from './src/api/householdApi';
import { pushNotifications } from './src/lib/pushNotifications';
import { isSupabaseConfigured, supabaseConfigError } from './src/lib/supabaseClient';
import { C, isDark, applyDark, loadDarkPreference, saveDarkPreference } from './src/lib/theme';

const Loading = ({ text }) => (
  <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-950">
    <ActivityIndicator size="large" color={C.brand} />
    <Text className="text-slate-500 dark:text-slate-400 mt-3 text-sm">{text}</Text>
  </View>
);

const ConfigMissing = () => (
  <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 justify-center px-6">
    <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-amber-200 dark:border-amber-800">
      <Text className="text-lg font-black text-slate-800 dark:text-slate-200 mb-2">Mungon konfigurimi i Supabase</Text>
      <Text className="text-xs font-semibold text-amber-900 dark:text-amber-100 bg-amber-50 dark:bg-amber-950 p-3 rounded-xl mb-3">{supabaseConfigError}</Text>
      <Text className="text-sm text-slate-600 dark:text-slate-400">
        Krijoni mobile/.env (shikoni .env.example) dhe rinisni Expo me: npx expo start -c
      </Text>
    </View>
  </SafeAreaView>
);

export default function App() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(undefined);
  const [profileError, setProfileError] = useState(null);
  const [screen, setScreen] = useState('dashboard');
  const [expenseToEdit, setExpenseToEdit] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // Tema e errët: opsion i përdoruesit (parazgjedhja e çelët), ruhet në AsyncStorage
  const [darkMode, setDarkMode] = useState(isDark);

  useEffect(() => {
    loadDarkPreference().then((enabled) => {
      applyDark(enabled);
      setDarkMode(enabled);
    });
  }, []);

  const handleToggleDark = (enabled) => {
    applyDark(enabled);
    setDarkMode(enabled);
    saveDarkPreference(enabled);
  };

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
    setProfile(undefined);
    if (userId) {
      loadProfile();
      // Nëse ky përdorues i ka aktivizuar njoftimet më parë në këtë telefon, rilidh tokenin
      pushNotifications.sync(userId).catch(() => {});
    }
  }, [userId, loadProfile]);

  const goToDashboard = (refresh = false) => {
    setExpenseToEdit(null);
    setScreen('dashboard');
    if (refresh) setRefreshKey((k) => k + 1);
  };

  const handleLogout = async () => {
    // Telefoni nuk merr më njoftime për llogarinë që del (duhet sesioni, ndaj para daljes)
    await pushNotifications.detachDevice().catch(() => {});
    await authApi.logout();
    goToDashboard();
  };

  let content;
  if (!isSupabaseConfigured) content = <ConfigMissing />;
  else if (session === undefined) content = <Loading text="Duke kontrolluar sesionin..." />;
  else if (!session) content = <AuthScreen />;
  else if (profile === undefined) content = <Loading text="Duke ngarkuar profilin..." />;
  else if (!profile || !profile.household) {
    content = (
      <HouseholdSetupScreen
        userName={profile?.name || session.user.email}
        error={profileError}
        onDone={loadProfile}
        onLogout={handleLogout}
      />
    );
  } else if (screen === 'addExpense') {
    content = (
      <AddExpenseScreen
        currentUserId={profile.id}
        household={profile.household}
        expenseToEdit={expenseToEdit}
        onBack={() => goToDashboard()}
        onSaved={() => goToDashboard(true)}
      />
    );
  } else {
    content = (
      <DashboardScreen
        key={refreshKey}
        user={profile}
        household={profile.household}
        onLogout={handleLogout}
        onLeftHousehold={loadProfile}
        darkMode={darkMode}
        onToggleDark={handleToggleDark}
        onNavigateToAdd={() => {
          setExpenseToEdit(null);
          setScreen('addExpense');
        }}
        onNavigateToEdit={(expense) => {
          setExpenseToEdit(expense);
          setScreen('addExpense');
        }}
      />
    );
  }

  return (
    // key: kur ndërrohet tema, ekrani rivizatohet që edhe ngjyrat e ikonave (C.*) të ndjekin temën
    <View key={darkMode ? 'dark' : 'light'} className="flex-1 bg-slate-50 dark:bg-slate-950">
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      {content}
    </View>
  );
}
