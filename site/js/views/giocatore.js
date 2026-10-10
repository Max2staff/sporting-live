import { esc, formattaData, pallinoForma } from '../util.js';
import { card } from './comuni.js';

export async function render({ rotta, carica }) {
  const g = await carica(`giocatore/${rotta.params[0]}.json`);
  const blocco = (t, x) => `<div class="stat"><small>${t}</small><b>${x}</b></div>`;
  return `<section class="testa-squadra"><div><h2>${esc(g.nome)}</h2><div class="meta"><a href="#/squadra/${g.squadraId}">${esc(g.squadra)}</a> · <a href="#/classifiche/${g.girone.slug}">${esc(g.girone.nome)}</a></div></div></section>
    ${card('Stagione', `<div class="stat-griglia">${blocco('Presenze', g.presenze)}${blocco('Gol', g.gol)}${blocco('Media voto', g.votoMedio ?? '–')}${blocco('Migliore in campo', g.mvp)}${blocco('Ammonizioni', g.ammonizioni)}${blocco('Espulsioni', g.espulsioni)}</div>`)}
    ${card('Partita per partita', g.perPartita.length ? `<div class="scroll-x"><table class="tab"><thead><tr><th class="sx">Data</th><th class="sx">Avversario</th><th>Ris.</th><th>Gol</th><th>Voto</th><th></th></tr></thead>
      <tbody>${[...g.perPartita].reverse().map(p => `<tr class="cliccabile" data-id="${p.idPartita}"><td class="sx">${esc(formattaData(p.data))}</td><td class="sx nome">${p.casa ? '' : '@ '}${esc(p.avversario)}</td><td>${pallinoForma(p.esito)} ${p.gf}-${p.gs}</td><td>${p.gol || ''}</td><td>${p.voto ?? '–'}</td><td>${p.mvp ? '★' : ''}${p.ammonito ? '<i class="cart giallo"></i>' : ''}${p.espulso ? '<i class="cart rosso"></i>' : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muto">Nessuna partita.</p>')}`;
}

export function dopo(ctx, root) {
  root.querySelectorAll('tr[data-id]').forEach(tr => { tr.onclick = () => ctx.naviga(`#/partita/${tr.dataset.id}`); });
}
