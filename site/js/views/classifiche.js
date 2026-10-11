import { esc, formaHTML, segnoDR, formattaDataLunga } from '../util.js';
import { èPreferita } from '../preferiti.js';
import { stemmaHTML } from '../stemma.js';
import { gironi, impostaGirone, risolviGirone } from '../contesto.js';
import { podio, inizioGirone } from '../evidenza.js';
import { inArchivio } from '../archivio.js';
import { condividiHTML, collegaCondividi, datiCondivisione } from './condividi.js';
import { vuoto, heroHTML, squadraDa, collegaStelle, card } from './comuni.js';
import { graficoCorsaSVG, legendaHTML, collegaLegenda, serieTitolo, serieMarcatori } from '../grafici/corsa.js';
import { leggiPreferiti } from '../preferiti.js';
import { calendarioHTML, collegaCalendario } from './calendario.js';
import { barraContesto, collegaContesto } from './contesto-ui.js';

let dati = null;

function podioHTML(indice, righe) {
  const p = podio(righe);
  if (p.length < 3 || !p[0].g) return '';
  const gradino = (r, n) => `<a class="gradino p${n}" href="#/squadra/${Number(r.squadraId)}">${stemmaHTML(squadraDa(indice, r.squadraId), n === 1 ? 56 : 44)}<span class="nome">${esc(r.nome)}</span><span class="pt">${r.pt} pt</span><span class="base">${n}</span></a>`;
  return `<div class="podio">${gradino(p[1], 2)}${gradino(p[0], 1)}${gradino(p[2], 3)}</div>`;
}

function classeZona(zone, pos, totale) {
  if (!zone) return '';
  if (zone.promozione && pos <= zone.promozione) return 'zona-su';
  if (zone.retrocessione && pos > totale - zone.retrocessione) return 'zona-giu';
  return '';
}

const SCHEDE = [['classifica', 'Classifica'], ['calendario', 'Calendario'], ['statistiche', 'Statistiche']];
const schedaDa = (p) => (SCHEDE.some(([k]) => k === p) ? p : 'classifica');
export const schedeHTML = (slug, scheda) => `<nav class="tabs" aria-label="Sezioni del girone">${SCHEDE.map(([k, l]) =>
  `<a href="#/classifiche/${esc(slug)}${k === 'classifica' ? '' : `/${k}`}" class="${k === scheda ? 'attivo' : ''}"${k === scheda ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;

function tabellaHTML(g, indice) {
  const forma = new Map(g.squadre.map(s => [s.id, s.forma]));
  const righe = g.classifica.totale || [];
  const inizio = inizioGirone(g.partite);
  return `${inizio.iniziato ? '' : `<p class="avviso-inizio">Il campionato inizia ${inizio.data ? esc(formattaDataLunga(inizio.data)) : 'a breve'}: la classifica si aggiorna dopo la prima giornata.</p>`}
    ${podioHTML(indice, righe)}
    ${righe.length ? `<section class="card piena"><div class="scroll-x"><table class="tab">
      <thead><tr><th>#</th><th class="sx">Squadra</th><th>PT</th><th>G</th><th>V</th><th>N</th><th>P</th><th>GF</th><th>GS</th><th>DR</th><th>Forma</th></tr></thead>
      <tbody>${righe.map(r => `<tr class="cliccabile ${èPreferita(r.squadraId) ? 'evid' : ''} ${classeZona(g.zone, r.pos, righe.length)}" data-squadra="${Number(r.squadraId)}"><td>${r.pos}</td><td class="sx nome">${stemmaHTML(squadraDa(indice, r.squadraId), 24)}${esc(r.nome)}</td><td><b>${r.pt}</b></td><td>${r.g}</td><td>${r.v}</td><td>${r.n}</td><td>${r.p}</td><td>${r.gf}</td><td>${r.gs}</td><td>${segnoDR(r.dr)}</td><td>${formaHTML(forma.get(r.squadraId))}</td></tr>`).join('')}</tbody>
    </table></div></section>
    ${g.zone ? '<p class="muto centro">Bordo verde: zona promozione · bordo rosso: zona retrocessione</p>' : ''}` : vuoto('Classifica non disponibile.')}`;
}

async function statisticheHTML(g) {
  const t = serieTitolo(g, inArchivio() ? [] : leggiPreferiti());
  const svgT = graficoCorsaSVG(t.xs, t.serie, { titolo: 'Corsa al titolo: punti giornata per giornata' });
  const m = serieMarcatori(g);
  const svgM = graficoCorsaSVG(m.xs, m.serie, { titolo: 'Corsa marcatori: gol giornata per giornata' });
  if (!svgT && !svgM) return vuoto('I grafici compaiono dopo la seconda giornata giocata.');
  return `${svgT ? card('Corsa al titolo', `<div class="corsa">${svgT}${legendaHTML(t.serie)}</div><p class="muto grafico-nota">Punti dopo ogni giornata · tocca un nome per evidenziarlo</p>`) : ''}
    ${svgM ? card('Corsa marcatori', `<div class="corsa">${svgM}${legendaHTML(m.serie)}</div><p class="muto grafico-nota">Gol segnati, giornata per giornata</p>`) : ''}`;
}

export async function render({ indice, rotta, carica, oggi }) {
  const lista = gironi(indice);
  if (!lista.length) return vuoto('Nessun campionato in corso.');
  const { mostrato: slug, salva } = risolviGirone(indice, rotta.params[0]);
  if (salva) impostaGirone(slug, indice);
  const scheda = schedaDa(rotta.params[1]);
  const g = await carica(`girone/${slug}.json`);
  dati = datiCondivisione('classifica', { nome: g.nome }, indice.sito, location.href, inArchivio());
  const parziali = g.stale && Object.keys(g.stale).length ? ' <span class="badge">dati parziali</span>' : '';
  const titolo = { classifica: 'Classifica', calendario: 'Calendario', statistiche: 'Statistiche' }[scheda];
  const corpo = scheda === 'calendario' ? calendarioHTML(g, indice, rotta.params[2], oggi)
    : scheda === 'statistiche' ? await statisticheHTML(g, indice) : tabellaHTML(g, indice);
  return `${heroHTML({ foto: 'campo', classe: 'hero-classifica', contenuto: `
      <div class="contesto-riga">${barraContesto(indice, { mostrato: slug })}</div>
      <div class="hero-titolo"><h1>${titolo}${parziali}</h1>${scheda === 'classifica' ? condividiHTML() : ''}</div><p class="sotto">${esc(g.campionato.nome)} · ${esc(g.nome)} · stagione ${esc(g.stagione)}</p>` })}
    ${schedeHTML(slug, scheda)}
    ${corpo}`;
}

export function dopo(ctx, root) {
  const slug = risolviGirone(ctx.indice, ctx.rotta.params[0]).mostrato;
  const scheda = schedaDa(ctx.rotta.params[1]);
  root.querySelectorAll('tr[data-squadra]').forEach(tr => { tr.onclick = () => ctx.naviga(`#/squadra/${tr.dataset.squadra}`); });
  collegaCondividi(root, dati);
  collegaCalendario(root, ctx, slug);
  collegaLegenda(root);
  collegaStelle(root, async () => { root.innerHTML = await render(ctx); dopo(ctx, root); });
  collegaContesto(root, ctx.indice, { mostrato: slug, onCambio: (s) => ctx.naviga(`#/classifiche/${s}${scheda === 'classifica' ? '' : `/${scheda}`}`) });
}
