// ============================================================================
// SERVICE WORKER
// Cache do PWA, atualizacao offline basica e abertura de notificacoes push.
// ============================================================================

// ----------------------------------------------------------------------------
// 1. Lista de arquivos cacheados
// ----------------------------------------------------------------------------
const CACHE = 'cs-v8';
const ASSETS = [
  '/',
  '/login.html',
  '/dashboard.html',
  '/orcamentos.html',
  '/configuracoes.html',
  '/planos.html',
  '/pagamento.html',
  '/cs-shared.css',
  '/cs-pwa.js',
  '/cs-billing.js',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
];

// ----------------------------------------------------------------------------
// 2. Instalacao e ativacao do cache
// ----------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// ----------------------------------------------------------------------------
// 3. Estrategia de fetch: rede primeiro, cache como fallback
// ----------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, clone)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ----------------------------------------------------------------------------
// 4. Push notification e clique no aviso
// ----------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Central Simples',
    body: 'Voce tem uma nova atualizacao.',
    url: '/dashboard.html',
  };

  try {
    payload = {
      ...payload,
      ...(event.data ? event.data.json() : {}),
    };
  } catch {}

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Central Simples', {
      body: payload.body || 'Voce tem uma nova atualizacao.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: {
        url: payload.url || '/dashboard.html',
      },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/dashboard.html', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client && client.url.includes(self.location.origin)) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
