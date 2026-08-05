const CACHE_NAME = 'yandao-v1';
const urlsToCache = ['/', '/yixue/', '/zhongyi/'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))); });
self.addEventListener('fetch', event => { event.respondWith(caches.match(event.request).then(resp => resp || fetch(event.request))); });
