/* LabaFlow service worker.
 *
 * Deliberately narrow: it caches the app shell and serves an offline page when a
 * navigation fails. It never intercepts cross-origin requests, so Enter Cloud
 * calls always go straight to the network. Registered only in production builds.
 *
 * Every URL is resolved against the service worker's own scope, so the same file
 * works at the site root and at a GitHub project path such as /repo/.
 */
const SCOPE = self.registration.scope;
const CACHE = "labaflow-shell-v2";
const OFFLINE_URL = new URL("offline.html", SCOPE).href;
const MANIFEST_URL = new URL("manifest.webmanifest", SCOPE).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, MANIFEST_URL]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Hashed build assets are safe to serve from cache first.
  if (url.pathname.includes("/assets/") || url.pathname.includes("/icon-")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            void caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});
