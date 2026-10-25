// Service worker: permite abrir la app sin cobertura.
const VERSION = 'mant-1.4.1.3';
const BASICOS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(BASICOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const conTiempo = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('tiempo')), ms))]);

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // La propia app: primero la red (para coger mejoras), y si no hay cobertura, la copia guardada.
  if (req.mode === 'navigate') {
    e.respondWith(
      conTiempo(fetch(req), 4000)
        .then(res => { const copia = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copia)); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Archivos propios y tipos de letra: primero la copia guardada.
  const propio = url.origin === location.origin;
  const fuentes = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!propio && !fuentes) return;
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copia = res.clone(); caches.open(VERSION).then(c => c.put(req, copia)); return res;
    }))
  );
});

// Al tocar la notificación de sesión abierta: abre la app (o la trae delante).
self.addEventListener('notificationclick', e => {
  e.waitUntil(self.clients.matchAll({type:'window', includeUncontrolled:true}).then(l => {
    for (const c of l) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow('./');
  }));
});
