const CACHE_NAME = 'momo-logistics-v1.0.1'; // Incrémenter à chaque déploiement
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installation...', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache ouvert');
        // Ne pas bloquer l'installation si le cache échoue
        return cache.addAll(urlsToCache).catch(err => {
          console.warn('[SW] Erreur cache partiel:', err);
        });
      })
  );
  // Forcer le nouveau SW à devenir actif immédiatement
  self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation...', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Prendre immédiatement le contrôle de tous les clients
  self.clients.claim();
});

// Interception des requêtes - Stratégie Network First avec timeout
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignorer les requêtes vers des domaines externes (API, etc.)
  const url = new URL(event.request.url);
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // Ignorer les requêtes vers les API Supabase
  if (url.hostname.includes('supabase')) {
    return;
  }

  event.respondWith(
    // Essayer le réseau d'abord avec un timeout
    Promise.race([
      fetch(event.request)
        .then((response) => {
          // Si la requête réussit, mettre en cache (seulement les ressources statiques)
          if (response && response.status === 200 && response.type === 'basic') {
            // Ne pas cacher les documents HTML dynamiques
            if (!event.request.url.includes('.html') || event.request.url === self.location.origin + '/') {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
          }
          return response;
        }),
      // Timeout de 3 secondes - si le réseau est trop lent, utiliser le cache
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 3000)
      )
    ])
    .catch(() => {
      // Si le réseau échoue ou timeout, utiliser le cache
      return caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Pour les documents HTML, retourner index.html (SPA)
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('/index.html');
          }
          // Sinon, retourner une erreur
          return new Response('Offline - Ressource non disponible', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
    })
  );
});

// Écouter les messages du client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
