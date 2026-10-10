import { esc, formattaData, formattaDataLunga } from '../util.js';
import { DA_DEFINIRE, giorniConPartite, giornoIniziale, partiteDelGiorno, raggruppaPerGirone, partitePreferite } from '../giorni.js';
import { leggiPreferiti } from '../preferiti.js';
import { stemmaHTML } from '../stemma.js';
import { TUTTI, leggiGirone, gironi } from '../contesto.js';
import { capolista, capocannoniere, ultimaGiornata } from '../evidenza.js';
import { rigaPartita, collegaStelle, nomeSquadra, squadraDa, card, vuoto, heroHTML } from './comuni.js';
import { barraContesto, collegaContesto } from './contesto-ui.js';

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

function bloccoPreferite(indice, partite, oggi) {
  const pref = leggiPreferiti();
  if (!pref.length) return card('Le mie squadre', '<p class="muto">Tocca la stellina accanto a una squadra per vederla qui.</p>');
  const r = partitePreferite(indice.partite, pref, oggi);
  if (!r.length) return '';
  return card('Le mie squadre', r.map(x => `<div class="mia">
      <a href="#/squadra/${Number(x.squadraId)}" class="mia-nome">${stemmaHTML(squadraDa(indice, x.squadraId), 32)}${esc(nomeSquadra(indice, x.squadraId))}</a>
      ${x.ultima ? `<div class="mia-riga"><small>ultima</small>${rigaPartita(x.ultima, indice, { mostraData: true })}</div>` : ''}
      ${x.prossima ? `<div class="mia-riga"><small>prossima</small>${rigaPartita(x.prossima, indice, { mostraData: true })}</div>` : ''}
    </div>`).join(''));
}

const tessera = (titolo, chi, numero, href) => `<a class="tessera" href="${href}"><small>${esc(titolo)}</small><div class="chi">${chi}</div><div class="numero">${numero}</div></a>`;

async function inEvidenza(indice, scelto, carica) {
  try {
    if (scelto !== TUTTI) {
      const g = await carica(`girone/${scelto}.json`);
      const cl = capolista(g), cc = capocannoniere(g), ug = ultimaGiornata(g);
      const t = [];
      if (cl) t.push(tessera('Capolista', `${stemmaHTML(squadraDa(indice, cl.squadraId), 28)}<span>${esc(cl.nome)}</span>`, `${cl.pt}<small>punti</small>`, `#/squadra/${Number(cl.squadraId)}`));
      if (cc && cc.slug) t.push(tessera('Capocannoniere', `${stemmaHTML(squadraDa(indice, cc.squadraId), 28)}<span>${esc(cc.nome)}</span>`, `${cc.gol}<small>gol</small>`, `#/giocatore/${esc(cc.slug)}`));
      if (ug) t.push(tessera('Ultima giornata', `<span>${ug.partite.length} partite giocate</span>`, `${ug.giornata}ª<small>giornata</small>`, `#/classifiche/${esc(scelto)}`));
      return t.length ? `<div class="evidenza">${t.join('')}</div>` : '';
    }
    const esiti = await Promise.allSettled(gironi(indice).map(async x => ({ x, g: await carica(`girone/${x.slug}.json`) })));
    const tutti = esiti.filter(e => e.status === 'fulfilled').map(e => e.value);
    const t = tutti.map(({ x, g }) => ({ x, cl: capolista(g) })).filter(o => o.cl)
      .map(({ x, cl }) => tessera(`Capolista ${x.nome}`, `${stemmaHTML(squadraDa(indice, cl.squadraId), 28)}<span>${esc(cl.nome)}</span>`, `${cl.pt}<small>punti</small>`, `#/squadra/${Number(cl.squadraId)}`));
    return t.length ? `<div class="evidenza">${t.join('')}</div>` : '';
  } catch { return ''; }
}

export async function render({ indice, rotta, oggi, carica }) {
  const scelto = leggiGirone(indice);
  const partite = scelto === TUTTI ? indice.partite : indice.partite.filter(p => p.girone === scelto);
  const giorni = giorniConPartite(partite);
  const haDaDefinire = partite.some(p => !p.data);
  const param = rotta.params[0];
  const giorno = (param && (giorni.includes(param) || param === DA_DEFINIRE) ? param : null) || giornoIniziale(giorni, oggi) || (haDaDefinire ? DA_DEFINIRE : null);
  const hero = heroHTML({ foto: 'campo', classe: 'hero-home', contenuto: `
    <div class="contesto-riga">${barraContesto(indice, { tutti: true })}</div>
    ${giorno ? selettoreGiorno(giorni, giorno, oggi, haDaDefinire) : '<h1>Nessuna partita in calendario</h1>'}` });
  if (!giorno) return hero;
  const gruppi = raggruppaPerGirone(partiteDelGiorno(partite, giorno), indice);
  return `${hero}
    ${bloccoPreferite(indice, partite, oggi)}
    ${await inEvidenza(indice, scelto, carica)}
    ${gruppi.length ? gruppi.map(g => `<section class="card piena">
      <a class="intest-girone" href="#/classifiche/${esc(g.girone.slug)}"><span>${esc(g.campionato)} · <b>${esc(g.girone.nome)}</b></span><span class="freccia-piccola">classifica ›</span></a>
      ${g.partite.map(p => rigaPartita(p, indice, { evidenzia: giorno === oggi })).join('')}
    </section>`).join('') : vuoto('Nessuna partita in questo giorno.')}`;
}

export function dopo(ctx, root) {
  const ridisegna = async () => { root.innerHTML = await render(ctx); dopo(ctx, root); };
  const sel = root.querySelector('.giorno select');
  if (sel) sel.onchange = () => ctx.naviga(`#/partite/${sel.value}`);
  collegaStelle(root, ridisegna);
  collegaContesto(root, ctx.indice, { tutti: true, onCambio: () => { if (ctx.rotta.params.length) ctx.naviga('#/partite'); else ridisegna(); } });
}
