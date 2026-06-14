const CACHE_NAME = 'meowvocab-v6';

const PRECACHE_URLS = [
  '.',
  'index.html',
  'css/style.css',
  'js/words.js',
  'js/progress.js',
  'js/export.js',
  'js/flashcard.js',
  'js/app.js',
  'manifest.json',
  'https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;500;600;700&family=Varela+Round&display=swap',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching assets');
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  var url = event.request.url;
  var dest = event.request.destination;

  // Network-first for HTML, JS, CSS — always get latest
  if (dest === 'document' || dest === 'script' || dest === 'style') {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
          return response;
        })
        .catch(function() {
          return caches.match(event.request);
        })
    );
  } else {
    // Cache-first for images, fonts, etc.
    event.respondWith(
      caches.match(event.request)
        .then(function(cached) { return cached || fetch(event.request); })
    );
  }
});
