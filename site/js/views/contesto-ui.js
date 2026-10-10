import { esc } from '../util.js';
import { TUTTI, leggiGirone, impostaGirone, etichettaGirone } from '../contesto.js';

export function barraContesto(indice, { tutti = false } = {}) {
  const scelto = leggiGirone(indice);
  const slug = scelto === TUTTI && !tutti ? (indice.campionati[0]?.gironi[0]?.slug ?? TUTTI) : scelto;
  return `<button class="chip-contesto" data-contesto aria-haspopup="dialog">${esc(etichettaGirone(indice, slug))}<span class="freccina" aria-hidden="true">▾</span></button>`;
}

export function collegaContesto(root, indice, { tutti = false, onCambio }) {
  const btn = root.querySelector('[data-contesto]');
  if (!btn) return;
  btn.onclick = () => apriFoglio(indice, { tutti, onCambio, ritorno: btn });
}

function apriFoglio(indice, { tutti, onCambio, ritorno }) {
  const scelto = leggiGirone(indice);
  const velo = document.createElement('div');
  velo.className = 'foglio-velo';
  velo.innerHTML = `<div class="foglio" role="dialog" aria-modal="true" aria-label="Scegli campionato e girone">
    <div class="maniglia"></div>
    ${tutti ? `<div class="chips"><button class="chip ${scelto === TUTTI ? 'attivo' : ''}" data-girone="${TUTTI}">Tutti i gironi</button></div>` : ''}
    ${indice.campionati.map(c => `<h3>${esc(c.nome)}</h3><div class="chips">${c.gironi.map(g => `<button class="chip ${scelto === g.slug ? 'attivo' : ''}" data-girone="${esc(g.slug)}">${esc(g.nome)}</button>`).join('')}</div>`).join('')}
  </div>`;
  const chiudi = () => { velo.remove(); document.removeEventListener('keydown', suTasto); ritorno?.focus(); };
  const suTasto = (e) => { if (e.key === 'Escape') chiudi(); };
  velo.onclick = (e) => { if (e.target === velo) chiudi(); };
  velo.querySelectorAll('[data-girone]').forEach(b => { b.onclick = () => { impostaGirone(b.dataset.girone); chiudi(); onCambio?.(b.dataset.girone); }; });
  document.addEventListener('keydown', suTasto);
  document.body.appendChild(velo);
  velo.querySelector('.chip.attivo, .chip')?.focus();
}
