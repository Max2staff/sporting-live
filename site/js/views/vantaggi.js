import { esc } from '../util.js';
import { card, heroHTML } from './comuni.js';

const logoSicuro = (l) => {
  const nome = String(l || '').replace(/^img\/sponsor\//, '');
  return /^[\w.-]+\.(png|jpe?g|webp|svg)$/i.test(nome) && !nome.includes('..') ? `img/sponsor/${nome}` : '';
};
const dataIT = (iso) => String(iso).split('-').reverse().join('/');
const urlSicuro = (u) => (/^https?:\/\//i.test(String(u || '')) ? String(u) : '');

function offerta(o) {
  const logo = logoSicuro(o.logo);
  const tel = String(o.telefono || '').replace(/[^\d+]/g, '');
  const link = urlSicuro(o.link);
  const azioni = [
    tel ? `<a class="btn-vant" href="tel:${esc(tel)}">Chiama</a>` : '',
    link ? `<a class="btn-vant" href="${esc(link)}" target="_blank" rel="noopener">Sito</a>` : '',
    o.indirizzo ? `<a class="btn-vant" href="https://maps.google.com/?q=${encodeURIComponent(o.indirizzo)}" target="_blank" rel="noopener">Mappa</a>` : '',
  ].join('');
  return `<section class="card vantaggio">
    <div class="vant-testa">${logo ? `<img class="vant-logo" src="${esc(logo)}" alt="" loading="lazy">` : ''}<div><h2>${esc(o.titolo)}</h2><p class="muto">${esc(o.sponsor)}</p></div></div>
    ${o.descrizione ? `<p>${esc(o.descrizione)}</p>` : ''}
    ${o.come ? `<p><b>Come ottenerlo</b><br>${esc(o.come)}</p>` : ''}
    ${o.validoFino ? `<p class="muto">Valido fino al ${esc(dataIT(o.validoFino))}</p>` : ''}
    ${azioni ? `<div class="vant-azioni">${azioni}</div>` : ''}
  </section>`;
}

export async function render({ vantaggi }) {
  const offerte = (vantaggi && vantaggi.offerte) || [];
  const hero = heroHTML({ foto: 'campo', contenuto: '<h1>Vantaggi</h1><p class="sotto">Sconti e iniziative dei partner per chi gioca nei campionati.</p>' });
  if (!offerte.length) return `${hero}${card('', '<p class="muto">Presto qui sconti e iniziative dei partner per chi gioca nei campionati.</p>')}`;
  return hero + offerte.map(offerta).join('');
}
