/*
 * O antigo app (PWA) foi descontinuado. Este service worker substitui o anterior
 * apenas para se autodesinstalar e limpar os caches que ele deixou nos navegadores
 * de quem chegou a abrir o app — sem isso, essas pessoas continuariam vendo
 * páginas antigas em cache. Pode ser removido depois de alguns meses.
 */
self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.registration.unregister(); })
      .then(function () { return self.clients.matchAll({ type: 'window' }); })
      .then(function (clients) { clients.forEach(function (c) { c.navigate(c.url); }); })
  );
});
