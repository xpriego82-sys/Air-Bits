/* Air&Bits Service Worker – robust cache (v202601071200) */

const VERSION = "202601071200";
const CACHE_NAME = `airbits-cache-${VERSION}`;

// Ajusta aquí los assets que quieres cachear sí o sí
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./Banco_aeronautico_completo.csv",
  "./A330_TypeRating_200Q_FINAL.csv",
  "./A330_TypeRating_200Q_FINAL_STRICT_COMMA.csv",
  "./A330_TypeRating_200Q_FINAL_STRICT_SEMI.csv"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS.map(u => new Request(u, { cache: "reload" })));
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(k => k.startsWith("airbits-cache-") && k !== CACHE_NAME)
      .map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Network-first para navegación (HTML) -> evita “no se ve nada nuevo”
async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await caches.match(request);
    return cached || Response.error();
  }
}

// Cache-first para assets
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, fresh.clone());
  return fresh;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo mismo origen
  if (url.origin !== self.location.origin) return;

  // Navegación: network-first
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(networkFirst(new Request("./index.html")));
    return;
  }

  // CSS/JS: cache-first
  if (url.pathname.endsWith(".css") || url.pathname.endsWith(".js")) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // CSV y demás: cache-first
  event.respondWith(cacheFirst(req));
});
