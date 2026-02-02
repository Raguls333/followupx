const CACHE_NAME = 'followupx-v1';
const RUNTIME_CACHE = 'followupx-runtime';

// Files to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS).catch(() => {
          console.log('[ServiceWorker] Some assets failed to cache');
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API requests - network first
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Only clone and cache if response body is usable
          if (response.status === 200 && response.bodyUsed === false) {
            caches.open(RUNTIME_CACHE).then(c => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Return cached response if network fails
          return caches.match(request).then(response => {
            return response || new Response(
              JSON.stringify({ offline: true, message: 'You are offline' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
  }
  // Static assets - cache first
  else {
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            return response;
          }
          
          return fetch(request)
            .then(response => {
              // Cache successful responses
              if (response && response.status === 200 && response.type !== 'error') {
                const cache = caches.open(CACHE_NAME);
                cache.then(c => c.put(request, response.clone()));
              }
              return response;
            });
        })
        .catch(() => {
          // Return offline page for navigation requests
          if (request.destination === 'document') {
            return caches.match('/index.html');
          }
        })
    );
  }
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
