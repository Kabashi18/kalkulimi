// Service Worker i Kalkulimit: shfaq njoftimet push edhe kur aplikacioni është i mbyllur.
// Njoftimet dërgohen nga Edge Function `send-push` (supabase/functions/send-push).

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Kalkulimi', {
      body: data.body || '',
      tag: data.tag,
      lang: 'sq',
      data: { url: data.url || '/' }
    })
  );
});

// Klikimi i njoftimit: fokuson skedën e hapur të aplikacionit ose hap një të re
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.location.origin));
      if (open) return open.focus();
      return self.clients.openWindow(url);
    })
  );
});
