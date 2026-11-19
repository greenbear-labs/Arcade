/* Offline support: keep a copy of every file so the game works with no internet.
 * Online, it always fetches the newest files (so updates show up on the next launch);
 * offline, it answers from the saved copy. It only ever touches its own caches, because
 * it can share a website with other games. */
const PREFIX = 'froggy-farm-';
const CACHE = PREFIX + 'v4';
const ASSETS = [
  './', './index.html', './style.css', './js/audio.js', './js/app.js', './js/kit.js', './js/games/frog.js', './js/games/icecream.js',
  './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      return (await cache.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' && await cache.match('./index.html')) || Response.error();
    }
  }));
});
