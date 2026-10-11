export const VISTE = ['partite', 'partita', 'classifiche', 'squadra', 'giocatori', 'giocatore', 'info', 'intro', 'cerca', 'vantaggi'];

function decodifica(p) {
  try { return decodeURIComponent(p); } catch { return p; }
}

// `#/a/<ed>/<vista>/<params>` = edizione d'archivio; `#/a` senza edizione = partite della stagione corrente.
export function analizza(hash) {
  let parti = String(hash || '').replace(/^#\/?/, '').split('/').filter(Boolean).map(decodifica);
  let edizione = null;
  if (parti[0] === 'a' && parti.length > 1) { edizione = parti[1]; parti = parti.slice(2); }
  else if (parti[0] === 'a') parti = [];
  if (!parti.length || !VISTE.includes(parti[0])) return { vista: 'partite', params: [], edizione };
  return { vista: parti[0], params: parti.slice(1), edizione };
}

// Aggiunge il prefisso d'archivio a un hash `#/…` (idempotente: `#/a/…` resta com'è).
export function prefissaHash(href, edizione) {
  if (!edizione || typeof href !== 'string' || !href.startsWith('#/') || href.startsWith('#/a/')) return href;
  return `#/a/${encodeURIComponent(edizione)}/${href.slice(2)}`;
}

// html (stringa) -> stringa; oppure un elemento DOM, modificato sul posto. I link con data-no-prefisso restano invariati.
export function prefissaLink(x, edizione) {
  if (!edizione) return x;
  if (typeof x === 'string') {
    return x.replace(/<a\b[^>]*>/g, (tag) => /\bdata-no-prefisso\b/.test(tag)
      ? tag : tag.replace(/(\bhref=)(["'])(#\/[^"']*)\2/, (_, h, q, v) => `${h}${q}${prefissaHash(v, edizione)}${q}`));
  }
  x.querySelectorAll('a[href^="#/"]:not([data-no-prefisso])').forEach(a => { a.setAttribute('href', prefissaHash(a.getAttribute('href'), edizione)); });
  return x;
}
