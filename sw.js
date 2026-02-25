const CACHE_NAME = 'faceblock-v1';
const PRECACHE_URLS = [
  './',
  'app.html',
  'index.html',
  'styles.css',
  'landing.css',
  'before-after.js',
  'js/app.js',
  'js/ui.js',
  'js/processor.js',
  'js/detector.js',
  'js/effects.js',
  'js/constants.js',
  'js/canvas-utils.js',
  'manifest.json',
  'assets/icon-192.png',
  'assets/icon-512.png',
];

// CDN resources cached on first use (not precached to avoid CORS issues)
const CDN_HOSTS = [
  'cdn.jsdelivr.net',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip blob: and data: URLs
  if (url.protocol === 'blob:' || url.protocol === 'data:') return;

  // Network-first for CDN resources (face-api model files, etc.)
  if (CDN_HOSTS.some((host) => url.hostname === host)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for local assets
  event.respondWith(
    caches.match(event.request)
      .then((cached) => cached || fetch(event.request))
  );
});
