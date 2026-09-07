// Service worker mínimo do Group Mobil — só existe para tornar a app
// instalável (critério do Chrome/Android exige um SW com "fetch") e para
// dar uma resposta offline simpática em vez do erro do browser.
// Não faz cache agressivo de nada: cada pedido vai sempre à rede primeiro.

const CACHE_NAME = "group-mobil-shell-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Só intercepta navegações de página (não API, não assets) — se a rede
  // falhar (sem internet), mostra a página offline em vez do erro nativo.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL)),
    );
  }
});
