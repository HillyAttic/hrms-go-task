// Progressive Web App Service Worker
// This service worker handles offline functionality and PWA installation
// VERSION: 2.1 - Force logo cache refresh for existing users

const CACHE_NAME = 'edventurehub-dashboard-v4';

// Only cache truly static assets that won't change between deployments
const STATIC_ASSETS = [
  '/manifest.json',
  '/images/logo/logo-192.png',
  '/images/logo/logo-512.png',
  '/images/logo/logo-maskable-192.png',
  '/images/logo/logo-maskable-512.png',
  '/images/logo/apple-touch-icon.png',
  '/images/logo/logo-icon.svg',
  '/offline.html'
];

// Install event - cache only truly static assets
self.addEventListener('install', (event) => {
  console.log('[SW v2.1] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW v2.1] Caching static assets');
        // Use addAll with error handling - don't fail install if some assets are missing
        return Promise.allSettled(
          STATIC_ASSETS.map(asset => cache.add(asset).catch(err => {
            console.warn('[SW v2.1] Failed to cache:', asset, err.message);
          }))
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up ALL old caches to prevent stale content
self.addEventListener('activate', (event) => {
  console.log('[SW v2.1] Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW v2.1] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - NETWORK FIRST for everything except static assets
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip browser extensions
  if (event.request.url.startsWith('chrome-extension://') ||
      event.request.url.startsWith('moz-extension://')) {
    return;
  }

  // Skip Firebase/Google API calls - always go to network
  if (event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('identitytoolkit.googleapis.com') ||
      event.request.url.includes('firebaseinstallations.googleapis.com') ||
      event.request.url.includes('fcmregistrations.googleapis.com')) {
    return;
  }

  // Skip API requests - always go to network, NO caching
  if (event.request.url.includes('/api/')) {
    return;
  }

  // CRITICAL: Never cache Next.js page navigations or _next/static JS/CSS chunks
  // These change on every deployment and serving stale ones causes client-side crashes
  if (event.request.mode === 'navigate' || 
      event.request.url.includes('/_next/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Only if network fails, try to serve offline page for navigations
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
        return new Response('Network error', { status: 503 });
      })
    );
    return;
  }

  // For truly static assets (images, manifest), use cache-first strategy
  const isStaticAsset = STATIC_ASSETS.some(asset => event.request.url.endsWith(asset)) ||
    event.request.url.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|avif)$/);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request).then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
            return networkResponse;
          });
        })
        .catch(() => {
          return new Response('', { status: 503 });
        })
    );
    return;
  }

  // All other requests - network only, no caching
  // This prevents stale JS/CSS/HTML from being served after deployments
});

// Handle push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || 'EdVentureHub Dashboard';
      const options = {
        body: data.body || 'You have a new notification',
        icon: '/images/logo/logo-192.png',
        badge: '/images/logo/logo-icon.svg',
        data: { url: data.url || '/' },
        actions: data.actions || []
      };

      event.waitUntil(
        self.registration.showNotification(title, options)
      );
    } catch (error) {
      console.error('[SW v2.1] Push notification error:', error);
    }
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  // No-op
});

// Handle skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW v2.1] Skip waiting requested');
    self.skipWaiting();
  }
});

console.log('[SW v2.1] Service worker loaded successfully');