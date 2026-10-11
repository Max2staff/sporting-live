import { esc, formattaData, pallinoForma } from '../util.js';
import { stemmaHTML } from '../stemma.js';
import { inArchivio } from '../archivio.js';
import { condividiHTML, collegaCondividi, datiCondivisione } from './condividi.js';
import { card, heroHTML, squadraDa } from './comuni.js';
import { graficoGiocatoreSVG } from '../grafici/barre.js';

let dati = null;

export async function render({ indice, rotta, carica, madre }) {
  const g = await carica(`giocatore/${rotta.params[0]}.json`);
  madre?.({ squadraId: g.squadraId });
  dati = datiCondivisione('giocatore', g, indice.sito, location.href, inArchivio());
  const blocco = (t, x) => `<div class="stat"><small>${t}</small><b>${x}</b></div>`;
  const svg = graficoGiocatoreSVG(g.perPartita);
  return `${heroHTML({ foto: 'campo', classe: 'hero-giocatore', contenuto: `<div class="hero-squadra">${stemmaHTML(squadraDa(indice, g.squadraId), 64)}
      <div><h1>${esc(g.nome)}</h1><p class="sotto"><a href="#/squadra/${Number(g.squadraId)}">${esc(g.squadra)}</a> · <a href="#/classifiche/${esc(g.girone.slug)}">${esc(g.girone.nome)}</a></p></div>${condividiHTML()}</div>` })}
    ${card('Stagione', `<div class="stat-griglia">${blocco('Presenze', g.presenze)}${blocco('Gol', g.gol)}${blocco('Media voto', g.votoMedio ?? '–')}${blocco('Migliore in campo', g.mvp)}${blocco('Ammonizioni', g.ammonizioni)}${blocco('Espulsioni', g.espulsioni)}</div>`)}
    ${svg ? card('Gol e voti', `${svg}<p class="muto grafico-nota">Barre: gol in ogni partita · linea: voto (scala 4–10)</p>`) : ''}
    ${card('Partita per partita', g.perPartita.length ? `<div class="scroll-x"><table class="tab"><thead><tr><th class="sx">Data</th><th class="sx">Avversario</th><th>Ris.</th><th>Gol</th><th>Voto</th><th></th></tr></thead>
      <tbody>${[...g.perPartita].reverse().map(p => `<tr class="cliccabile" data-id="${Number(p.idPartita)}"><td class="sx">${esc(formattaData(p.data))}</td><td class="sx nome">${p.casa ? '' : '@ '}${esc(p.avversario)}</td><td>${pallinoForma(p.esito)} ${p.gf}-${p.gs}</td><td>${p.gol || ''}</td><td>${p.voto ?? '–'}</td><td>${p.mvp ? '★' : ''}${p.ammonito ? '<i class="cart giallo"></i>' : ''}${p.espulso ? '<i class="cart rosso"></i>' : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muto">Nessuna partita.</p>')}`;
}

export function dopo(ctx, root) {
  collegaCondividi(root, dati);
  root.querySelectorAll('tr[data-id]').forEach(tr => { tr.onclick = () => ctx.naviga(`#/partita/${tr.dataset.id}`); });
}
