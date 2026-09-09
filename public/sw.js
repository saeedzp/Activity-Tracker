/**
 * Service worker.
 *
 * The app is used inside stores where signal is unreliable, so the shell has to
 * survive a dead connection. Static build output is cached on demand and served
 * from cache when the network fails; anything that reads or writes data is left
 * alone, because a stale store list or a replayed submission would be worse
 * than an honest error.
 */

const CACHE = "activity-tracker-v1";

// Everything needed to render something rather than the browser's error page.
const SHELL = ["/", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Data must never come from cache: a stale answer here is a wrong answer.
  if (url.pathname.startsWith("/api/")) return;

  // Build output is content-hashed, so cache-first is safe and instant.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  // Pages: fresh when possible, cached when the network is gone.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((hit) => hit ?? caches.match("/"))),
  );
});
