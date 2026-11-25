const CACHE_NAME = 'tercihatlas-v14';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json?v=14',
  './favicon.png?v=14',
  './apple-touch-icon.png?v=14',
  './icon-192.png?v=13',
  './icon-512.png',
  './icon.svg',
  './css/styles.css?v=14',
  './js/app.js?v=14',
  './js/api.js?v=14',
  './js/analytics.js?v=14',
  './js/abroad.js?v=14',
  './js/charts.js?v=14',
  './js/map-cost.js?v=14',
  './js/pdf-parser.js?v=14',
  './js/utils.js?v=14',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/') || url.hostname.includes('workers.dev') || url.hostname.includes('jsdelivr.net')) return;

  const req = url.origin === self.location.origin ? new Request(event.request, { cache: 'no-cache' }) : event.request;

  event.respondWith(
    fetch(req)
      .then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
