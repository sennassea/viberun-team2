const CACHE_NAME = 'gwiro-v4';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './life-ui.css',
  './map.css',
  './hand-layout.css',
  './characterData.js',
  './monsterData.js',
  './lifeSystem.js',
  './script.js',
  './tooltip.js',
  './deckViewer.js',
  './settingsViewer.js',
  './mapSystem.js',
  './hand-layout.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
