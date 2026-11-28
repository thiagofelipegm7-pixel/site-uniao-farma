// Mesma versão do CACHE_BUST em app/PwaRegister.tsx (tests/sw-offline.test.mjs confere): mudou um, muda o outro.
const CACHE_NAME = "uf-static-v30";
const PRECACHE = ["/offline.html", "/manifest.json", "/favicon.png"];

// A Cloudflare responde /offline.html com 307 para /offline. O navegador recusa (net::ERR_FAILED) uma resposta
// marcada como redirecionada quando ela é entregue a uma navegação, então a cópia guardada é refeita sem a marca.
async function semRedirecionamento(response) {
  if (!response.redirected) return response;
  return new Response(await response.blob(), { status: response.status, statusText: response.statusText, headers: response.headers });
}

async function guardarPrecache() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    PRECACHE.map(async (url) => {
      const response = await fetch(url, { cache: "no-cache" });
      if (!response.ok) throw new TypeError("precache falhou: " + url);
      await cache.put(url, await semRedirecionamento(response));
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(guardarPrecache().then(() => self.skipWaiting()));
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
      // Sem no-store: o HTML já tem s-maxage=60 no Worker. no-store fazia toda navegação (e o prefetch do SW)
      // bater no Worker e estourar o limite de CPU (Erro 1102) em alguns aparelhos.
      fetch(request).catch(async () => (await caches.match("/offline.html")) || Response.error()),
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
