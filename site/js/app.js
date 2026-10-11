import { analizza } from './router.js';
import { caricaIndice, caricaJSON, svuotaCache } from './data.js';
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
import { introDaMostrare } from './contesto.js';

const VISTE = { partite, partita, classifiche, squadra, giocatori, giocatore, info, intro, cerca: cercaVista };
const TAB = [['partite', 'Partite', 'M4 4h16v16H4z M4 9h16 M9 4v16'], ['classifiche', 'Classifiche', 'M5 20h14 M8 20V10 M12 20V4 M16 20v-7'],
  ['giocatori', 'Giocatori', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 20a8 8 0 0 1 16 0'], ['info', 'Info', 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16v-5 M12 8h.01']];
const SEZIONE = { partita: 'partite', squadra: 'classifiche', giocatore: 'giocatori' };
const icona = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const app = document.getElementById('app');
let indice = null;
let renderId = 0;
let ultimoCaricamento = 0;
const RICARICA_DOPO_MS = 5 * 60 * 1000;

function testata() {
  const stale = indice.campionati.some(c => c.gironi.some(g => g.stale));
  return `<header class="testa">
    <a href="#/partite" class="marchio"><img src="icons/icon.svg" alt="" width="32" height="32"><span>Sporting <b>Live</b></span></a>
    <div class="testa-dx"><div class="agg">${esc(indice.stagione)} · agg. ${formattaOra(indice.generato)}${stale ? '<br><span class="stale">dati parziali</span>' : ''}</div>
    <a href="#/cerca" class="icona-cerca" aria-label="Cerca">${icona('M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3')}</a></div>
  </header>`;
}

export async function render() {
  const id = ++renderId;
  const rotta = analizza(location.hash);
  const ctx = { indice, rotta, oggi: oggiISO(), naviga: (h) => { location.hash = h; }, carica: caricaJSON };
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
      m.innerHTML = `<p class="vuoto">Dati non disponibili${navigator.onLine ? '' : ' (sei offline)'}. <a href="#/partite">Torna alle partite</a></p>`;
      console.error(e);
    }
    window.scrollTo(0, 0);
    return;
  }
  document.body.classList.remove('intro');
  app.innerHTML = `${testata()}<main><div class="scheletro"></div></main>
    <footer class="fonte">Dati: <a href="https://www.campionatisportingclub.it/" rel="noopener">campionatisportingclub.it</a> · Endas Venezia</footer>
    <nav class="tabbar">${TAB.map(([id, nome, d]) => `<a href="#/${id}" class="${id === attiva ? 'attivo' : ''}">${icona(d)}<span>${nome}</span></a>`).join('')}</nav>`;
  const main = app.querySelector('main');
  try {
    const html = await vista.render(ctx);
    if (id !== renderId) return;
    main.innerHTML = html;
    if (vista.dopo) vista.dopo(ctx, main);
  } catch (e) {
    if (id !== renderId) return;
    main.innerHTML = `<p class="vuoto">Dati non disponibili${navigator.onLine ? '' : ' (sei offline)'}. <a href="#/partite">Torna alle partite</a></p>`;
    console.error(e);
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', () => { if (indice) render(); });
async function ricarica() {
  svuotaCache();
  try { indice = await caricaIndice(); ultimoCaricamento = Date.now(); await render(); } catch { /* resta sui dati in memoria */ }
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
    if (introDaMostrare() && /^(#\/?|#\/partite\/?)?$/.test(location.hash)) { history.replaceState(null, '', '#/intro'); }
    await render();
  } catch (e) {
    app.innerHTML = '<p class="vuoto">Dati non disponibili, riprova più tardi.</p>';
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
avvia();
