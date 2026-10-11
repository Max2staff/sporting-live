import { formattaDataLunga } from '../util.js';

const base = (sito) => { const s = String(sito || ''); return s && !s.endsWith('/') ? s + '/' : s; };

// Pura: nessun accesso a browser. oggetto: partita | {nome} (girone) | squadra | giocatore.
// `archivio`: le pagine s/p e le immagini esistono solo per la stagione corrente, quindi si condivide l'URL dell'app.
export function datiCondivisione(tipo, oggetto, sito, href, archivio = false) {
  const o = oggetto || {};
  const b = base(sito);
  if (tipo === 'partita') {
    const casa = o.casa && o.casa.nome, osp = o.ospite && o.ospite.nome;
    const girone = o.girone ? o.girone.nome : '';
    if (o.giocata && archivio) {
      const ris = `${casa} ${o.golCasa}-${o.golOspite} ${osp}`;
      return { titolo: ris, testo: `${ris}${girone ? ` · ${girone}` : ''} · Sporting Live`, url: href };
    }
    if (o.giocata) {
      const ris = `${casa} ${o.golCasa}-${o.golOspite} ${osp}`;
      const id = Number(o.id);
      return { titolo: ris, testo: `${ris}${girone ? ` · ${girone}` : ''} · Sporting Live`, url: `${b}s/p/${id}.html`, immagine: `${b}s/p/${id}.jpg` };
    }
    const quando = `${formattaDataLunga(o.data)}${o.ora ? ` ore ${o.ora}` : ''}`;
    return { titolo: `${casa} - ${osp}`, testo: `${casa} - ${osp} · ${quando}${girone ? ` · ${girone}` : ''} · Sporting Live`, url: href };
  }
  if (tipo === 'classifica') {
    const t = `Classifica ${o.nome} · Sporting Live`;
    return { titolo: t, testo: t, url: href };
  }
  if (tipo === 'squadra') {
    const g = o.girone ? o.girone.nome : '';
    return { titolo: `${o.nome} · Sporting Live`, testo: `${o.nome}${g ? ` · ${g}` : ''} · Sporting Live`, url: href };
  }
  const g = o.girone ? o.girone.nome : '';
  return { titolo: `${o.nome} · Sporting Live`, testo: `${o.nome}${o.squadra ? ` (${o.squadra})` : ''}${g ? ` · ${g}` : ''} · Sporting Live`, url: href };
}

const icona = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4"/></svg>';
export const condividiHTML = (conImmagine = false) =>
  `<span class="condividi-box">${conImmagine ? '<button type="button" class="condividi-img" data-condividi-img>Immagine</button>' : ''}<button type="button" class="condividi" data-condividi aria-label="Condividi">${icona}</button></span>`;

let timer = null;
function toast(msg) {
  let t = document.getElementById('toast-condividi');
  if (!t) { t = document.createElement('div'); t.id = 'toast-condividi'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('visibile');
  clearTimeout(timer); timer = setTimeout(() => t.classList.remove('visibile'), 2000);
}

function mostraLink(url) {
  let box = document.getElementById('link-condividi');
  if (!box) { box = document.createElement('input'); box.id = 'link-condividi'; box.readOnly = true; box.className = 'link-condividi'; box.setAttribute('aria-label', 'Link da copiare'); box.onblur = () => box.remove(); document.body.appendChild(box); }
  box.value = url; box.focus(); box.select();
}

const annullato = (e) => e && e.name === 'AbortError';

async function condividiLink(d) {
  try {
    if (typeof navigator !== 'undefined' && navigator.share) { await navigator.share({ title: d.titolo, text: d.testo, url: d.url }); return; }
  } catch (e) { if (annullato(e)) return; }
  try { await navigator.clipboard.writeText(d.url); toast('Link copiato'); }
  catch { mostraLink(d.url); }
}

const fileCache = new Map();   // url immagine -> File (precaricato per restare dentro il gesto dell'utente)
function precarica(url) {
  if (fileCache.has(url) || typeof fetch === 'undefined') return;
  fileCache.set(url, null);
  fetch(url).then(r => { if (!r.ok) throw new Error('immagine'); return r.blob(); })
    .then(b => fileCache.set(url, new File([b], 'risultato.jpg', { type: b.type || 'image/jpeg' })))
    .catch(() => fileCache.delete(url));
}

// Sincrona: iOS richiede navigator.share dentro l'attivazione utente (niente await prima).
function condividiImmagine(d) {
  const file = fileCache.get(d.immagine);
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: d.titolo }).catch(e => { if (!annullato(e)) location.href = d.immagine; });
  } else {
    location.href = d.immagine;
  }
}

// Idempotente: usa onclick (si sovrascrive a ogni nuovo render).
export function collegaCondividi(root, dati) {
  if (!dati) return;
  if (dati.immagine) precarica(dati.immagine);
  root.querySelectorAll('[data-condividi]').forEach(b => { b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); condividiLink(dati); }; });
  root.querySelectorAll('[data-condividi-img]').forEach(b => { b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); if (dati.immagine) condividiImmagine(dati); }; });
}
