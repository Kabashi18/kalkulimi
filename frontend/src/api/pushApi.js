// ==============================================================================
// NJOFTIMET PUSH (Web Push API + Service Worker)
// ==============================================================================
// Subskriptimi i pajisjes ruhet te `user_push_subscriptions`; dërgimi bëhet nga
// Edge Function `send-push` kur shtohet shpenzim i përbashkët, pagesë ose anëtar i ri.

import { supabase, toAppError } from '../lib/supabaseClient';

const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY || '').trim();
// Përdoruesi që e aktivizoi njoftimet në këtë shfletues (që pas kyçjes të rilidhet vetëm ai)
const OWNER_KEY = 'kalkulimi-push-owner';

const readOwner = () => {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
};
const writeOwner = (userId) => {
  try {
    if (userId) localStorage.setItem(OWNER_KEY, userId);
    else localStorage.removeItem(OWNER_KEY);
  } catch {
    // localStorage mund të jetë i bllokuar (p.sh. dritare private)
  }
};

const urlBase64ToUint8Array = (base64) => {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
};

const isSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const getSubscription = async () => {
  if (!isSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration('/');
  return registration ? registration.pushManager.getSubscription() : null;
};

const saveSubscription = async (subscription) => {
  const { endpoint, keys } = subscription.toJSON();
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: endpoint,
    p_p256dh: keys?.p256dh,
    p_auth: keys?.auth,
    p_user_agent: navigator.userAgent
  });
  if (error) throw toAppError(error, 'Dështoi ruajtja e njoftimeve për këtë pajisje.');
};

export const pushApi = {
  isSupported,
  isConfigured: () => Boolean(VAPID_PUBLIC_KEY),

  // true kur kjo pajisje merr njoftime për përdoruesin `userId`
  isEnabled: async (userId) => {
    if (!isSupported() || Notification.permission !== 'granted') return false;
    return Boolean(await getSubscription()) && readOwner() === userId;
  },

  // "Aktivizo njoftimet push": kërkon lejen, regjistron service worker-in dhe ruan subskriptimin
  enable: async (userId) => {
    if (!isSupported()) {
      throw new Error('Ky shfletues nuk i mbështet njoftimet push. Në iPhone, shtojeni faqen te "Home Screen" dhe hapeni prej andej.');
    }
    if (!VAPID_PUBLIC_KEY) throw new Error('Mungon VITE_VAPID_PUBLIC_KEY në konfigurim.');

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Njoftimet janë bllokuar. Lejojini te cilësimet e shfletuesit për këtë faqe.');
    }

    await navigator.serviceWorker.register('/sw.js');
    const registration = await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      }));

    await saveSubscription(subscription);
    writeOwner(userId);
  },

  // Çaktivizon njoftimet në këtë pajisje
  disable: async () => {
    const subscription = await getSubscription();
    if (subscription) {
      await supabase.rpc('delete_push_subscription', { p_endpoint: subscription.endpoint });
      await subscription.unsubscribe();
    }
    writeOwner(null);
  },

  // Pas kyçjes: rifreskon subskriptimin në databazë (p.sh. nëse shfletuesi e ka ndryshuar)
  sync: async (userId) => {
    if (!isSupported() || Notification.permission !== 'granted' || readOwner() !== userId) return;
    const subscription = await getSubscription();
    if (subscription) await saveSubscription(subscription);
  },

  // Para daljes: kjo pajisje nuk duhet të marrë më njoftime për llogarinë që po del.
  // Subskriptimi i shfletuesit mbetet, që pas rikyçjes së të njëjtit përdorues të rilidhet vetë.
  detachDevice: async () => {
    const subscription = await getSubscription();
    if (subscription) await supabase.rpc('delete_push_subscription', { p_endpoint: subscription.endpoint });
  }
};
