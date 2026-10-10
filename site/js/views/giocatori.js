import { esc } from '../util.js';
import { stemmaHTML } from '../stemma.js';
import { gironi, impostaGirone, gironeEffettivo } from '../contesto.js';
import { nomeSquadra, squadraDa, vuoto, heroHTML } from './comuni.js';
import { barraContesto, collegaContesto } from './contesto-ui.js';

let tab = 'marcatori';
const VALORE = { marcatori: (g) => g.gol, voti: (g) => g.votoMedio, mvp: (g) => g.mvp, fairplay: (g) => g.ammonizioni + 3 * g.espulsioni };
const UNITA = { marcatori: 'gol', voti: 'media', mvp: 'premi', fairplay: 'punti cart.' };
const NOTE = { voti: 'Almeno 3 voti.', fairplay: 'Almeno 3 presenze; ammonizione 1 punto, espulsione 3: meno punti prima.', marcatori: '', mvp: 'Premi "migliore in campo".' };
const MEDAGLIE = ['🥇', '🥈', '🥉'];

export async function render({ indice, rotta, carica }) {
  const lista = gironi(indice);
  if (!lista.length) return vuoto('Nessun campionato in corso.');
  if (rotta.params[0] && lista.some(g => g.slug === rotta.params[0])) impostaGirone(rotta.params[0]);
  const slug = gironeEffettivo(indice);
  const g = await carica(`girone/${slug}.json`);
  const righe = (g.giocatori || {})[tab] || [];
  return `${heroHTML({ foto: 'premiazione', classe: 'hero-giocatori', contenuto: `
      <div class="contesto-riga">${barraContesto(indice)}</div>
      <h1>Giocatori</h1><p class="sotto">${esc(g.campionato.nome)} · ${esc(g.nome)}</p>` })}
    <div class="segmenti">${[['marcatori', 'Gol'], ['voti', 'Voti'], ['mvp', 'MVP'], ['fairplay', 'Fair play']].map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'attivo' : ''}">${l}</button>`).join('')}</div>
    ${righe.length ? `<section class="card piena">${righe.map((r, i) => `<a class="riga-gioc" href="#/giocatore/${esc(r.slug)}">
        <span class="pos">${i < 3 ? MEDAGLIE[i] : i + 1}</span>${stemmaHTML(squadraDa(indice, r.squadraId), 32)}
        <span class="chi"><b>${esc(r.nome)}</b><small>${esc(nomeSquadra(indice, r.squadraId))} · ${r.presenze} pres.</small></span>
        <span class="valore" aria-label="${UNITA[tab]}">${VALORE[tab](r)}</span></a>`).join('')}</section>
      ${NOTE[tab] ? `<p class="muto centro">${NOTE[tab]}</p>` : ''}` : vuoto('Nessun dato: le statistiche compaiono dopo le prime partite con tabellino.')}`;
}

export function dopo(ctx, root) {
  root.querySelectorAll('.segmenti button').forEach(b => { b.onclick = async () => { tab = b.dataset.tab; root.innerHTML = await render(ctx); dopo(ctx, root); }; });
  collegaContesto(root, ctx.indice, { onCambio: (slug) => ctx.naviga(`#/giocatori/${slug}`) });
}
