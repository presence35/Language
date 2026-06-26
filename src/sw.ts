/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.clients.claim();
});

registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({ cacheName: 'pages' })
);

registerRoute(
  ({ url }) => url.hostname === 'flagcdn.com',
  new CacheFirst({
    cacheName: 'flag-images',
    plugins: [
      { cacheableResponse: { statuses: [0, 200] } } as any,
    ],
  })
);

self.addEventListener('message', (event) => {
  if (event.data?.type === 'show-notification') {
    event.waitUntil(
      self.registration.showNotification(event.data.title || '', {
        body: event.data.body || '',
        icon: event.data.icon || (self.registration.scope + 'icons/icon.svg'),
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      const cache = await caches.open('notification-state');
      const resp = await cache.match('/pending-practice-ids');
      let wordIds: string[] | undefined;
      if (resp) {
        try { wordIds = await resp.json(); } catch {}
      }
      if (clientList.length > 0) {
        const client = clientList[0];
        client.focus();
        client.postMessage({ type: 'navigate-practice', wordIds });
      } else if (self.clients.openWindow) {
        self.clients.openWindow(self.registration.scope);
      }
    })
  );
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-notifications') {
    event.waitUntil(handlePeriodicCheck());
  }
});

async function handlePeriodicCheck() {
  const cache = await caches.open('notification-state');
  const response = await cache.match('/notification-state');
  if (!response) return;

  const data = await response.json();
  const { phrases, lastNotified, frequency, notificationSessionSize } = data;
  const now = Date.now();

  let freqMs = 2 * 60 * 60 * 1000;
  if (frequency === '6h') freqMs = 6 * 60 * 60 * 1000;
  else if (frequency === '24h') freqMs = 24 * 60 * 60 * 1000;

  if (now - lastNotified < freqMs) return;
  if (!Array.isArray(phrases) || phrases.length === 0) return;

  const count = notificationSessionSize || 10;

  const due = phrases.filter((p: any) => p.nextReviewDate <= now);
  due.sort((a: any, b: any) => {
    const overdueA = now - a.nextReviewDate;
    const overdueB = now - b.nextReviewDate;
    return overdueB - overdueA;
  });

  let session: any[];
  if (due.length >= count) {
    session = due.slice(0, count);
  } else {
    const notDue = phrases.filter((p: any) => p.nextReviewDate > now);
    notDue.sort((a: any, b: any) => a.nextReviewDate - b.nextReviewDate);
    session = [...due, ...notDue.slice(0, count - due.length)];
  }

  if (session.length === 0) return;

  const ids = session.map((p: any) => p.id);
  cache.put('/pending-practice-ids', new Response(JSON.stringify(ids), { headers: { 'Content-Type': 'application/json' } }));

  const teasers = session.slice(0, Math.min(3, session.length));
  const teaserText = teasers.map((p: any) => p.russianPhrase).join(', ');
  const title = 'Ready to practice?';
  const body = `Review words like: ${teaserText} — Tap to start a ${session.length}-word session!`;

  self.registration.showNotification(title, {
    body,
    icon: self.registration.scope + 'icons/icon.svg',
  });
}
