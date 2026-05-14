// Bump this on every meaningful change to the caching strategy — the
// `activate` handler deletes every cache whose name doesn't match, so a
// version bump wipes all stale entries from previous deploys.
const CACHE_NAME = 'dreamerz-pwa-v3';
const OFFLINE_URL = '/index.html';

self.addEventListener('install', (event) => {
  // Take over immediately, replacing any older service worker version.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  // Never cache API responses — they may carry authenticated data and must
  // always be fresh.
  if (request.url.includes('/api/')) {
    return;
  }

  // Navigation requests (the HTML app shell): NETWORK-FIRST.
  // The previous cache-first strategy served the old index.html on every
  // load after a deploy, so users had to refresh several times before the
  // new build appeared. Network-first means a new deploy is picked up on
  // the very next load; the cached copy is only a fallback for offline use.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(OFFLINE_URL, clone));
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Hashed build assets (/static/js/*, /static/css/*) are content-addressed:
  // a new build emits new filenames, so an old cache entry can never be
  // stale. Serve those cache-first for speed. Everything else (fonts,
  // images, manifest) uses stale-while-revalidate.
  const isHashedAsset = request.url.includes('/static/');

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (isHashedAsset && cachedResponse) {
        return cachedResponse;
      }

      const networkFetch = fetch(request)
        .then((response) => {
          if (
            response &&
            response.status === 200 &&
            request.url.startsWith(self.location.origin)
          ) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkFetch;
    })
  );
});
