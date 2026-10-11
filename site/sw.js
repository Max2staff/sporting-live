const VERSIONE = 'sl-3';   // incrementare a ogni rilascio di codice (non di dati)
const SHELL = ['./', 'index.html', 'css/app.css', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png',
  'js/app.js', 'js/router.js', 'js/archivio.js', 'js/data.js', 'js/util.js', 'js/tema.js', 'js/giorni.js', 'js/preferiti.js', 'js/tabellino.js', 'js/grafico.js',
  'js/views/comuni.js', 'js/views/partite.js', 'js/views/partita.js', 'js/views/classifiche.js', 'js/views/squadra.js',
  'js/views/giocatori.js', 'js/views/giocatore.js', 'js/views/info.js',
  'js/stemma.js', 'js/contesto.js', 'js/evidenza.js', 'js/views/contesto-ui.js', 'js/views/intro.js', 'js/views/condividi.js', 'js/cerca.js', 'js/views/cerca.js', 'js/visite.js', 'js/views/vantaggi.js',
  'img/foto/campo.jpg', 'img/foto/premiazione.jpg', 'img/loghi/endas.png', 'img/loghi/sporting-club-mestre.png'];

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
    // dati: rete prima (senza cache HTTP), cache solo di risposte buone, cache se offline
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => {
      if (r.ok) { const copia = r.clone(); e.waitUntil(caches.open(VERSIONE).then(c => c.put(e.request, copia)).catch(() => {})); }
      return r;
    }).catch(() => caches.match(e.request)));
  } else {
    // shell: cache prima, aggiornamento in sottofondo
    e.respondWith(caches.match(e.request).then(hit => {
      const rete = fetch(e.request).then(r => {
        if (r.ok) { const copia = r.clone(); e.waitUntil(caches.open(VERSIONE).then(c => c.put(e.request, copia)).catch(() => {})); }
        return r;
      }).catch(() => hit);
      if (hit) { e.waitUntil(rete.catch(() => {})); return hit; }
      return rete;
    }));
  }
});
