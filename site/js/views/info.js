import { esc, formattaOra, formattaData } from '../util.js';
import { leggiTema, impostaTema } from '../tema.js';
import { card, heroHTML } from './comuni.js';
import { riattivaIntro } from '../contesto.js';

export const VERSIONE = '1.0.0';
const EMAIL = 'massimiliano.griletti@gmail.com';   // da confermare con l'utente prima della pubblicazione

export async function render({ indice }) {
  const t = leggiTema();
  return `${heroHTML({ foto: 'premiazione', classe: 'hero-info', contenuto: `<h1>Sporting <b style="color:var(--arancio)">Live</b></h1><p class="sotto">I campionati dello Sporting Club Mestre, dal telefono.</p>
      <div class="loghi"><img src="img/loghi/sporting-club-mestre.png" alt="Sporting Club Mestre"><img src="img/loghi/endas.png" alt="Endas"></div>` })}
    ${card('Cos\'è', `<p>Risultati, classifiche e statistiche dei campionati organizzati dallo <b>Sporting Club Mestre</b> (Endas Venezia), pensati per il telefono. Aggiungi l'app alla schermata Home per averla sempre a portata di mano.</p>`)}
    ${card('Fonte dei dati', `<p>I dati sono letti dal sito ufficiale <a href="https://www.campionatisportingclub.it/" rel="noopener">campionatisportingclub.it</a> con il consenso dell'organizzazione. Ultimo aggiornamento: ${esc(formattaData(indice.generato.slice(0, 10)))} alle ${esc(formattaOra(indice.generato))}. Fa fede il sito ufficiale.</p>`)}
    ${card('Aspetto', `<div class="segmenti">${[['scuro', 'Scuro'], ['chiaro', 'Chiaro'], ['auto', 'Automatico']].map(([k, l]) => `<button data-tema="${k}" class="${t === k ? 'attivo' : ''}">${l}</button>`).join('')}</div>`)}
    ${card('Privacy', `<p>L'app non raccoglie dati personali e non usa cookie. Le squadre preferite e il tema restano solo sul tuo dispositivo. I nomi dei giocatori sono quelli pubblicati dall'organizzazione nei tabellini ufficiali.</p>
      <p>Se sei un giocatore e non vuoi comparire, scrivi a <a href="mailto:${EMAIL}">${EMAIL}</a>: il tuo nome viene rimosso da tutte le pagine dell'app al primo aggiornamento utile. I tabellini originali restano pubblicati sul sito ufficiale dell'organizzazione, che resta la fonte dei dati.</p>`)}
    <p class="centro"><a href="#/intro" data-rivedi>Rivedi l'introduzione</a></p>
    <p class="muto centro">Sporting Live v${VERSIONE} · fatta a Mestre</p>`;
}

export function dopo(ctx, root) {
  root.querySelector('[data-rivedi]').onclick = () => riattivaIntro();
  root.querySelectorAll('[data-tema]').forEach(b => { b.onclick = async () => { impostaTema(b.dataset.tema); root.innerHTML = await render(ctx); dopo(ctx, root); }; });
}
