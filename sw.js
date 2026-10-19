// Plates Service Worker — offline support
// VERSION should match the ?v= numbers in index.html. If they ever drift
// apart, offline still works: lookups fall back to ignoring the ?v= part.
const VERSION = 14;
const CACHE_NAME = `plates-v${VERSION}`;
const NETWORK_TIMEOUT_MS = 3000;

// The exact addresses the page asks for, ?v= included, so offline loads find them.
const APP_FILES = [
  './',
  './index.html',
  `./index.css?v=${VERSION}`,
  `./app.js?v=${VERSION}`,
  './icon-512.jpg',
  './manifest.json',
];
// Nice to have offline, but a slow or blocked CDN must not stop the install.
const OPTIONAL_FILES = ['https://cdn.jsdelivr.net/npm/chart.js'];

// Install: save the app's files, then the optional ones, and activate at once
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_FILES);
    await Promise.all(OPTIONAL_FILES.map((url) => cache.add(url).catch(() => {})));
  })());
  self.skipWaiting();
});

// Activate: clean old caches immediately and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network first, so updates arrive straight away. If the network fails,
// or takes longer than NETWORK_TIMEOUT_MS (weak gym signal), use the saved copy.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let saving = Promise.resolve();
  const network = fetch(request).then((response) => {
    if (response && response.status === 200 && response.type === 'basic') {
      const copy = response.clone();
      saving = caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    }
    return response;
  });
  // Let the cache update finish even if the saved copy answered first.
  event.waitUntil(network.then(() => saving, () => {}));

  event.respondWith((async () => {
    const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS));
    const fresh = await Promise.race([network.catch(() => null), timeout]);
    if (fresh) return fresh;
    const saved = await caches.match(request, { ignoreSearch: true });
    return saved || network; // nothing saved: keep waiting for the network
  })());
});
