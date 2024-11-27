const CACHE_NAME = 'storywrapper-v2'; // Incremented version
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/main.css',
    '/js/app.js',
    '/js/modules/editor.js',
    '/js/modules/preview.js',
    '/js/modules/settings.js',
    '/js/modules/theme.js',
    '/js/modules/storage.js',
    '/js/modules/sw-manager.js',
    '/js/utils/helpers.js',
    '/js/utils/markdown.js',
    '/manifest.json',
    '/icons/icon-192x192.svg',
    '/icons/icon-512x512.svg',
    '/icons/badge-72x72.svg',
    '/icons/new-96x96.svg',
    '/icons/continue-96x96.svg',
    OFFLINE_URL
];

// Install event - cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, falling back to network
self.addEventListener('fetch', event => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }

                return fetch(event.request)
                    .then(response => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response
                        const responseToCache = response.clone();

                        // Add to cache
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // If offline and requesting a page, show offline page
                        if (event.request.mode === 'navigate') {
                            return caches.match(OFFLINE_URL);
                        }
                    });
            })
    );
});

// Background sync event
self.addEventListener('sync', event => {
    if (event.tag === 'sync-content') {
        event.waitUntil(syncContent());
    }
});

// Push notification event
self.addEventListener('push', event => {
    const options = {
        body: event.data.text(),
        icon: '/icons/icon-192x192.svg',
        badge: '/icons/badge-72x72.svg',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'View Update'
            },
            {
                action: 'close',
                title: 'Close'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('StoryWrapper Update', options)
    );
});

// Notification click event
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.matchAll({ type: 'window' })
                .then(clientList => {
                    if (clientList.length > 0) {
                        clientList[0].focus();
                    } else {
                        clients.openWindow('/');
                    }
                })
        );
    }
});

// Message event - handle skip waiting
self.addEventListener('message', event => {
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Utility function to sync content
async function syncContent() {
    // Implement content syncing logic here
    // This could involve sending cached changes to a server
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();

    // Process each cached request
    return Promise.all(
        requests.map(async request => {
            if (request.url.includes('/api/')) {
                try {
                    const response = await fetch(request);
                    await cache.put(request, response);
                } catch (error) {
                    console.error('Sync failed for:', request.url);
                }
            }
        })
    );
}
