import React, { useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DashboardScreen from './src/screens/DashboardScreen';
import AddExpenseScreen from './src/screens/AddExpenseScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);

  // ID e përdoruesit të kyçur (Artani = 1)
  const currentUserId = 1;

  const handleExpenseAdded = () => {
    // Rrit çelësin për të detyruar rifreskimin e të dhënave në Dashboard
    setRefreshKey((prev) => prev + 1);
    setCurrentScreen('dashboard');
  };

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar style="dark" />

      {currentScreen === 'dashboard' ? (
        <DashboardScreen
          key={refreshKey}
          onNavigateToAdd={() => setCurrentScreen('addExpense')}
          currentUserId={currentUserId}
        />
      ) : (
        <AddExpenseScreen
          onBack={() => setCurrentScreen('dashboard')}
          onExpenseAdded={handleExpenseAdded}
          currentUserId={currentUserId}
        />
      )}
    </View>
  );
}
