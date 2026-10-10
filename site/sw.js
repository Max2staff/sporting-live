const VERSIONE = 'sl-1';   // incrementare a ogni rilascio di codice (non di dati)
const SHELL = ['./', 'index.html', 'css/app.css', 'manifest.webmanifest', 'icons/icon.svg',
  'js/app.js', 'js/router.js', 'js/data.js', 'js/util.js', 'js/tema.js', 'js/giorni.js', 'js/preferiti.js', 'js/tabellino.js',
  'js/views/comuni.js', 'js/views/partite.js', 'js/views/partita.js', 'js/views/classifiche.js', 'js/views/squadra.js',
  'js/views/giocatori.js', 'js/views/giocatore.js', 'js/views/info.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSIONE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSIONE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.includes('/data/')) {
    // dati: rete prima, cache se offline
    e.respondWith(fetch(e.request).then(r => { const copia = r.clone(); caches.open(VERSIONE).then(c => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request)));
  } else {
    // shell: cache prima, aggiornamento in sottofondo
    e.respondWith(caches.match(e.request).then(hit => {
      const rete = fetch(e.request).then(r => { if (r.ok) caches.open(VERSIONE).then(c => c.put(e.request, r.clone())); return r; }).catch(() => hit);
      return hit || rete;
    }));
  }
});
