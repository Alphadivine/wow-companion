/* WoW Companion service worker: cache the app shell, network-first for pages. */
const CACHE = "wow-companion-v4";
const SHELL = ["./", "index.html", "css/style.css", "config.js", "js/data.js", "js/api.js", "js/talents.js", "js/app.js", "icons/icon.svg", "manifest.webmanifest"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return; // never touch the API or Blizzard images
  e.respondWith(
    // Always ask GitHub Pages whether a file changed (cheap when it hasn't), so a new upload is used
    // right away instead of the browser's copy from up to 10 minutes earlier.
    fetch(req.url, { cache: "no-cache", credentials: "same-origin" }).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req))
  );
});
