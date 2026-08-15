const CACHE_NAME = 'mgh-hymnbook-v2';
const APP_ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './css/theme.css',
  './css/search-enhancements.css',
  './js/bootstrap.js',
  './js/app.js',
  './js/pwa.js',
  './js/usability.js',
  './js/search-enhancements.js',
  './data/new-believers.html',
  './data/gospel.html',
  './manifest.webmanifest',
  './icons/app-icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      });

      // Fast cached startup, with network refresh in the background.
      if (cached) {
        event.waitUntil(network.catch(() => {}));
        return cached;
      }

      return network.catch(() => caches.match('./index.html'));
    })
  );
});
