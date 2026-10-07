import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AuthScreen from './src/screens/AuthScreen';
import HouseholdSetupScreen from './src/screens/HouseholdSetupScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AddExpenseScreen from './src/screens/AddExpenseScreen';
import { authApi } from './src/api/authApi';
import { householdApi } from './src/api/householdApi';
import { isSupabaseConfigured, supabaseConfigError } from './src/lib/supabaseClient';

const Loading = ({ text }) => (
  <View className="flex-1 items-center justify-center bg-slate-50">
    <ActivityIndicator size="large" color="#4f46e5" />
    <Text className="text-slate-500 mt-3 text-sm">{text}</Text>
  </View>
);

const ConfigMissing = () => (
  <SafeAreaView className="flex-1 bg-slate-50 justify-center px-6">
    <View className="bg-white rounded-3xl p-6 border border-amber-200">
      <Text className="text-lg font-black text-slate-800 mb-2">Mungon konfigurimi i Supabase</Text>
      <Text className="text-xs font-semibold text-amber-900 bg-amber-50 p-3 rounded-xl mb-3">{supabaseConfigError}</Text>
      <Text className="text-sm text-slate-600">
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
    if (userId) loadProfile();
  }, [userId, loadProfile]);

  const goToDashboard = (refresh = false) => {
    setExpenseToEdit(null);
    setScreen('dashboard');
    if (refresh) setRefreshKey((k) => k + 1);
  };

  const handleLogout = async () => {
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
    <View className="flex-1 bg-slate-50">
      <StatusBar style="dark" />
      {content}
    </View>
  );
}
