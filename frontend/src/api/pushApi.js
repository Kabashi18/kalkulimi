// ==============================================================================
// NJOFTIMET PUSH (Web Push API + Service Worker)
// ==============================================================================
// Subskriptimi i pajisjes ruhet te `user_push_subscriptions`; dërgimi bëhet nga
// Edge Function `send-push` kur shtohet shpenzim i përbashkët, pagesë ose anëtar i ri.

import { supabase, toAppError } from '../lib/supabaseClient';

const VAPID_PUBLIC_KEY = (
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BJ_zFMvA-lTGRDItQ8JxNseFqm2OqvCscK_ydHIaubDdEOfQpmgXrke2AP8oXgOJQcsmpES8ZBIZPpwbBW6WXso'
).trim();
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

// Subskriptimi është krijuar me çelësin VAPID aktual? (pas ndërrimit të çelësave të vjetrat nuk funksionojnë)
const matchesCurrentKey = (subscription) => {
  const key = subscription?.options?.applicationServerKey;
  if (!key) return true; // shfletuesi nuk e tregon -> e pranojmë
  const current = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  const used = new Uint8Array(key);
  return used.length === current.length && used.every((b, i) => b === current[i]);
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
    const subscription = await getSubscription();
    return Boolean(subscription) && matchesCurrentKey(subscription) && readOwner() === userId;
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
    let existing = await registration.pushManager.getSubscription();
    if (existing && !matchesCurrentKey(existing)) {
      await existing.unsubscribe();
      existing = null;
    }
    const subscription =
      existing ||
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
    if (!subscription) return;
    if (matchesCurrentKey(subscription)) {
      await saveSubscription(subscription);
    } else {
      // Çelës i vjetër: hiqet; përdoruesi i riaktivizon te menuja e profilit
      await supabase.rpc('delete_push_subscription', { p_endpoint: subscription.endpoint });
      await subscription.unsubscribe();
      writeOwner(null);
    }
  },

  // Para daljes: kjo pajisje nuk duhet të marrë më njoftime për llogarinë që po del.
  // Subskriptimi i shfletuesit mbetet, që pas rikyçjes së të njëjtit përdorues të rilidhet vetë.
  detachDevice: async () => {
    const subscription = await getSubscription();
    if (subscription) await supabase.rpc('delete_push_subscription', { p_endpoint: subscription.endpoint });
  }
};
