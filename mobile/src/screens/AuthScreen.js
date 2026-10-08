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
import { C } from '../lib/theme';

const Field = ({ label, icon, ...props }) => (
  <View className="mb-4">
    <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">{label}</Text>
    <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3">
      <Ionicons name={icon} size={18} color={C.faint} />
      <TextInput placeholderTextColor={C.faint} className="flex-1 py-3 px-2 text-sm text-slate-800 dark:text-slate-200" {...props} />
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
  const isForgot = mode === 'forgot';

  // "Keni harruar fjalëkalimin?": lidhja në email hap faqen web (Site URL e projektit),
  // ku vendoset fjalëkalimi i ri; pastaj përdoruesi kyçet këtu normalisht.
  const handleForgot = async () => {
    setErrorMsg(null);
    setNotice(null);
    try {
      setLoading(true);
      await authApi.requestPasswordReset(email);
      setNotice(`Nëse ekziston një llogari me ${email.trim().toLowerCase()}, ju dërguam një email. Hapni lidhjen, vendosni fjalëkalimin e ri në faqen që hapet, pastaj kyçuni këtu.`);
      setMode('login');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

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
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }} keyboardShouldPersistTaps="handled">
          <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <View className="items-center mb-6">
              <View className="w-14 h-14 bg-indigo-600 dark:bg-indigo-400 rounded-2xl items-center justify-center mb-3">
                <Ionicons name={isLogin ? 'wallet' : 'person-add'} size={28} color={C.onBrand} />
              </View>
              <Text className="text-2xl font-black text-slate-800 dark:text-slate-200">
                {isForgot ? 'Keni harruar fjalëkalimin?' : isLogin ? 'Mirësevini përsëri' : 'Krijo Llogari të Re'}
              </Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
                {isLogin ? 'Menaxhoni faturat dhe barazimin e banesës' : 'Bashkohu me banorët për të ndarë shpenzimet'}
              </Text>
            </View>

            {notice && (
              <View className="p-3 mb-4 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                <Text className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">{notice}</Text>
              </View>
            )}
            {errorMsg && (
              <View className="p-3 mb-4 bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 rounded-2xl">
                <Text className="text-xs font-medium text-rose-700 dark:text-rose-300">{errorMsg}</Text>
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
            {!isForgot && (
              <Field
                label="Fjalëkalimi"
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                placeholder={isLogin ? '••••••••' : 'Së paku 6 karaktere'}
                secureTextEntry
              />
            )}
            {isLogin && (
              <TouchableOpacity onPress={() => { setMode('forgot'); setErrorMsg(null); setNotice(null); }} className="items-end -mt-2 mb-3">
                <Text className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">Keni harruar fjalëkalimin?</Text>
              </TouchableOpacity>
            )}
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
              onPress={isForgot ? handleForgot : handleSubmit}
              disabled={loading}
              className={`bg-indigo-600 dark:bg-indigo-400 rounded-xl py-3.5 items-center mt-2 ${loading ? 'opacity-60' : ''}`}
            >
              {loading ? (
                <ActivityIndicator color={C.onBrand} />
              ) : (
                <Text className="text-white dark:text-slate-900 font-bold text-sm">{isForgot ? 'Dërgo lidhjen' : isLogin ? 'Kyçu në Llogari' : 'Krijo Llogarinë'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setMode(isLogin ? 'register' : 'login');
                setErrorMsg(null);
                setNotice(null);
              }}
              className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 items-center"
            >
              <Text className="text-xs text-slate-500 dark:text-slate-400">
                {isLogin ? 'Nuk keni ende një llogari? ' : 'Keni tashmë një llogari? '}
                <Text className="text-indigo-600 dark:text-indigo-400 font-bold">{isLogin ? 'Krijo llogari' : 'Kyçu këtu'}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
