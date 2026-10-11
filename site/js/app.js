import { analizza, prefissaHash, prefissaLink } from './router.js';
import { caricaIndice, caricaJSON, baseEdizione, svuotaCache } from './data.js';
import { impostaArchivio } from './archivio.js';
import { esc, oggiISO, formattaOra } from './util.js';
import { applicaTema } from './tema.js';
import * as partite from './views/partite.js';
import * as partita from './views/partita.js';
import * as classifiche from './views/classifiche.js';
import * as squadra from './views/squadra.js';
import * as giocatori from './views/giocatori.js';
import * as giocatore from './views/giocatore.js';
import * as info from './views/info.js';
import * as intro from './views/intro.js';
import * as cercaVista from './views/cerca.js';
import * as vantaggiVista from './views/vantaggi.js';
import { conta } from './visite.js';
import { introDaMostrare, azzeraSceltaArchivio } from './contesto.js';

const VISTE = { partite, partita, classifiche, squadra, giocatori, giocatore, info, intro, cerca: cercaVista, vantaggi: vantaggiVista };
const TAB = [['partite', 'Partite', 'M4 4h16v16H4z M4 9h16 M9 4v16'], ['classifiche', 'Classifiche', 'M5 20h14 M8 20V10 M12 20V4 M16 20v-7'],
  ['giocatori', 'Giocatori', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 20a8 8 0 0 1 16 0'], ['info', 'Info', 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16v-5 M12 8h.01']];
const TAB_VANTAGGI = ['vantaggi', 'Vantaggi', 'M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z M7.5 7.5h.01'];
const SEZIONE = { partita: 'partite', squadra: 'classifiche', giocatore: 'giocatori' };
const icona = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const app = document.getElementById('app');
let indice = null;
let vantaggi = { offerte: [] };
let renderId = 0;
let ultimaEdizione = null;
let ultimoCaricamento = 0;
const RICARICA_DOPO_MS = 5 * 60 * 1000;

function testata(idx, ed) {
  const stale = idx.campionati.some(c => c.gironi.some(g => g.stale));
  const etichetta = ed ? idx.nome || idx.stagione : idx.stagione;
  const fascia = ed ? `<div class="fascia-archivio"><span>Archivio · <b>${esc(idx.nome || idx.stagione)}</b></span><a href="#/partite" data-no-prefisso>Torna alla stagione in corso</a></div>` : '';
  // In archivio il marchio resta nell'edizione; la ricerca va sempre alla stagione corrente (nessun prefisso).
  return `<header class="testa">
    <a href="${prefissaHash('#/partite', ed)}" class="marchio"><img src="icons/icon.svg" alt="" width="32" height="32"><span>Sporting <b>Live</b></span></a>
    <div class="testa-dx"><div class="agg"><span>${esc(etichetta)}</span><span>agg. ${formattaOra(idx.generato)}</span>${stale ? '<span class="stale">dati parziali</span>' : ''}</div>
    <a href="#/cerca" data-no-prefisso class="icona-cerca" aria-label="Cerca${ed ? ' (stagione in corso)' : ''}">${icona('M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3')}</a></div>
  </header>${fascia}`;
}

// Quinta voce solo se ci sono offerte valide, e solo nella stagione corrente (le offerte non hanno archivio).
const tabAttive = (ed) => (!ed && vantaggi.offerte.length ? [...TAB, TAB_VANTAGGI] : TAB);
// Se il refresh fallisce restano le offerte già caricate (vantaggi parte da [] all'avvio).
const caricaVantaggi = async () => { try { const v = await caricaJSON('vantaggi.json'); vantaggi = { offerte: (Array.isArray(v && v.offerte) ? v.offerte : []).filter(o => o && typeof o === 'object') }; } catch { /* tiene le precedenti */ } };

let osservatore = null;
// Riscrive i link `#/…` di <main> (anche quelli che le viste ridisegnano da sole dopo un tocco).
function tieniPrefisso(main, ed) {
  if (osservatore) { osservatore.disconnect(); osservatore = null; }
  if (!ed) return;
  prefissaLink(main, ed);
  osservatore = new MutationObserver(() => prefissaLink(main, ed));
  osservatore.observe(main, { childList: true, subtree: true });
}

const erroreHTML = (ed) => `<p class="vuoto">Dati non disponibili${navigator.onLine ? '' : ' (sei offline)'}. ${ed ? '<a href="#/partite" data-no-prefisso>Torna alla stagione in corso</a>' : '<a href="#/partite">Torna alle partite</a>'}</p>`;

