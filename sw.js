const CACHE_NAME = 'tercihatlas-v11';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './css/styles.css?v=11',
  './js/app.js?v=11',
  './js/api.js?v=11',
  './js/analytics.js?v=11',
  './js/abroad.js?v=11',
  './js/charts.js?v=11',
  './js/map-cost.js?v=11',
  './js/pdf-parser.js?v=11',
  './js/utils.js?v=11',
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
