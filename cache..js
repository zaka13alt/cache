const CACHE_NAME = 'my-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/studies.html'
];

// Define paths or keywords you want to automatically cache on fetch
const CACHE_PATTERNS = [
  '/api/',
  '/images/',
  'product',
  'vendor'
];

// Helper function to check if a URL matches any pattern or keyword
function shouldCacheUrl(url) {
  return CACHE_PATTERNS.some((pattern) => url.includes(pattern));
}

// Cache core app shell during install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Cache Worker] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Clean up old caches during activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Cache Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Intercept fetch requests
self.addEventListener('fetch', (event) => {
  const requestUrl = event.request.url;

  // Check if the request matches our custom path/keyword criteria
  if (shouldCacheUrl(requestUrl)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          // Return cached response if found
          if (cachedResponse) {
            // Optional: fetch a fresh version in the background (stale-while-revalidate)
            fetch(event.request).then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
            }).catch(() => {/* ignore network errors */});

            return cachedResponse;
          }

          // Otherwise, fetch from network, cache it, and return it
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
  } else {
    // Default behavior for other requests: check cache first, fallback to network
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request);
      })
    );
  }
});
