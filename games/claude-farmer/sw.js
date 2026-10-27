// Claude Farmer service worker: lets the game install to a phone's home screen,
// start fast on later visits and play with no connection once it has loaded once.
//
// The page and the game build are checked with the server on every launch, but the build
// (tens of MB) is only downloaded again when it actually changed: we keep each file's ETag
// and ask the server "still this one?", which costs a few bytes when nothing is new.
// So a new Unity build copied into Build/ reaches players on their next launch, no version bump needed.

const CACHE = "claude-farmer-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("claude-farmer-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin && url.pathname.includes("/Build/")) e.respondWith(revalidate(req));
  else if (req.mode === "navigate") e.respondWith(networkFirst(req));
  else if (url.origin === location.origin || url.hostname.endsWith("gstatic.com") || url.hostname.endsWith("googleapis.com")) e.respondWith(staleWhileRevalidate(e, req));
});

// Big build files: serve the cached copy unless the server says it changed.
async function revalidate(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  if (!cached) {
    // Fetch by URL alone: Unity's own loader sends "has it changed?" headers, and a bare 304 can't be kept offline.
    const res = await fetch(req.url, { cache: "no-store" });
    if (res.ok) await cache.put(req, res.clone());
    return res;
  }
  const headers = new Headers();
  const etag = cached.headers.get("ETag"), modified = cached.headers.get("Last-Modified");
  if (etag) headers.set("If-None-Match", etag);
  else if (modified) headers.set("If-Modified-Since", modified);
  try {
    const res = await fetch(req.url, { headers, cache: "no-store" });
    if (res.status === 304) return cached;
    if (res.ok) { await cache.put(req, res.clone()); return res; }
    return cached;
  } catch (err) {
    return cached; // offline
  }
}

// The page itself: newest when online, the saved copy when not.
async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) await cache.put(req, res.clone());
    return res;
  } catch (err) {
    return (await cache.match(req, { ignoreSearch: true })) || (await cache.match("./index.html")) || Response.error();
  }
}

// Small files (styles, fonts, icons): answer from the cache right away and refresh it behind the scenes.
async function staleWhileRevalidate(e, req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  const fresh = fetch(req)
    .then((res) => { if (res.ok || res.type === "opaque") return cache.put(req, res.clone()).then(() => res); return res; })
    .catch(() => cached || Response.error());
  if (cached) { e.waitUntil(fresh); return cached; }
  return fresh;
}
