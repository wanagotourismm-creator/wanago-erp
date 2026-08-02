// Service worker: installability (Chrome/Android requires one with a fetch
// handler before offering "Add to Home Screen") plus a conservative
// cache-first strategy for static assets only — the actual "feels fast"
// win, since _next/static bundles are content-hashed and safe to cache
// indefinitely. Page navigations and API/Firestore calls are always
// untouched pass-through, so business data and auth-gated pages can never
// be served stale. Bump the version suffix below whenever the precache
// list changes (this file isn't build-processed, so it's a manual bump).
const VERSION = "v1";
const SHELL_CACHE = `wanago-shell-${VERSION}`;
const RUNTIME_CACHE = `wanago-runtime-${VERSION}`;

const PRECACHE_URLS = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/images/logo-dark-clean.png",
  "/images/logo-white-clean.png",
];

const CACHEABLE_PATH_PREFIXES = ["/_next/static/", "/icons/", "/images/"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((names) =>
        Promise.all(
          names
            .filter((name) => name !== SHELL_CACHE && name !== RUNTIME_CACHE)
            .map((name) => caches.delete(name))
        )
      ),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isCacheable = CACHEABLE_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
  if (!isCacheable) return; // page navigations, API/Firestore calls — always hit the network

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
