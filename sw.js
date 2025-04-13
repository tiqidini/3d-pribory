const CACHE_NAME = '3d-dimensions-checker-v1';
const urlsToCache = [
  './', // Кешуємо корінь для доступу до index.html за замовчуванням
  './index.html',
  // Додайте сюди шляхи до ваших іконок, якщо ви їх додали
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  // Додайте інші важливі ресурси, якщо потрібно (наприклад, CSS, JS бібліотеки, якщо вони локальні)
  // Важливо: Three.js та OrbitControls завантажуються з CDN, Service Worker НЕ зможе їх закешувати за замовчуванням
  // для роботи в повному офлайні їх потрібно буде завантажити та підключити локально.
];

// Встановлення Service Worker та кешування ресурсів
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        // Якщо потрібно активувати новий SW одразу (замість очікування закриття старих вкладок)
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache app shell:', error);
      })
  );
});

// Активуємо Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  // Видаляємо старі кеші, якщо вони є
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation complete');
      // Повідомляємо клієнтам, що новий SW активний
      return self.clients.claim();
    })
  );
});

// Перехоплення запитів та використання кешу (стратегія Cache First)
self.addEventListener('fetch', event => {
  // Ігноруємо запити, що не є GET (наприклад, POST)
  if (event.request.method !== 'GET') {
    return;
  }

  // Ігноруємо запити до Chrome extensions
  if (event.request.url.startsWith('chrome-extension://')) {
     return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Якщо ресурс є в кеші, повертаємо його
        if (response) {
          // console.log('Service Worker: Serving from cache:', event.request.url);
          return response;
        }
        // Якщо ресурсу немає в кеші, намагаємося отримати його з мережі
        // console.log('Service Worker: Fetching from network:', event.request.url);
        return fetch(event.request)
          .then(networkResponse => {
            // Якщо отримали відповідь з мережі, кешуємо її для майбутнього використання
            // Важливо: НЕ кешуємо відповіді від CDN Three.js, оскільки вони можуть змінюватися
            // та ми їх не включили в urlsToCache для попереднього кешування.
            // Кешувати такі ресурси можна, але потрібна інша стратегія (наприклад, Stale-While-Revalidate)
            // або їх потрібно завантажити локально.
            /*
            if (networkResponse && networkResponse.status === 200 && urlsToCache.includes(new URL(event.request.url).pathname)) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            */
            return networkResponse;
          })
          .catch(error => {
            console.error('Service Worker: Fetch failed; returning offline page instead.', error);
            // Тут можна повертати базову офлайн-сторінку, якщо потрібно
            // return caches.match('./offline.html');
          });
      })
  );
}); 