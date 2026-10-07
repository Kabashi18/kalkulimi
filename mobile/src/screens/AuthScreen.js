import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../api/authApi';

const Field = ({ label, icon, ...props }) => (
  <View className="mb-4">
    <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">{label}</Text>
    <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3">
      <Ionicons name={icon} size={18} color="#94a3b8" />
      <TextInput placeholderTextColor="#94a3b8" className="flex-1 py-3 px-2 text-sm text-slate-800" {...props} />
    </View>
  </View>
);

// Kyçja dhe regjistrimi në një ekran (pas kyçjes, App e kap ndryshimin e sesionit automatikisht)
export default function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [householdCode, setHouseholdCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [notice, setNotice] = useState(null);

  const isLogin = mode === 'login';

  const handleSubmit = async () => {
    setErrorMsg(null);
    setNotice(null);
    try {
      setLoading(true);
      if (isLogin) {
        await authApi.login({ email, password });
      } else {
        const res = await authApi.register({ name, email, password, household_code: householdCode });
        if (res.needsConfirmation) {
          setNotice(res.message);
          setMode('login');
          setPassword('');
        }
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }} keyboardShouldPersistTaps="handled">
          <View className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <View className="items-center mb-6">
              <View className="w-14 h-14 bg-indigo-600 rounded-2xl items-center justify-center mb-3">
                <Ionicons name={isLogin ? 'wallet' : 'person-add'} size={28} color="#fff" />
              </View>
              <Text className="text-2xl font-black text-slate-800">
                {isLogin ? 'Mirësevini përsëri' : 'Krijo Llogari të Re'}
              </Text>
              <Text className="text-xs text-slate-400 mt-1 text-center">
                {isLogin ? 'Menaxhoni faturat dhe barazimin e banesës' : 'Bashkohu me banorët për të ndarë shpenzimet'}
              </Text>
            </View>

            {notice && (
              <View className="p-3 mb-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <Text className="text-xs font-semibold text-emerald-800">{notice}</Text>
              </View>
            )}
            {errorMsg && (
              <View className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-2xl">
                <Text className="text-xs font-medium text-rose-700">{errorMsg}</Text>
              </View>
            )}

            {!isLogin && (
              <Field label="Emri dhe Mbiemri" icon="person-outline" value={name} onChangeText={setName} placeholder="psh. Artan Berisha" />
            )}
            <Field
              label="Email Adresa"
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="artan@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Field
              label="Fjalëkalimi"
              icon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              placeholder={isLogin ? '••••••••' : 'Së paku 6 karaktere'}
              secureTextEntry
            />
            {!isLogin && (
              <Field
                label="Kodi i Banesës (opsional)"
                icon="key-outline"
                value={householdCode}
                onChangeText={(t) => setHouseholdCode(t.toUpperCase())}
                placeholder="psh. BANESA-1234"
                autoCapitalize="characters"
              />
            )}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              className={`bg-indigo-600 rounded-xl py-3.5 items-center mt-2 ${loading ? 'opacity-60' : ''}`}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-sm">{isLogin ? 'Kyçu në Llogari' : 'Krijo Llogarinë'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setMode(isLogin ? 'register' : 'login');
                setErrorMsg(null);
              }}
              className="mt-6 pt-5 border-t border-slate-100 items-center"
            >
              <Text className="text-xs text-slate-500">
                {isLogin ? 'Nuk keni ende një llogari? ' : 'Keni tashmë një llogari? '}
                <Text className="text-indigo-600 font-bold">{isLogin ? 'Krijo llogari' : 'Kyçu këtu'}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