export async function render() {
  const id = ++renderId;
  if (osservatore) { osservatore.disconnect(); osservatore = null; }
  const rotta = analizza(location.hash);
  let ed = rotta.edizione;
  if (ed && !(indice.edizioni || []).some(e => e.slug === ed)) {
    impostaArchivio(null);
    if (osservatore) { osservatore.disconnect(); osservatore = null; }
    document.body.classList.remove('intro');
    app.innerHTML = `${testata(indice, null)}<main><section class="card"><h3>Edizione non trovata</h3><p>L'edizione “${esc(ed)}” non esiste.</p><p><a href="#/partite" class="link-tap">Vai alla stagione in corso</a></p></section></main>
      <nav class="tabbar">${tabAttive(null).map(([t, nome, d]) => `<a href="#/${t}">${icona(d)}<span>${nome}</span></a>`).join('')}</nav>`;
    window.scrollTo(0, 0);
    return;
  }
  if (ed && rotta.vista === 'intro') { location.replace(prefissaHash('#/partite', ed)); return; }
  if (ed && rotta.vista === 'vantaggi') { location.replace('#/vantaggi'); return; }
  if (ed && rotta.vista === 'cerca') { location.replace('#/cerca' + (rotta.params[0] ? `/${encodeURIComponent(rotta.params[0])}` : '')); return; }
  impostaArchivio(ed);
  if (ed !== ultimaEdizione) { azzeraSceltaArchivio(); ultimaEdizione = ed; }
  let idx = indice;
  if (ed) {
    try { idx = await caricaIndice(ed); } catch (e) {
      if (id !== renderId) return;
      app.innerHTML = `${testata(indice, null)}<main>${erroreHTML(false)}</main>`;
      console.error(e);
      return;
    }
    if (id !== renderId) return;
  }
  const base = baseEdizione(ed);
  const ctx = { vantaggi, indice: idx, indiceCorrente: indice, rotta, oggi: oggiISO(), naviga: (h) => { location.hash = prefissaHash(h, ed); },
    prefissa: (h) => prefissaHash(h, ed), carica: (rel) => caricaJSON(rel, base) };
  const vista = VISTE[rotta.vista];
  const attiva = SEZIONE[rotta.vista] || rotta.vista;
  if (rotta.vista === 'intro' && !introDaMostrare()) { location.replace('#/partite'); return; }
  if (rotta.vista === 'intro') {
    document.body.classList.add('intro');
    app.innerHTML = '<main class="intro-main"></main>';
    const m = app.querySelector('main');
    try {
      const html = await vista.render(ctx);
      if (id !== renderId) return;
      m.innerHTML = html;
      if (vista.dopo) vista.dopo(ctx, m);
    } catch (e) {
      if (id !== renderId) return;
      m.innerHTML = erroreHTML(false);
      console.error(e);
    }
    window.scrollTo(0, 0);
    return;
  }
  document.body.classList.remove('intro');
  app.innerHTML = `${testata(idx, ed)}<main><div class="scheletro"></div></main>
    <footer class="fonte">Dati: <a href="https://www.campionatisportingclub.it/" rel="noopener">campionatisportingclub.it</a> · Endas Venezia</footer>
    <nav class="tabbar">${tabAttive(ed).map(([t, nome, d]) => `<a href="${prefissaHash(`#/${t}`, ed)}" class="${t === attiva ? 'attivo' : ''}">${icona(d)}<span>${nome}</span></a>`).join('')}</nav>`;
  const main = app.querySelector('main');
  tieniPrefisso(main, ed);
  try {
    const html = await vista.render(ctx);
    if (id !== renderId) return;
    main.innerHTML = html;
    if (vista.dopo) vista.dopo(ctx, main);
    conta(rotta, indice.config);
  } catch (e) {
    if (id !== renderId) return;
    main.innerHTML = erroreHTML(ed);
    console.error(e);
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', () => { if (indice) render(); });
async function ricarica() {
  svuotaCache();
  try { indice = await caricaIndice(); ultimoCaricamento = Date.now(); await caricaVantaggi(); await render(); } catch { /* resta sui dati in memoria */ }
}

window.addEventListener('online', () => { ricarica(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && indice && Date.now() - ultimoCaricamento > RICARICA_DOPO_MS) ricarica();
});

async function avvia() {
  applicaTema();
  try {
    indice = await caricaIndice();
    ultimoCaricamento = Date.now();
    await caricaVantaggi();
    if (introDaMostrare() && /^(#\/?|#\/partite\/?)?$/.test(location.hash)) { history.replaceState(null, '', '#/intro'); }
    await render();
  } catch (e) {
    app.innerHTML = '<p class="vuoto">Dati non disponibili, riprova più tardi.</p>';
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
avvia();
