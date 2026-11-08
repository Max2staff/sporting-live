import { esc, daISO, formattaDataLunga } from '../util.js';
import { DA_DEFINIRE, giorniConPartite, giornoIniziale, partiteDelGiorno, raggruppaPerGirone, partitePreferite } from '../giorni.js';
import { leggiPreferiti } from '../preferiti.js';
import { stemmaHTML } from '../stemma.js';
import { TUTTI, leggiGirone, gironi, gironiVisibili } from '../contesto.js';
import { capolista, capocannoniere, ultimaGiornata, gironiDaIniziare } from '../evidenza.js';
import { rigaPartita, collegaStelle, nomeSquadra, squadraDa, card, vuoto } from './comuni.js';
import { inArchivio } from '../archivio.js';
import { barraContesto, collegaContesto, categorieHTML, collegaCategorie } from './contesto-ui.js';

const GG = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MM = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

// Fila di giorni da scorrere col dito: il giorno scelto è centrato, "Oggi" ha il suo nome.
function selettoreGiorno(giorni, giorno, oggi, haDaDefinire) {
  const voce = (g) => {
    const attivo = g === giorno;
    if (g === DA_DEFINIRE) return `<a class="giorno-voce${attivo ? ' attivo' : ''}" href="#/partite/${DA_DEFINIRE}"${attivo ? ' aria-current="date"' : ''}><span>Senza</span><b>?</b><small>data</small></a>`;
    const d = daISO(g);
    const sopra = g === oggi ? 'Oggi' : GG[d.getDay()];
    return `<a class="giorno-voce${attivo ? ' attivo' : ''}${g === oggi ? ' oggi' : ''}" href="#/partite/${g}"${attivo ? ' aria-current="date"' : ''} aria-label="${esc(formattaDataLunga(g))}"><span>${sopra}</span><b>${d.getDate()}</b><small>${MM[d.getMonth()]}</small></a>`;
  };
  return `<nav class="giorni" aria-label="Scegli il giorno">${giorni.map(voce).join('')}${haDaDefinire ? voce(DA_DEFINIRE) : ''}</nav>`;
}

function bloccoPreferite(indice, partite, oggi) {
  if (inArchivio()) return '';
  const pref = leggiPreferiti();
  if (!pref.length) return '<a class="suggerimento" href="#/preferite"><span>Tocca la ☆ accanto a una squadra per seguirla: la ritrovi qui in cima.</span><b>Scegli le tue squadre</b></a>';
  const r = partitePreferite(indice.partite, pref, oggi);
  if (!r.length) return '';
  return card('', `<div class="mie-testa"><h3>Le mie squadre</h3><a href="#/preferite" class="link-tap">Modifica</a></div>` + r.map(x => `<div class="mia">
      <a href="#/squadra/${Number(x.squadraId)}" class="mia-nome">${stemmaHTML(squadraDa(indice, x.squadraId), 32)}${esc(nomeSquadra(indice, x.squadraId))}</a>
      ${x.ultima ? `<div class="mia-riga"><small>ultima</small>${rigaPartita(x.ultima, indice, { mostraData: true })}</div>` : ''}
      ${x.prossima ? `<div class="mia-riga"><small>prossima</small>${rigaPartita(x.prossima, indice, { mostraData: true })}</div>` : ''}
    </div>`).join(''));
}

const tessera = (titolo, chi, numero, href) => `<a class="tessera" href="${href}"><small>${esc(titolo)}</small><div class="chi">${chi}</div><div class="numero">${numero}</div></a>`;

// Card "inizia ..." per i gironi visibili che non hanno ancora partite giocate (sparisce da sola alla prima partita giocata).
function bloccoInizio(indice, visibili) {
  if (inArchivio()) return '';
  return gironiDaIniziare(indice, visibili).map(x => card(`${x.girone.nome} · ${x.campionato}`, `
    <p class="inizio-testo"><b>${x.data ? `Si parte ${esc(formattaDataLunga(x.data))}` : 'Calendario in arrivo'}</b></p>
    ${x.partite.map(p => rigaPartita(p, indice)).join('')}
    <a class="inizio-link" href="#/classifiche/${esc(x.girone.slug)}">Vai alla classifica ›</a>`, 'inizio')).join('');
}

