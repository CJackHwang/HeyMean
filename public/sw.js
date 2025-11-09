// Minimal, network-first service worker to avoid heavy caching.
const CACHE_NAME = 'hm-runtime-v1';

self.addEventListener('install', (event) => {
  // Skip waiting so new SW activates ASAP
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clear any old caches to avoid stale content
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => k !== CACHE_NAME && caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only handle same-origin GET requests
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      try {
        // Network first to keep content fresh
        const fresh = await fetch(req);
        // Optionally put in a very short-lived cache for offline fallback
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        // Fallback to cache if offline
        const cached = await caches.match(req);
        if (cached) return cached;
        // Last resort: for navigation requests, serve index.html to allow SPA routing offline
        if (req.mode === 'navigate') {
          return caches.match('/index.html');
        }
        throw e;
      }
    })()
  );
});

