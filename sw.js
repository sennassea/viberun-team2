"use strict";

const CACHE_NAME = "gwiro-pwa-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./life-ui.css",
  "./map.css",
  "./hand-layout.css",
  "./characterData.js",
  "./monsterData.js",
  "./lifeSystem.js",
  "./script.js",
  "./tooltip.js",
  "./deckViewer.js",
  "./settingsViewer.js",
  "./mapSystem.js",
  "./hand-layout.js",
  "./mobileApp.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if(event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if(cached) return cached;
      return fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
