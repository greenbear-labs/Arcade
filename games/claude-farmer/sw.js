// Claude Farmer moved to games/mythica-farmer. Phones that installed the old page still run its service
// worker; this replacement clears the old cache and steps aside so the redirect page loads.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("claude-farmer-")).map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
  );
});
