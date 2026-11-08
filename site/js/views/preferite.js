import { esc } from '../util.js';
import { stemmaHTML } from '../stemma.js';
import { gironi } from '../contesto.js';
import { leggiPreferiti } from '../preferiti.js';
import { inArchivio } from '../archivio.js';
import { stellaHTML, collegaStelle, card } from './comuni.js';

// "Le mie squadre": tutte le squadre per girone, con la stellina accanto al nome (piena = preferita).
const squadreDi = (indice, slug) => indice.squadre
  .filter(s => s.girone === slug && s.nome.trim().toUpperCase() !== 'RIPOSO')
  .sort((a, b) => a.nome.localeCompare(b.nome));

const riga = (s) => `<div class="riga-pref" data-nome="${esc(s.nome.toLowerCase())}">
    ${stellaHTML(s.id, s.nome)}${stemmaHTML(s, 24)}<a href="#/squadra/${Number(s.id)}">${esc(s.nome)}</a>
  </div>`;

function riepilogo(indice) {
  const pref = leggiPreferiti();
  if (!pref.length) return '<p class="muto">Nessuna squadra scelta. Tocca la ☆ accanto al nome: diventa piena e la squadra è tra le tue preferite.</p>';
  const nomi = pref.map(id => indice.squadre.find(s => s.id === id)).filter(Boolean);
  return `<p class="muto">${nomi.length === 1 ? 'La tua squadra' : `Le tue ${nomi.length} squadre`}, in cima alla pagina Partite:</p>
    <div class="pref-scelte">${nomi.map(s => `<span class="pref-scelta">${stemmaHTML(s, 24)}${esc(s.nome)}</span>`).join('')}</div>`;
}

export async function render({ indice }) {
  if (inArchivio()) return card('Le mie squadre', '<p>Le squadre preferite valgono per la stagione in corso. <a href="#/preferite" data-no-prefisso>Vai alla stagione in corso</a></p>');
  const elenco = gironi(indice).map(g => {
    const sq = squadreDi(indice, g.slug);
    return sq.length ? `<section class="card piena gruppo-pref"><h3 class="intest-girone"><span>${esc(g.campionato.nome)} <b>${esc(g.nome)}</b></span></h3>${sq.map(riga).join('')}</section>` : '';
  }).join('');
  return `<h1 class="titolo-pagina">Le mie squadre</h1>
    <section class="card riepilogo-pref" aria-live="polite">${riepilogo(indice)}</section>
    <input class="campo-cerca" type="search" placeholder="Cerca una squadra" aria-label="Cerca una squadra" data-filtro>
    ${elenco}`;
}

export function dopo(ctx, root) {
  const aggiorna = () => {
    root.querySelector('.riepilogo-pref').innerHTML = riepilogo(ctx.indice);
  };
  // aggiorna solo la stellina toccata e il riepilogo: la pagina non salta e il filtro resta
  collegaStelle(root, aggiorna);
  const filtro = root.querySelector('[data-filtro]');
  if (filtro) filtro.oninput = () => {
    const q = filtro.value.trim().toLowerCase();
    root.querySelectorAll('.gruppo-pref').forEach(g => {
      let visibili = 0;
      g.querySelectorAll('.riga-pref').forEach(r => { const ok = !q || r.dataset.nome.includes(q); r.hidden = !ok; if (ok) visibili++; });
      g.hidden = visibili === 0;
    });
  };
}
