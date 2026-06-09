/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

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
        icon: event.data.icon || '/icon.svg',
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
        self.clients.openWindow('/');
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
  const { phrases, lastNotified, frequency, defaultTargetLanguage, notificationSessionSize } = data;
  const now = Date.now();
  const hoursSince = (now - lastNotified) / (1000 * 60 * 60);

  let shouldCheck = false;
  if (frequency === '2h' && hoursSince >= 2) shouldCheck = true;
  else if (frequency === '6h' && hoursSince >= 6) shouldCheck = true;
  else if (frequency === '24h' && hoursSince >= 24) shouldCheck = true;

  if (!shouldCheck || !Array.isArray(phrases) || phrases.length === 0) return;

  const includeMastered = Math.random() < 0.1;
  const count = notificationSessionSize || 10;

  const scored = phrases.map((p: any) => {
    const daysSince = Math.max(0.1, (now - p.dateAdded) / (1000 * 60 * 60 * 24));
    const recentBoost = (p.difficultyScore > 20 && daysSince <= 3) ? 60 : 0;
    const randomVal = Math.random() * 30;
    const masteredPenalty = (!includeMastered && p.difficultyScore <= 20) ? -150 : 0;
    const score = p.difficultyScore + recentBoost + randomVal + masteredPenalty;
    return { phrase: p, score: Math.max(0, score) };
  });

  const eligible = scored.filter((s: any) => s.score > 0);
  if (eligible.length === 0) return;

  eligible.sort((a: any, b: any) => b.score - a.score);
  const session = eligible.slice(0, Math.min(count, eligible.length)).map((s: any) => s.phrase);

  const ids = session.map((p: any) => p.id);
  cache.put('/pending-practice-ids', new Response(JSON.stringify(ids), { headers: { 'Content-Type': 'application/json' } }));

  const teasers = session.slice(0, Math.min(3, session.length));
  const teaserText = teasers.map((p: any) => p.russianPhrase).join(', ');
  const title = 'Ready to practice?';
  const body = `Review words like: ${teaserText} — Tap to start a ${session.length}-word session!`;

  self.registration.showNotification(title, {
    body,
    icon: '/icon.svg',
  });
}
