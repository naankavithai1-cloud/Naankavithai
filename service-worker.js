// =========================================================
// 16. service-worker.js - PWA OFFLINE CACHING LOGIC
// =========================================================

const CACHE_NAME = 'nan-kavithai-v1-static'; // Cache name
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/main.js',
    '/poem.html',
    // Include all core HTML files for offline access
    '/profile.html',
    '/earnings.html',
    '/settings.html',
    '/leaderboard.html',
    // Basic images/fonts needed for UI (assuming they are in the 'images' folder)
    '/images/icon-192x192.png',
    // Note: Firebase/Firestore dynamic data cannot be reliably cached here, 
    // only the static shell (HTML, CSS, JS) is cached.
];

// Install event: Caching all static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache and added all static assets.');
                return cache.addAll(urlsToCache);
            })
    );
});

// Activate event: Cleaning up old caches
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event: Serving cached content first
self.addEventListener('fetch', event => {
    // We only cache GET requests for safety
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached response if found
                if (response) {
                    return response;
                }
                
                // If not found in cache, fetch from network
                return fetch(event.request).then(
                    networkResponse => {
                        // Check if we received a valid response
                        if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }
                        
                        // IMPORTANT: Do not cache Firestore/API responses, only static assets
                        const url = event.request.url;
                        if (!url.includes('/api/') && !url.includes('googleapis.com') && !url.includes('firestore.googleapis.com')) {
                             // Clone the response because the stream can only be consumed once
                             const responseToCache = networkResponse.clone();
                             caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        
                        return networkResponse;
                    }
                );
            })
    );
});
