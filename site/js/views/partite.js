import { esc, formattaData, formattaDataLunga } from '../util.js';
import { DA_DEFINIRE, giorniConPartite, giornoIniziale, partiteDelGiorno, raggruppaPerGirone, partitePreferite } from '../giorni.js';
import { leggiPreferiti } from '../preferiti.js';
import { rigaPartita, collegaStelle, nomeSquadra, card, vuoto } from './comuni.js';

function selettoreGiorno(giorni, giorno, oggi, haDaDefinire) {
  const i = giorni.indexOf(giorno);
  const prev = i > 0 ? giorni[i - 1] : null, next = i >= 0 && i < giorni.length - 1 ? giorni[i + 1] : null;
  const titolo = giorno === DA_DEFINIRE ? 'Da definire' : (giorno === oggi ? 'Oggi' : formattaDataLunga(giorno));
  return `<div class="giorno">
    ${prev ? `<a class="freccia" href="#/partite/${prev}" aria-label="giorno precedente">‹</a>` : '<span class="freccia off" aria-hidden="true">‹</span>'}
    <label class="titolo"><span>${esc(titolo)}</span>${giorno !== DA_DEFINIRE ? `<small>${esc(formattaData(giorno))}</small>` : ''}
      <select aria-label="Scegli il giorno">${giorni.map(g => `<option value="${g}" ${g === giorno ? 'selected' : ''}>${formattaData(g)}${g === oggi ? ' (oggi)' : ''}</option>`).join('')}${haDaDefinire ? `<option value="${DA_DEFINIRE}" ${giorno === DA_DEFINIRE ? 'selected' : ''}>da definire</option>` : ''}</select>
    </label>
    ${next ? `<a class="freccia" href="#/partite/${next}" aria-label="giorno successivo">›</a>` : '<span class="freccia off" aria-hidden="true">›</span>'}
  </div>`;
}

function blocchoPreferite(indice, oggi) {
  const pref = leggiPreferiti();
  if (!pref.length) return card('Le mie squadre', '<p class="muto">Tocca la stellina accanto a una squadra per vederla qui.</p>');
  const r = partitePreferite(indice.partite, pref, oggi);
  if (!r.length) return '';
  return card('Le mie squadre', r.map(x => `<div class="mia">
      <a href="#/squadra/${x.squadraId}" class="mia-nome">${esc(nomeSquadra(indice, x.squadraId))}</a>
      ${x.ultima ? `<div class="mia-riga"><small>ultima</small>${rigaPartita(x.ultima, indice, { mostraData: true })}</div>` : ''}
      ${x.prossima ? `<div class="mia-riga"><small>prossima</small>${rigaPartita(x.prossima, indice, { mostraData: true })}</div>` : ''}
    </div>`).join(''));
}

export async function render({ indice, rotta, oggi }) {
  const giorni = giorniConPartite(indice.partite);
  const haDaDefinire = indice.partite.some(p => !p.data);
  const giorno = rotta.params[0] || giornoIniziale(giorni, oggi) || (haDaDefinire ? DA_DEFINIRE : null);
  if (!giorno) return vuoto('Nessuna partita in calendario.');
  const gruppi = raggruppaPerGirone(partiteDelGiorno(indice.partite, giorno), indice);
  return `${selettoreGiorno(giorni, giorno, oggi, haDaDefinire)}
    ${blocchoPreferite(indice, oggi)}
    ${gruppi.length ? gruppi.map(g => `<section class="card piena">
      <a class="intest-girone" href="#/classifiche/${g.girone.slug}"><span>${esc(g.campionato)} · <b>${esc(g.girone.nome)}</b></span><span class="freccia-piccola">classifica ›</span></a>
      ${g.partite.map(p => rigaPartita(p, indice, { evidenzia: giorno === oggi })).join('')}
    </section>`).join('') : vuoto('Nessuna partita in questo giorno.')}`;
}

export function dopo(ctx, root) {
  const sel = root.querySelector('.giorno select');
  if (sel) sel.onchange = () => ctx.naviga(`#/partite/${sel.value}`);
  collegaStelle(root, async () => { root.innerHTML = await render(ctx); dopo(ctx, root); });
}
