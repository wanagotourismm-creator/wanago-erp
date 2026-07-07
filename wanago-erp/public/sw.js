// Minimal service worker — its only job is to satisfy browser installability
// criteria (Chrome/Android requires a registered service worker with a fetch
// handler before it will offer "Add to Home Screen"). It doesn't cache
// anything, so it can never serve stale data — every request just passes
// straight through to the network, same as if it weren't there at all.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Intentionally no-op: let the browser handle the request normally.
});
