import { esc } from '../util.js';
import { stemmaHTML } from '../stemma.js';
import { gironi, leggiGirone, impostaGirone, gironeEffettivo, segnaIntroVista } from '../contesto.js';
import { èPreferita, togglePreferito } from '../preferiti.js';

const punti = (n) => `<div class="punti-avanzamento" aria-label="Passo ${n} di 3">${[1, 2, 3].map(i => `<i class="${i === n ? 'attivo' : ''}"></i>`).join('')}</div>`;
const schermo = (foto, n, corpo) => `<section class="intro-schermo"><img class="sfondo-foto" src="img/foto/${foto}.jpg" alt="" aria-hidden="true" decoding="async">
  <div class="alto">${punti(n)}<a href="#/partite" class="salta" data-fine>Salta</a></div>
  <div class="intro-corpo">${corpo}</div></section>`;

function passo1() {
  return schermo('premiazione', 1, `
    <img src="icons/icon.svg" alt="" width="64" height="64">
    <h1>Sporting <b>Live</b></h1>
    <p>Tutti i campionati dello Sporting Club Mestre in tasca: risultati, classifiche, marcatori e statistiche, aggiornati ogni sera.</p>
    <a class="bottone" href="#/intro/2">Inizia</a>`);
}

function passo2(indice) {
  const corrente = leggiGirone(indice);
  return schermo('campo', 2, `
    <h1>Il tuo <b>campionato</b></h1>
    <p>Scegli categoria e girone: lo ritrovi sempre in alto per cambiarlo.</p>
    ${indice.campionati.map(c => `<div class="camp-card"><h2>${esc(c.nome)}</h2><div class="chips">${c.gironi.map(g => `<button class="chip${g.slug === corrente ? ' attivo' : ''}" aria-pressed="${g.slug === corrente}" data-girone="${esc(g.slug)}">${esc(g.nome)}</button>`).join('')}</div></div>`).join('')}`);
}

function passo3(indice) {
  const slug = gironeEffettivo(indice);
  const g = gironi(indice).find(x => x.slug === slug);
  const squadre = indice.squadre.filter(s => s.girone === slug && s.nome.trim().toUpperCase() !== 'RIPOSO').sort((a, b) => a.nome.localeCompare(b.nome));
  return schermo('campo', 3, `
    <h1>La tua <b>squadra</b></h1>
    <p>${g ? esc(`${g.campionato.nome} · ${g.nome}`) : ''}. Tocca la tua squadra (anche più di una): la vedrai per prima.</p>
    <div class="griglia-squadre">${squadre.map(s => `<button class="squadra-scelta" data-squadra="${Number(s.id)}" aria-pressed="${èPreferita(s.id)}">${stemmaHTML(s, 48)}<span>${esc(s.nome)}</span></button>`).join('')}</div>
    <button class="bottone" data-fine>Fatto</button>`);
}

export async function render({ indice, rotta }) {
  const n = Number(rotta.params[0]) || 1;
  return n === 2 ? passo2(indice) : n === 3 ? passo3(indice) : passo1();
}

export function dopo(ctx, root) {
  root.querySelectorAll('[data-fine]').forEach(el => { el.onclick = (e) => { e.preventDefault(); segnaIntroVista(); ctx.naviga('#/partite'); }; });
  root.querySelectorAll('[data-girone]').forEach(b => { b.onclick = () => { impostaGirone(b.dataset.girone); ctx.naviga('#/intro/3'); }; });
  root.querySelectorAll('.squadra-scelta').forEach(b => {
    b.onclick = () => { togglePreferito(b.dataset.squadra); b.setAttribute('aria-pressed', String(èPreferita(b.dataset.squadra))); };
  });
}
