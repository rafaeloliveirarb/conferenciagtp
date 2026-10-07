/* Central de Conferência — service worker (2.0)
   - páginas (.html): busca na internet primeiro; sem sinal, abre a última cópia
   - bibliotecas (cdn): usa a cópia guardada e atualiza por trás
   - banco (supabase): NUNCA guarda — sempre ao vivo */
var VERSAO = 'gtp-v2-7';
var CASCA = ['./', './index.html', './tv.html', './manifest.webmanifest', './icone-192.png', './icone-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSAO).then(function (c) { return c.addAll(CASCA).catch(function () { }); }));
  self.skipWaiting();
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSAO; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (/supabase\.co$/.test(url.hostname) || /supabase\.co/.test(url.hostname)) return;   /* banco: sempre ao vivo */
  var ehPagina = req.mode === 'navigate' || /\.html?$/.test(url.pathname) || url.pathname.endsWith('/');
  var ehCdn = /cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|fonts\.(googleapis|gstatic)\.com/.test(url.hostname);
  var mesmaOrigem = url.origin === self.location.origin;
  if (ehPagina && mesmaOrigem) {
    e.respondWith(fetch(req).then(function (r) {
      var copia = r.clone(); caches.open(VERSAO).then(function (c) { c.put(req, copia); });
      return r;
    }).catch(function () {
      return caches.match(req).then(function (m) { return m || caches.match('./index.html'); });
    }));
    return;
  }
  if (ehCdn || mesmaOrigem) {
    e.respondWith(caches.match(req).then(function (m) {
      var rede = fetch(req).then(function (r) {
        if (r && (r.ok || r.type === 'opaque')) { var copia = r.clone(); caches.open(VERSAO).then(function (c) { c.put(req, copia); }); }
        return r;
      }).catch(function () { return m; });
      return m || rede;
    }));
  }
});
