self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('parking-app2-cache').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/css/styles.css',
        '/js/admin.js',
        '/js/guard.js',
        '/manifest.json',
        // Добавьте другие необходимые файлы
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
