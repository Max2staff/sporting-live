import { esc } from '../util.js';
import { stemmaHTML } from '../stemma.js';
import { èPreferita, togglePreferito } from '../preferiti.js';

export const iconaStella = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.7 5.9 21.1l1.4-6.8L2.2 9.6l6.9-.8z"/></svg>';
export const stellaHTML = (id, nome, attiva = èPreferita(id)) => `<button class="stella ${attiva ? 'attiva' : ''}" data-squadra="${id}" aria-label="Preferita: ${esc(nome)}" aria-pressed="${attiva}">${iconaStella}</button>`;
export function collegaStelle(root, onToggle) {
  root.querySelectorAll('.stella[data-squadra]').forEach(b => {
    b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); togglePreferito(b.dataset.squadra); onToggle(); };
  });
}
export function squadraDa(indice, id) {
  const s = indice.squadre.find(x => x.id === id);
  return s ? { id: s.id, nome: s.nome, stemma: !!s.stemma } : { id, nome: '?', stemma: false };
}
export const heroHTML = ({ foto = 'campo', classe = '', contenuto = '' }) =>
  `<section class="hero ${classe}" style="--foto:url(img/foto/${foto}.jpg)">${contenuto}</section>`;
export const nomeSquadra = (indice, id) => (indice.squadre.find(s => s.id === id) || { nome: '?' }).nome;
export const card = (titolo, corpo, cls = '') => `<section class="card ${cls}">${titolo ? `<h3>${esc(titolo)}</h3>` : ''}${corpo}</section>`;
export const vuoto = (msg) => `<p class="vuoto">${esc(msg)}</p>`;
export const linkSquadra = (indice, id) => `<a href="#/squadra/${id}" class="sq">${esc(nomeSquadra(indice, id))}</a>`;

export function rigaPartita(p, indice, { evidenzia = false, mostraData = false } = {}) {
  const risultato = p.giocata ? `<span class="ris ${evidenzia ? 'evid' : ''}">${p.golCasa}<i>-</i>${p.golOspite}</span>` : `<span class="ora">${esc(p.ora || '--:--')}</span>`;
  const casaPref = èPreferita(p.casaId), ospPref = èPreferita(p.ospiteId);
  return `<div class="partita ${p.tavolino ? 'tavolino' : ''}">
    <a class="partita-link" href="#/partita/${p.id}" aria-label="Partita: ${esc(nomeSquadra(indice, p.casaId))} - ${esc(nomeSquadra(indice, p.ospiteId))}"></a>
    <div class="quando">${mostraData ? `<small>${esc(p.data ? p.data.slice(8, 10) + '/' + p.data.slice(5, 7) : 'n.d.')}</small>` : ''}${risultato}</div>
    <div class="squadre">
      <div class="riga ${casaPref ? 'pref' : ''}">${stemmaHTML(squadraDa(indice, p.casaId), 24)}<span>${esc(nomeSquadra(indice, p.casaId))}</span>${stellaHTML(p.casaId, nomeSquadra(indice, p.casaId), casaPref)}</div>
      <div class="riga ${ospPref ? 'pref' : ''}">${stemmaHTML(squadraDa(indice, p.ospiteId), 24)}<span>${esc(nomeSquadra(indice, p.ospiteId))}</span>${stellaHTML(p.ospiteId, nomeSquadra(indice, p.ospiteId), ospPref)}</div>
    </div>
    <div class="extra">${p.tavolino ? '<span class="badge">tav.</span>' : ''}${p.tabellino ? '<span class="badge accento">tabellino</span>' : ''}</div>
  </div>`;
}
