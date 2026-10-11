import { esc } from '../util.js';
import { stemmaHTML } from '../stemma.js';
import { cerca } from '../cerca.js';
import { nomeSquadra, squadraDa, heroHTML } from './comuni.js';

const nomeGirone = (indice, slug) => {
  for (const c of indice.campionati) for (const g of c.gironi) if (g.slug === slug) return `${c.nome} · ${g.nome}`;
  return slug;
};

function risultatiHTML(indice, dati, q) {
  if (q.trim().length < 2) return '<p class="vuoto">Scrivi almeno 2 lettere</p>';
  const ris = cerca(dati, q);
  if (!ris.length) return `<p class="vuoto">Nessun risultato per “${esc(q)}”</p>`;
  return `<section class="card piena">${ris.map(r => {
    const g = esc(nomeGirone(indice, r.girone));
    if (r.tipo === 'squadra') {
      return `<a class="riga-cerca" href="#/squadra/${Number(r.id)}">${stemmaHTML(squadraDa(indice, r.id), 32)}<span class="chi"><b>${esc(r.nome)}</b><small>Squadra · ${g}</small></span></a>`;
    }
    return `<a class="riga-cerca" href="#/giocatore/${encodeURIComponent(r.slug)}">${stemmaHTML(squadraDa(indice, r.squadraId), 32)}<span class="chi"><b>${esc(r.nome)}</b><small>${esc(nomeSquadra(indice, r.squadraId))} · ${g}</small></span></a>`;
  }).join('')}</section>`;
}

export async function render({ rotta }) {
  const q = rotta.params[0] || '';
  return `${heroHTML({ foto: 'campo', classe: 'hero-cerca', contenuto: `
    <input type="search" class="campo-cerca" aria-label="Cerca squadra o giocatore" placeholder="Cerca squadra o giocatore" value="${esc(q)}" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">` })}
    <div id="risultati-cerca" aria-live="polite"></div>`;
}

export async function dopo({ indice, rotta, carica }, root) {
  const campo = root.querySelector('.campo-cerca');
  const box = root.querySelector('#risultati-cerca');
  let dati;
  try { dati = await carica('cerca.json'); } catch { box.innerHTML = '<p class="vuoto">Ricerca non disponibile.</p>'; return; }
  const mostra = () => { box.innerHTML = risultatiHTML(indice, dati, campo.value); };
  mostra();
  let t;
  campo.addEventListener('input', () => {
    mostra();
    clearTimeout(t);
    t = setTimeout(() => {
      const v = campo.value.trim();
      history.replaceState(null, '', v ? `#/cerca/${encodeURIComponent(v)}` : '#/cerca');
    }, 150);
  });
  if (!rotta.params[0]) campo.focus();
}
