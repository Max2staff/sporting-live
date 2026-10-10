import { esc, formattaDataLunga, segnoDR } from '../util.js';
import { timelineMarcatori, formazioniAffiancate, slugGiocatore } from '../tabellino.js';
import { stemmaHTML } from '../stemma.js';
import { stellaHTML, collegaStelle, vuoto, heroHTML, squadraDa } from './comuni.js';

let tab = 'riepilogo';
let ultimaId = null;

const cellaGiocatore = (g, sq, lato) => g ? `<td class="${lato}"><a href="#/giocatore/${slugGiocatore(sq, g.nome)}">${esc(g.nome)}</a>${g.ammonito ? '<i class="cart giallo"></i>' : ''}${g.espulso ? '<i class="cart rosso"></i>' : ''}${g.voto != null ? `<b class="voto">${g.voto}</b>` : ''}</td>` : '<td></td>';
const numero = (g) => g && g.numero != null ? g.numero : '';

const nomeLink = (t, sq, nome) => (t.formazioni || []).some(f => f.squadraId === sq && f.nome === nome)
  ? `<a href="#/giocatore/${slugGiocatore(sq, nome)}">${esc(nome)}</a>` : `<span>${esc(nome)}</span>`;

function riepilogo(p) {
  const t = p.tabellino;
  if (!t) return vuoto(p.giocata ? 'Tabellino non ancora pubblicato.' : 'La partita non è ancora stata giocata.');
  const tl = timelineMarcatori(t, p.casa.id);
  return `<section class="card">
    ${tl.length ? `<ul class="timeline">${tl.map(m => `<li class="${m.lato}"><span class="min">${m.minuto}'</span><span class="pallone" aria-hidden="true">⚽</span>${nomeLink(t, m.lato === 'casa' ? p.casa.id : p.ospite.id, m.nome)}</li>`).join('')}</ul>` : '<p class="muto">Nessun marcatore registrato.</p>'}
    ${t.migliore && t.migliore.squadraId != null ? `<p class="mvp"><span class="badge">★ MVP</span>${nomeLink(t, t.migliore.squadraId, t.migliore.nome)}</p>` : ''}
  </section>`;
}

function formazioni(p) {
  const t = p.tabellino;
  if (!t || !t.completo) return vuoto('Formazioni non ancora pubblicate.');
  const righe = formazioniAffiancate(t, p.casa.id, p.ospite.id);
  return `<section class="card piena"><table class="tab form"><thead><tr><th class="casa">${esc(p.casa.nome)}</th><th>#</th><th class="ospite">${esc(p.ospite.nome)}</th></tr></thead>
    <tbody>${righe.map(r => `<tr>${cellaGiocatore(r.casa, p.casa.id, 'casa')}<td class="num">${numero(r.casa)}${r.ospite && numero(r.ospite) !== numero(r.casa) ? `/${numero(r.ospite)}` : ''}</td>${cellaGiocatore(r.ospite, p.ospite.id, 'ospite')}</tr>`).join('')}</tbody></table></section>`;
}

async function classifica(p, carica, indice) {
  try {
    const g = await carica(`girone/${p.girone.slug}.json`);
    const righe = g.classifica.totale;
    return `<section class="card piena"><div class="scroll-x"><table class="tab"><thead><tr><th>#</th><th class="sx">Squadra</th><th>PT</th><th>G</th><th>DR</th></tr></thead>
    <tbody>${righe.map(r => `<tr class="${[p.casa.id, p.ospite.id].includes(r.squadraId) ? 'evid' : ''}"><td>${r.pos}</td><td class="sx nome"><a href="#/squadra/${Number(r.squadraId)}">${stemmaHTML(squadraDa(indice, r.squadraId), 24)}${esc(r.nome)}</a></td><td><b>${r.pt}</b></td><td>${r.g}</td><td>${segnoDR(r.dr)}</td></tr>`).join('')}</tbody></table></div></section>
    <p class="muto centro"><a href="#/classifiche/${p.girone.slug}">Classifica completa ›</a></p>`;
  } catch { return vuoto('Classifica non disponibile.'); }
}

export async function render({ indice, rotta, carica }) {
  const p = await carica(`partita/${rotta.params[0]}.json`);
  if (p.id !== ultimaId) { tab = 'riepilogo'; ultimaId = p.id; }
  const corpo = tab === 'formazioni' ? formazioni(p) : tab === 'classifica' ? await classifica(p, carica, indice) : riepilogo(p);
  const lato = (sq) => `<div class="lato"><a href="#/squadra/${Number(sq.id)}">${stemmaHTML(squadraDa(indice, sq.id), 72)}<span>${esc(sq.nome)}</span></a>${stellaHTML(sq.id, sq.nome)}</div>`;
  return `${heroHTML({ foto: 'campo', classe: 'hero-partita', contenuto: `
      <div class="meta">${esc(p.girone.nome)} · giornata ${Number(p.giornata)} · ${esc(formattaDataLunga(p.data))}${p.ora ? ` ore ${esc(p.ora)}` : ''}${p.tavolino ? ' · <span class="badge">a tavolino</span>' : ''}</div>
      <div class="scontro">${lato(p.casa)}<div class="punteggio">${p.giocata ? `${p.golCasa}<i>-</i>${p.golOspite}` : `<small>${esc(p.ora || '--:--')}</small>`}</div>${lato(p.ospite)}</div>` })}
    <div class="tabs">${[['riepilogo', 'Riepilogo'], ['formazioni', 'Formazioni'], ['classifica', 'Classifica']].map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'attivo' : ''}">${l}</button>`).join('')}</div>
    ${corpo}`;
}

export function dopo(ctx, root) {
  root.querySelectorAll('.tabs button').forEach(b => { b.onclick = async () => { tab = b.dataset.tab; root.innerHTML = await render(ctx); dopo(ctx, root); }; });
  collegaStelle(root, async () => { root.innerHTML = await render(ctx); dopo(ctx, root); });
}
