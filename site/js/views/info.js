import { esc, formattaOra, formattaData } from '../util.js';
import { leggiTema, impostaTema } from '../tema.js';
import { caricaJSON } from '../data.js';
import { card, heroHTML } from './comuni.js';
import { riattivaIntro } from '../contesto.js';
import { inArchivio } from '../archivio.js';

const caricaCorrente = (rel) => caricaJSON(rel);
export const VERSIONE = '1.0.0';
const EMAIL = 'massimiliano.griletti@gmail.com';   // da confermare con l'utente prima della pubblicazione

// Card "Archivio": edizioni chiuse con i documenti (PDF delle finali) come link esterni.
function archivioCard(edizioni) {
  if (!edizioni.length) return '';
  return card('Archivio', `<p class="muto">Stagioni e tornei passati: risultati, classifiche e marcatori.</p>${edizioni.map(e => `<div class="arch-ed">
      <a class="doc-link" href="#/a/${encodeURIComponent(e.slug)}/partite"><span>${esc(e.nome)}</span><span aria-hidden="true">›</span></a>
      ${(e.documenti || []).map(d => `<a class="doc-link doc-sub" href="${esc(d.url)}" target="_blank" rel="noopener"><span>${esc(d.titolo)}</span><span aria-hidden="true">↗</span></a>`).join('')}
    </div>`).join('')}`);
}

export async function render({ indice, indiceCorrente, carica }) {
  const corrente = indiceCorrente || indice;
  let docs = [];
  // documenti ufficiali e archivio sono della stagione corrente anche quando si guarda un'edizione d'archivio
  try { docs = ((await caricaCorrente('documenti.json')) || {}).documenti || []; } catch (e) { docs = []; }
  const t = leggiTema();
  return `${heroHTML({ foto: 'premiazione', classe: 'hero-info', contenuto: `<h1>Sporting <b style="color:var(--arancio)">Live</b></h1><p class="sotto">I campionati dello Sporting Club Mestre · Endas Venezia, dal telefono.</p>` })}
    ${card('Cos\'è', `<p>Risultati, classifiche e statistiche dei campionati organizzati dallo <b>Sporting Club Mestre</b> (Endas Venezia), pensati per il telefono. Aggiungi l'app alla schermata Home per averla sempre a portata di mano.</p>`)}
    ${card('Fonte dei dati', `<p>I dati sono letti dal sito ufficiale <a href="https://www.campionatisportingclub.it/" rel="noopener">campionatisportingclub.it</a> con il consenso dell'organizzazione. Ultimo aggiornamento: ${esc(formattaData(indice.generato.slice(0, 10)))} alle ${esc(formattaOra(indice.generato))}. Fa fede il sito ufficiale.</p>`)}
    ${docs.length ? card('Documenti ufficiali', `<div class="doc-lista">${docs.map(d => `<a class="doc-link" href="${esc(d.url)}" target="_blank" rel="noopener"><span>${esc(d.titolo)}</span><span aria-hidden="true">↗</span></a>`).join('')}</div>`) : ''}
    ${archivioCard(corrente.edizioni || [])}
    ${card('Aspetto', `<div class="segmenti">${[['scuro', 'Scuro'], ['chiaro', 'Chiaro'], ['auto', 'Automatico']].map(([k, l]) => `<button data-tema="${k}" class="${t === k ? 'attivo' : ''}">${l}</button>`).join('')}</div>`)}
    ${card('Privacy', `<p>L'app non raccoglie dati personali e non usa cookie. Le squadre preferite e il tema restano solo sul tuo dispositivo. Se attivo, l'app conta in forma anonima le pagine viste (senza cookie e senza dati personali) per sapere quante persone la usano. I nomi dei giocatori sono quelli pubblicati dall'organizzazione nei tabellini ufficiali.</p>
      <p>Se sei un giocatore e non vuoi comparire, scrivi a <a href="mailto:${EMAIL}">${EMAIL}</a>: il tuo nome viene rimosso da tutte le pagine dell'app al primo aggiornamento utile. I tabellini originali restano pubblicati sul sito ufficiale dell'organizzazione, che resta la fonte dei dati.</p>`)}
    ${inArchivio() ? '' : `<p class="centro"><a href="#/intro" data-rivedi class="link-tap">Rivedi l'introduzione</a></p>`}
    <p class="muto centro">Sporting Live v${VERSIONE} · fatta a Mestre</p>`;
}

export function dopo(ctx, root) {
  const rivedi = root.querySelector('[data-rivedi]');
  if (rivedi) rivedi.onclick = () => riattivaIntro();
  root.querySelectorAll('[data-tema]').forEach(b => { b.onclick = async () => { impostaTema(b.dataset.tema); root.innerHTML = await render(ctx); dopo(ctx, root); }; });
}
