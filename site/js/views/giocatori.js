import { esc } from '../util.js';
import { nomeSquadra, vuoto } from './comuni.js';

let tab = 'marcatori';
const COLONNE = {
  marcatori: ['Gol', (g) => g.gol], voti: ['Media', (g) => g.votoMedio],
  mvp: ['★', (g) => g.mvp], fairplay: ['Cart.', (g) => `${g.ammonizioni}<i class="cart giallo"></i>${g.espulsioni ? ` ${g.espulsioni}<i class="cart rosso"></i>` : ''}`],
};
const NOTE = { voti: 'Almeno 3 voti.', fairplay: 'Almeno 3 presenze; meno cartellini prima.', marcatori: '', mvp: 'Premi "migliore in campo".' };

export async function render({ indice, rotta, carica }) {
  const lista = indice.campionati.flatMap(c => c.gironi);
  if (!lista.length) return vuoto('Nessun campionato in corso.');
  const slug = rotta.params[0] && lista.some(g => g.slug === rotta.params[0]) ? rotta.params[0] : lista[0].slug;
  const g = await carica(`girone/${slug}.json`);
  const righe = g.giocatori[tab] || [];
  const [intest, valore] = COLONNE[tab];
  return `<div class="tabs">${lista.map(x => `<button data-slug="${x.slug}" class="${x.slug === slug ? 'attivo' : ''}">${esc(x.nome)}</button>`).join('')}</div>
    <div class="segmenti">${[['marcatori', 'Marcatori'], ['voti', 'Voti'], ['mvp', 'Migliori'], ['fairplay', 'Fair play']].map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'attivo' : ''}">${l}</button>`).join('')}</div>
    ${righe.length ? `<section class="card piena"><div class="scroll-x"><table class="tab"><thead><tr><th>#</th><th class="sx">Giocatore</th><th>Pres.</th><th>${intest}</th></tr></thead>
      <tbody>${righe.map((r, i) => `<tr class="cliccabile" data-slug="${r.slug}"><td>${i + 1}</td><td class="sx nome">${esc(r.nome)}<small class="sq-sotto">${esc(nomeSquadra(indice, r.squadraId))}</small></td><td>${r.presenze}</td><td><b>${valore(r)}</b></td></tr>`).join('')}</tbody></table></div></section>
      ${NOTE[tab] ? `<p class="muto centro">${NOTE[tab]}</p>` : ''}` : vuoto('Nessun dato: le statistiche compaiono dopo le prime partite con tabellino.')}`;
}

export function dopo(ctx, root) {
  root.querySelectorAll('.tabs button').forEach(b => { b.onclick = () => ctx.naviga(`#/giocatori/${b.dataset.slug}`); });
  root.querySelectorAll('.segmenti button').forEach(b => { b.onclick = async () => { tab = b.dataset.tab; root.innerHTML = await render(ctx); dopo(ctx, root); }; });
  root.querySelectorAll('tr[data-slug]').forEach(tr => { tr.onclick = () => ctx.naviga(`#/giocatore/${tr.dataset.slug}`); });
}
