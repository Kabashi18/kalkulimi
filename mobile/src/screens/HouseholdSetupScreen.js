import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { householdApi } from '../api/householdApi';

// Shfaqet pas kyçjes kur përdoruesi nuk bën ende pjesë në asnjë banesë
export default function HouseholdSetupScreen({ userName, error = null, onDone, onLogout }) {
  const [mode, setMode] = useState('join');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(error);

  const handleSubmit = async () => {
    setErrorMsg(null);
    try {
      setLoading(true);
      if (mode === 'join') await householdApi.joinHousehold(code);
      else await householdApi.createHousehold(name);
      await onDone();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 justify-center px-5">
      <View className="bg-white rounded-3xl p-6 border border-slate-100">
        <View className="items-center mb-5">
          <View className="w-14 h-14 bg-indigo-600 rounded-2xl items-center justify-center mb-3">
            <Ionicons name="home" size={28} color="#fff" />
          </View>
          <Text className="text-2xl font-black text-slate-800">Mirë se erdhe, {userName?.split(' ')?.[0]}!</Text>
          <Text className="text-xs text-slate-400 mt-1 text-center">
            Bashkohu me banesën e shokëve ose krijo një të re
          </Text>
        </View>

        <View className="flex-row bg-slate-200 rounded-2xl p-1 mb-5">
          {[
            { id: 'join', label: 'Kam një kod', icon: 'key-outline' },
            { id: 'create', label: 'Krijo banesë', icon: 'add' }
          ].map((opt) => (
            <TouchableOpacity
              key={opt.id}
              onPress={() => {
                setMode(opt.id);
                setErrorMsg(null);
              }}
              className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${mode === opt.id ? 'bg-white' : ''}`}
            >
              <Ionicons name={opt.icon} size={16} color={mode === opt.id ? '#4338ca' : '#475569'} />
              <Text className={`text-xs font-bold ml-1.5 ${mode === opt.id ? 'text-indigo-700' : 'text-slate-600'}`}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {errorMsg && (
          <View className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-2xl">
            <Text className="text-xs font-medium text-rose-700">{errorMsg}</Text>
          </View>
        )}

        <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
          {mode === 'join' ? 'Kodi i Banesës' : 'Emri i Banesës'}
        </Text>
        {mode === 'join' ? (
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="BANESA-1234"
            placeholderTextColor="#94a3b8"
            autoCapitalize="characters"
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base font-bold tracking-widest text-slate-800 text-center"
          />
        ) : (
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="psh. Banesa në Qendër"
            placeholderTextColor="#94a3b8"
            maxLength={80}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800"
          />
        )}
        <Text className="text-xs text-slate-400 mt-1.5">
          {mode === 'join'
            ? 'Kërkojani kodin shokut që e ka krijuar banesën.'
            : "Do të marrësh një kod unik (p.sh. BANESA-4821) për t'ua dhënë shokëve."}
        </Text>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          className={`bg-indigo-600 rounded-xl py-3.5 items-center mt-5 ${loading ? 'opacity-60' : ''}`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-sm">{mode === 'join' ? 'Bashkohu me Banesën' : 'Krijo Banesën'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onLogout} className="mt-5 pt-4 border-t border-slate-100 items-center">
          <Text className="text-xs font-semibold text-slate-500">Dil nga llogaria</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
