const CACHE_NAME = "uf-static-v24";
const PRECACHE = ["/offline.html", "/manifest.json", "/favicon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/ofertas";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const open = clients.find((client) => "focus" in client);
      if (open) {
        open.navigate?.(target);
        return open.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js") return;
  if (url.pathname.startsWith("/api/")) return;

  const accept = request.headers.get("accept") || "";
  if (request.mode === "navigate" || accept.includes("text/html") || url.pathname === "/" || url.pathname.endsWith(".html")) {
    event.respondWith(
      fetch(request, { cache: "no-store" }).catch(async () => (await caches.match("/offline.html")) || Response.error()),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        });
      }),
    );
    return;
  }

  if (/\.(webp|png|jpg|jpeg|svg|ico|woff2|gif)$/i.test(url.pathname) || url.pathname.startsWith("/fotos/")) {
    event.respondWith(
      fetch(request, { cache: "no-cache" })
        .then((response) => {
          const type = response.headers.get("content-type") || "";
          if (response.ok && type.startsWith("image/")) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || Response.error()),
    );
  }
});
