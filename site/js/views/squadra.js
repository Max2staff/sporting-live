import { esc, formaHTML, formattaData, pallinoForma } from '../util.js';
import { stemmaHTML } from '../stemma.js';
import { stellaHTML, collegaStelle, card, vuoto, heroHTML, squadraDa } from './comuni.js';

let tab = 'risultati';
let ultimaId = null;

const rigaRis = (p, indice) => `<a class="ris-riga" href="#/partita/${p.id}"><span class="data">${esc(formattaData(p.data))}</span><span class="avv">${stemmaHTML(squadraDa(indice, p.avversarioId), 22)}<span>${p.casa ? '' : '@ '}${esc(p.avversario)}</span></span><span class="punti">${p.esito ? `${pallinoForma(p.esito)} <b>${p.gf}-${p.gs}</b>` : `<small>${esc(p.ora || '')}</small>`}</span></a>`;

function risultati(s, indice) {
  const prossima = s.partite.find(p => !p.giocata);
  return `${s.foto ? `<img class="foto-squadra" src="img/squadre/${Number(s.id)}.jpg" alt="Foto di squadra: ${esc(s.nome)}" loading="lazy">` : ''}
    ${prossima ? card('Prossima partita', rigaRis(prossima, indice)) : ''}
    ${card('Tutte le partite', s.partite.length ? s.partite.map(p => rigaRis(p, indice)).join('') : '<p class="muto">Nessuna partita.</p>')}`;
}

function rosa(s) {
  if (!s.rosa.length) return vuoto('La rosa compare dopo la prima partita con tabellino.');
  const r = [...s.rosa].sort((a, b) => b.presenze - a.presenze || b.gol - a.gol || a.nome.localeCompare(b.nome));
  return `<section class="card piena"><div class="scroll-x"><table class="tab"><thead><tr><th class="sx">Giocatore</th><th>Pres.</th><th>Gol</th><th>Voto</th><th>Cart.</th></tr></thead>
    <tbody>${r.map(g => `<tr class="cliccabile" data-slug="${g.slug}"><td class="sx nome">${esc(g.nome)}${g.mvp ? ` <span class="badge accento">${g.mvp}★</span>` : ''}</td><td>${g.presenze}</td><td>${g.gol}</td><td>${g.votoMedio ?? '–'}</td><td>${g.ammonizioni ? `${g.ammonizioni}<i class="cart giallo"></i>` : ''}${g.espulsioni ? `${g.espulsioni}<i class="cart rosso"></i>` : ''}</td></tr>`).join('')}</tbody></table></div></section>`;
}

function statistiche(s) {
  const st = s.stat;
  if (!st.g) return vuoto('Le statistiche compaiono dopo la prima partita.');
  const blocco = (t, x) => `<div class="stat"><small>${t}</small><b>${x}</b></div>`;
  return `${card('Rendimento', `<div class="stat-griglia">
      ${blocco('Giocate', st.g)}${blocco('Vinte', st.v)}${blocco('Pari', st.n)}${blocco('Perse', st.p)}
      ${blocco('Gol fatti', `${st.gf} <small>(${st.mediaGf}/partita)</small>`)}${blocco('Gol subiti', `${st.gs} <small>(${st.mediaGs}/partita)</small>`)}
      ${blocco('In casa', `${st.casa.v}V ${st.casa.n}N ${st.casa.p}P`)}${blocco('Fuori', `${st.fuori.v}V ${st.fuori.n}N ${st.fuori.p}P`)}
    </div>`)}
    ${card('Forma e serie', `<p>Ultime partite: ${formaHTML(s.forma)}</p>${st.serie ? `<p class="muto">Serie in corso: ${st.serie.n} ${({ V: 'vittorie', N: 'pareggi', P: 'sconfitte' })[st.serie.tipo]} di fila</p>` : ''}`)}`;
}

export async function render({ indice, rotta, carica }) {
  const s = await carica(`squadra/${rotta.params[0]}.json`);
  if (s.id !== ultimaId) { tab = 'risultati'; ultimaId = s.id; }
  const corpo = tab === 'rosa' ? rosa(s) : tab === 'statistiche' ? statistiche(s) : risultati(s, indice);
  return `${heroHTML({ foto: 'campo', classe: 'hero-squadra-box', contenuto: `
      <div class="hero-squadra">${stemmaHTML({ id: s.id, nome: s.nome, stemma: s.stemma }, 72)}
        <div><h1>${esc(s.nome)}</h1><p class="sotto"><a href="#/classifiche/${esc(s.girone.slug)}">${esc(s.girone.nome)}</a>${s.pos ? ` · ${s.pos}º posto · ${s.riga.pt} pt` : ''}</p>
        <p class="sotto">${formaHTML(s.forma)}</p></div>
        ${stellaHTML(s.id, s.nome)}</div>` })}
    <div class="tabs">${[['risultati', 'Risultati'], ['rosa', 'Rosa'], ['statistiche', 'Statistiche']].map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'attivo' : ''}">${l}</button>`).join('')}</div>
    ${corpo}`;
}

export function dopo(ctx, root) {
  root.querySelectorAll('.tabs button').forEach(b => { b.onclick = async () => { tab = b.dataset.tab; root.innerHTML = await render(ctx); dopo(ctx, root); }; });
  root.querySelectorAll('tr[data-slug]').forEach(tr => { tr.onclick = () => ctx.naviga(`#/giocatore/${tr.dataset.slug}`); });
  collegaStelle(root, async () => { root.innerHTML = await render(ctx); dopo(ctx, root); });
}
