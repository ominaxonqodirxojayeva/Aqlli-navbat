/*
 * Aqlli Navbat — Service Worker
 *
 * Vazifalari:
 *  1. Ilova qobig'ini keshlab, internet sekin yoki yo'q bo'lganda ham
 *     sahifa ochilishini ta'minlash.
 *  2. Push bildirishnomalarini qabul qilib ko'rsatish (navbat chaqirilganda).
 *
 * Muhim: Supabase so'rovlari (boshqa domen) hech qachon keshlanmaydi —
 * navbat ma'lumotlari doim tirik bo'lishi shart.
 */

const VERSION = 'v2';
const SHELL_CACHE = `aqlli-navbat-shell-${VERSION}`;
const ASSET_CACHE = `aqlli-navbat-assets-${VERSION}`;

const SHELL_URLS = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Boshqa domenlar (Supabase, Google Fonts) — brauzerning o'z mexanizmiga qoldiramiz
  if (url.origin !== self.location.origin) return;

  // Sahifaga o'tish: avval tarmoq, ishlamasa keshdagi qobiq
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match('/index.html');
          return cached ?? Response.error();
        })
    );
    return;
  }

  // Statik fayllar (nomi hash'langan, o'zgarmaydi): avval kesh
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            const copy = response.clone();
            void caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
  }
});

/* ---------------------- Push bildirishnomalar ---------------------- */

self.addEventListener('push', (event) => {
  let payload = { title: 'Aqlli Navbat', body: 'Navbatingiz yangilandi.', url: '/my-queue' };

  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'aqlli-navbat-queue',
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: payload.url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? '/my-queue';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          void client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
