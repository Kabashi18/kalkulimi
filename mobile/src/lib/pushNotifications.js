import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase, toAppError } from './supabaseClient';

// Njoftimet push në telefon (Expo Push). Tokeni ruhet te `user_expo_push_tokens`;
// dërgimi bëhet nga Edge Function `send-push`, me të njëjtat ngjarje si në web.

// Tokeni dhe përdoruesi që i aktivizoi njoftimet në këtë telefon (që pas kyçjes të rilidhet vetëm ai)
const TOKEN_KEY = 'kalkulimi-expo-push-token';
const OWNER_KEY = 'kalkulimi-push-owner';

// Njoftimet shfaqen edhe kur app-i është i hapur
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false })
});

const read = async (key) => {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = async (key, value) => {
  try {
    if (value) await AsyncStorage.setItem(key, value);
    else await AsyncStorage.removeItem(key);
  } catch {
    // AsyncStorage mund të dështojë rrallë; njoftimet mbeten në databazë
  }
};

// projectId i EAS (krijohet me `npx eas init`), i domosdoshëm për tokenin Expo
const getProjectId = () => Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;

const saveToken = async (token) => {
  const { error } = await supabase.rpc('save_expo_push_token', { p_token: token, p_platform: Platform.OS });
  if (error) throw toAppError(error, 'Dështoi ruajtja e njoftimeve për këtë telefon.');
};

const deleteToken = async (token) => {
  if (token) await supabase.rpc('delete_expo_push_token', { p_token: token });
};

export const pushNotifications = {
  // true kur ky telefon merr njoftime për përdoruesin `userId`
  isEnabled: async (userId) => {
    const [token, owner, { status }] = await Promise.all([read(TOKEN_KEY), read(OWNER_KEY), Notifications.getPermissionsAsync()]);
    return Boolean(token) && owner === userId && status === 'granted';
  },

  // "Aktivizo njoftimet push": kërkon lejen, merr tokenin Expo dhe e ruan në databazë
  enable: async (userId) => {
    if (!Device.isDevice) throw new Error('Njoftimet push punojnë vetëm në telefon të vërtetë, jo në emulator.');
    const projectId = getProjectId();
    if (!projectId) throw new Error('Mungon projectId i EAS. Ekzekutoni "npx eas init" te dosja mobile.');

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Njoftimet e banesës',
        importance: Notifications.AndroidImportance.HIGH
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== 'granted') {
      throw new Error('Njoftimet janë bllokuar. Lejojini te Cilësimet e telefonit → Kalkulimi → Njoftimet.');
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await saveToken(token);
    await write(TOKEN_KEY, token);
    await write(OWNER_KEY, userId);
  },

  // Çaktivizon njoftimet në këtë telefon (leja e sistemit mbetet, por databaza nuk dërgon më)
  disable: async () => {
    await deleteToken(await read(TOKEN_KEY));
    await write(TOKEN_KEY, null);
    await write(OWNER_KEY, null);
  },

  // Pas kyçjes: rifreskon tokenin në databazë nëse ky përdorues i kishte aktivizuar më parë
  sync: async (userId) => {
    const projectId = getProjectId();
    if (!Device.isDevice || !projectId || (await read(OWNER_KEY)) !== userId) return;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const previous = await read(TOKEN_KEY);
    if (previous && previous !== token) await deleteToken(previous);
    await saveToken(token);
    await write(TOKEN_KEY, token);
  },

  // Para daljes: telefoni nuk merr më njoftime për llogarinë që po del.
  // Tokeni mbetet lokalisht, që pas rikyçjes së të njëjtit përdorues të rilidhet vetë.
  detachDevice: async () => {
    await deleteToken(await read(TOKEN_KEY));
  }
};