async function inEvidenza(indice, scelto, carica, visibili) {
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
    const esiti = await Promise.allSettled(gironi(indice).filter(x => visibili.includes(x.slug)).map(async x => ({ x, g: await carica(`girone/${x.slug}.json`) })));
    const tutti = esiti.filter(e => e.status === 'fulfilled').map(e => e.value);
    const t = tutti.map(({ x, g }) => ({ x, cl: capolista(g) })).filter(o => o.cl)
      .map(({ x, cl }) => tessera(`Capolista ${x.nome}`, `${stemmaHTML(squadraDa(indice, cl.squadraId), 28)}<span>${esc(cl.nome)}</span>`, `${cl.pt}<small>punti</small>`, `#/squadra/${Number(cl.squadraId)}`));
    return t.length ? `<div class="evidenza">${t.join('')}</div>` : '';
  } catch { return ''; }
}

export async function render({ indice, rotta, oggi, carica }) {
  const scelto = leggiGirone(indice);
  const visibili = gironiVisibili(indice);
  const partite = indice.partite.filter(p => visibili.includes(p.girone));
  const giorni = giorniConPartite(partite);
  const haDaDefinire = partite.some(p => !p.data);
  const param = rotta.params[0];
  const giorno = (param && (giorni.includes(param) || param === DA_DEFINIRE) ? param : null) || giornoIniziale(giorni, oggi) || (haDaDefinire ? DA_DEFINIRE : null);
  const titolo = !giorno ? 'Nessuna partita in calendario' : giorno === DA_DEFINIRE ? 'Partite da definire' : giorno === oggi ? `Oggi, ${formattaDataLunga(giorno)}` : formattaDataLunga(giorno);
  const testa = `<section class="testa-home">
    <div class="contesto-riga">${barraContesto(indice, { tutti: true })}${scelto !== TUTTI ? `<a class="link-calendario" href="#/classifiche/${esc(scelto)}/calendario">Calendario</a>` : ''}</div>
    ${categorieHTML(indice)}
    ${giorno ? selettoreGiorno(giorni, giorno, oggi, haDaDefinire) : ''}
    <h1 class="titolo-giorno">${esc(titolo.charAt(0).toUpperCase() + titolo.slice(1))}</h1>
  </section>`;
  if (!giorno) return testa + bloccoInizio(indice, visibili);
  const gruppi = raggruppaPerGirone(partiteDelGiorno(partite, giorno), indice);
  const pref = bloccoPreferite(indice, partite, oggi);
  const mieInCima = pref && !pref.startsWith('<p');
  return `${testa}
    ${mieInCima ? pref : ''}
    ${gruppi.length ? gruppi.map(g => `<section class="card piena girone-giorno">
      <a class="intest-girone" href="#/classifiche/${esc(g.girone.slug)}"><span>${esc(g.campionato)} <b>${esc(g.girone.nome)}</b></span><span class="freccia-piccola">Classifica</span></a>
      ${g.partite.map(p => rigaPartita(p, indice, { evidenzia: giorno === oggi })).join('')}
    </section>`).join('') : vuoto('Nessuna partita in questo giorno.')}
    ${mieInCima ? '' : pref}
    ${await inEvidenza(indice, scelto, carica, visibili)}
    ${bloccoInizio(indice, visibili)}`;
}

export function dopo(ctx, root) {
  const ridisegna = async () => { root.innerHTML = await render(ctx); dopo(ctx, root); };
  const fila = root.querySelector('.giorni'), att = fila?.querySelector('.attivo');
  if (fila && att) fila.scrollLeft = att.offsetLeft - (fila.clientWidth - att.offsetWidth) / 2;
  collegaStelle(root, ridisegna);
  const cambio = () => { if (ctx.rotta.params.length) ctx.naviga('#/partite'); else ctx.nuovoPasso(); };
  collegaContesto(root, ctx.indice, { tutti: true, onCambio: cambio });
  collegaCategorie(root, cambio);
}
