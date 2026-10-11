import { esc, formaHTML, segnoDR, formattaDataLunga } from '../util.js';
import { èPreferita } from '../preferiti.js';
import { stemmaHTML } from '../stemma.js';
import { gironi, impostaGirone, risolviGirone } from '../contesto.js';
import { podio, inizioGirone } from '../evidenza.js';
import { inArchivio } from '../archivio.js';
import { condividiHTML, collegaCondividi, datiCondivisione } from './condividi.js';
import { vuoto, heroHTML, squadraDa } from './comuni.js';
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

export async function render({ indice, rotta, carica }) {
  const lista = gironi(indice);
  if (!lista.length) return vuoto('Nessun campionato in corso.');
  const { mostrato: slug, salva } = risolviGirone(indice, rotta.params[0]);
  if (salva) impostaGirone(slug, indice);
  const g = await carica(`girone/${slug}.json`);
  const forma = new Map(g.squadre.map(s => [s.id, s.forma]));
  const righe = g.classifica.totale || [];
  dati = datiCondivisione('classifica', { nome: g.nome }, indice.sito, location.href, inArchivio());
  const inizio = inizioGirone(g.partite);
  const parziali = g.stale && Object.keys(g.stale).length ? ' <span class="badge">dati parziali</span>' : '';
  return `${heroHTML({ foto: 'campo', classe: 'hero-classifica', contenuto: `
      <div class="contesto-riga">${barraContesto(indice, { mostrato: slug })}</div>
      <div class="hero-titolo"><h1>Classifica${parziali}</h1>${condividiHTML()}</div><p class="sotto">${esc(g.campionato.nome)} · ${esc(g.nome)} · stagione ${esc(g.stagione)}</p>` })}
    ${inizio.iniziato ? '' : `<p class="avviso-inizio">Il campionato inizia ${inizio.data ? esc(formattaDataLunga(inizio.data)) : 'a breve'}: la classifica si aggiorna dopo la prima giornata.</p>`}
    ${podioHTML(indice, righe)}
    ${righe.length ? `<section class="card piena"><div class="scroll-x"><table class="tab">
      <thead><tr><th>#</th><th class="sx">Squadra</th><th>PT</th><th>G</th><th>V</th><th>N</th><th>P</th><th>GF</th><th>GS</th><th>DR</th><th>Forma</th></tr></thead>
      <tbody>${righe.map(r => `<tr class="cliccabile ${èPreferita(r.squadraId) ? 'evid' : ''} ${classeZona(g.zone, r.pos, righe.length)}" data-squadra="${Number(r.squadraId)}"><td>${r.pos}</td><td class="sx nome">${stemmaHTML(squadraDa(indice, r.squadraId), 24)}${esc(r.nome)}</td><td><b>${r.pt}</b></td><td>${r.g}</td><td>${r.v}</td><td>${r.n}</td><td>${r.p}</td><td>${r.gf}</td><td>${r.gs}</td><td>${segnoDR(r.dr)}</td><td>${formaHTML(forma.get(r.squadraId))}</td></tr>`).join('')}</tbody>
    </table></div></section>
    ${g.zone ? '<p class="muto centro">Bordo verde: zona promozione · bordo rosso: zona retrocessione</p>' : ''}` : vuoto('Classifica non disponibile.')}`;
}

export function dopo(ctx, root) {
  root.querySelectorAll('tr[data-squadra]').forEach(tr => { tr.onclick = () => ctx.naviga(`#/squadra/${tr.dataset.squadra}`); });
  collegaCondividi(root, dati);
  collegaContesto(root, ctx.indice, { mostrato: risolviGirone(ctx.indice, ctx.rotta.params[0]).mostrato, onCambio: (slug) => ctx.naviga(`#/classifiche/${slug}`) });
}

