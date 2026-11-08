import { esc } from '../util.js';
import { stemmaHTML } from '../stemma.js';
import { èPreferita, togglePreferito } from '../preferiti.js';
import { inArchivio } from '../archivio.js';

export const iconaStella = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.7 5.9 21.1l1.4-6.8L2.2 9.6l6.9-.8z"/></svg>';
// In archivio le stelline non si mostrano: i preferiti valgono solo per la stagione corrente.
export const stellaHTML = (id, nome, attiva = èPreferita(id)) => inArchivio() ? '' : `<button class="stella ${attiva ? 'attiva' : ''}" data-squadra="${id}" aria-label="Preferita: ${esc(nome)}" aria-pressed="${attiva}">${iconaStella}</button>`;
export function collegaStelle(root, onToggle) {
  root.querySelectorAll('.stella[data-squadra]').forEach(b => {
    b.onclick = (e) => {
      e.preventDefault(); e.stopPropagation();
      togglePreferito(b.dataset.squadra);
      const on = èPreferita(b.dataset.squadra);
      // tutte le stelline della stessa squadra nella pagina cambiano subito (piena = preferita)
      root.querySelectorAll(`.stella[data-squadra="${b.dataset.squadra}"]`).forEach(x => { x.classList.toggle('attiva', on); x.setAttribute('aria-pressed', String(on)); });
      onToggle();
    };
  });
}
export function squadraDa(indice, id) {
  const s = indice.squadre.find(x => x.id === id);
  return s ? { id: s.id, nome: s.nome, stemma: !!s.stemma } : { id, nome: '?', stemma: false };
}
export const heroHTML = ({ foto = 'campo', classe = '', contenuto = '' }) =>
  `<section class="hero ${classe}"><img class="sfondo-foto" src="img/foto/${foto}.jpg" alt="" aria-hidden="true" decoding="async">${contenuto}</section>`;
export const nomeSquadra = (indice, id) => (indice.squadre.find(s => s.id === id) || { nome: '?' }).nome;
export const card = (titolo, corpo, cls = '') => `<section class="card ${cls}">${titolo ? `<h3>${esc(titolo)}</h3>` : ''}${corpo}</section>`;
export const vuoto = (msg) => `<p class="vuoto">${esc(msg)}</p>`;
export const linkSquadra = (indice, id) => `<a href="#/squadra/${id}" class="sq">${esc(nomeSquadra(indice, id))}</a>`;

// Riga partita "da tabellone": a sinistra stato (orario, Finale, data), poi le due squadre una sotto l'altra con i gol accanto.
export function rigaPartita(p, indice, { evidenzia = false, mostraData = false } = {}) {
  const casaPref = èPreferita(p.casaId), ospPref = èPreferita(p.ospiteId);
  const g = p.giocata, gc = Number(p.golCasa), go = Number(p.golOspite);
  const data = mostraData ? `<small>${esc(p.data ? p.data.slice(8, 10) + '/' + p.data.slice(5, 7) : 'n.d.')}</small>` : '';
  const stato = g ? `${data}<span class="fin">${p.tavolino ? 'Tav.' : 'Finale'}</span>` : `${data}<span class="ora">${esc(p.ora || '--:--')}</span>`;
  const lato = (id, pref, gol, vince) => `<div class="riga ${pref ? 'pref' : ''} ${g && vince ? 'vince' : ''}">${stellaHTML(id, nomeSquadra(indice, id), pref)}${stemmaHTML(squadraDa(indice, id), 24)}<span class="nome-sq">${esc(nomeSquadra(indice, id))}</span>${g ? `<b class="gol">${esc(gol)}</b>` : ''}</div>`;
  return `<div class="partita ${p.tavolino ? 'tavolino' : ''} ${g ? 'giocata' : ''} ${evidenzia && g ? 'evid' : ''}">
    <a class="partita-link" href="#/partita/${p.id}" aria-label="Partita: ${esc(nomeSquadra(indice, p.casaId))} - ${esc(nomeSquadra(indice, p.ospiteId))}${g ? ` ${gc}-${go}` : ''}"></a>
    <div class="quando">${stato}</div>
    <div class="squadre">
      ${lato(p.casaId, casaPref, p.golCasa, gc > go)}
      ${lato(p.ospiteId, ospPref, p.golOspite, go > gc)}
    </div>
  </div>`;
}
