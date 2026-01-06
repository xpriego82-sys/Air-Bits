// ============================================================
// Air&Bits — SERVICE-WORKER.JS
// Cache básico para PWA offline
// ============================================================

const CACHE_NAME = "airbits-cache-v1";

const ASSETS_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./manifest.json",
    "./icons/icon-192.png",
    "./icons/icon-512.png"
    // Añade aquí más archivos si los vas creando (sonidos, etc.)
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys
                    .filter(k => k !== CACHE_NAME)
                    .map(k => caches.delete(k))
            );
        })
    );
});

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            // Si está en caché, lo devuelve. Si no, va a la red.
            return response || fetch(event.request);
        })
    );
});