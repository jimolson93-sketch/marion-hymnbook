const CACHE_NAME = 'mgh-hymnbook-v11';
const APP_ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './css/theme.css',
  './css/reading-enhancements.css',
  './js/bootstrap.js',
  './js/app.js',
  './js/reading-enhancements.js',
  './js/pwa.js',
  './data/new-believers.html',
  './data/gospel.html',
  './manifest.webmanifest',
  './icons/app-icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )),
      self.clients.claim()
    ])
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  const isFreshnessSensitive = ['style', 'script'].includes(request.destination);

  if (isFreshnessSensitive) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200 && response.type !== 'opaque') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request)
        .then(response => {
          if (response && response.status === 200 && response.type !== 'opaque') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
