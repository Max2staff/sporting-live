import { esc, formaHTML, segnoDR } from '../util.js';
import { èPreferita } from '../preferiti.js';
import { vuoto } from './comuni.js';

let tipo = 'totale';
const gironi = (indice) => indice.campionati.flatMap(c => c.gironi.map(g => ({ ...g, campionato: c.nome })));

export async function render({ indice, rotta, carica }) {
  const lista = gironi(indice);
  if (!lista.length) return vuoto('Nessun campionato in corso.');
  const slug = rotta.params[0] && lista.some(g => g.slug === rotta.params[0]) ? rotta.params[0] : lista[0].slug;
  const g = await carica(`girone/${slug}.json`);
  const forma = new Map(g.squadre.map(s => [s.id, s.forma]));
  const righe = g.classifica[tipo] || [];
  return `<div class="tabs">${lista.map(x => `<button data-slug="${x.slug}" class="${x.slug === slug ? 'attivo' : ''}">${esc(x.nome)}</button>`).join('')}</div>
    <h2>${esc(g.campionato.nome)} · ${esc(g.nome)}${g.stale && Object.keys(g.stale).length ? ' <span class="badge">dati parziali</span>' : ''}</h2>
    <div class="segmenti">${[['totale', 'Totale'], ['casa', 'Casa'], ['trasferta', 'Trasferta']].map(([k, l]) => `<button data-tipo="${k}" class="${tipo === k ? 'attivo' : ''}">${l}</button>`).join('')}</div>
    ${righe.length ? `<section class="card piena"><div class="scroll-x"><table class="tab">
      <thead><tr><th>#</th><th class="sx">Squadra</th><th>PT</th><th>G</th><th>V</th><th>N</th><th>P</th><th>GF</th><th>GS</th><th>DR</th>${tipo === 'totale' ? '<th>Forma</th>' : ''}</tr></thead>
      <tbody>${righe.map(r => `<tr class="cliccabile ${èPreferita(r.squadraId) ? 'evid' : ''}" data-squadra="${r.squadraId}"><td>${r.pos}</td><td class="sx nome">${esc(r.nome)}</td><td><b>${r.pt}</b></td><td>${r.g}</td><td>${r.v}</td><td>${r.n}</td><td>${r.p}</td><td>${r.gf}</td><td>${r.gs}</td><td>${segnoDR(r.dr)}</td>${tipo === 'totale' ? `<td>${formaHTML(forma.get(r.squadraId))}</td>` : ''}</tr>`).join('')}</tbody>
    </table></div></section>` : vuoto('Classifica non disponibile.')}`;
}

export function dopo(ctx, root) {
  root.querySelectorAll('.tabs button').forEach(b => { b.onclick = () => ctx.naviga(`#/classifiche/${b.dataset.slug}`); });
  root.querySelectorAll('.segmenti button').forEach(b => { b.onclick = async () => { tipo = b.dataset.tipo; root.innerHTML = await render(ctx); dopo(ctx, root); }; });
  root.querySelectorAll('tr[data-squadra]').forEach(tr => { tr.onclick = () => ctx.naviga(`#/squadra/${tr.dataset.squadra}`); });
}
