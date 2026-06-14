// MET socio — service worker. Estrategia network-first con fallback a cache,
// para no romper el HMR de Vite en dev y dar offline básico (carnet incluido).
const CACHE = "met-socio-v1";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/met-icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // No tocar la API (otro puerto) ni las internals de Vite.
  if (url.port === "4000") return;
  if (url.pathname.startsWith("/@") || url.pathname.includes("/node_modules/")) return;
  const accept = req.headers.get("accept") || "";
  if (accept.includes("text/event-stream")) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("/"))),
  );
});
