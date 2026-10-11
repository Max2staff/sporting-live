import { esc } from '../util.js';
import { TUTTI, leggiGirone, impostaGirone, etichettaGirone } from '../contesto.js';

export function barraContesto(indice, { tutti = false, mostrato } = {}) {
  const scelto = mostrato ?? leggiGirone(indice);
  const slug = scelto === TUTTI && !tutti ? (indice.campionati[0]?.gironi[0]?.slug ?? TUTTI) : scelto;
  return `<button class="chip-contesto" data-contesto aria-haspopup="dialog">${esc(etichettaGirone(indice, slug))}<span class="freccina" aria-hidden="true">▾</span></button>`;
}

export function collegaContesto(root, indice, { tutti = false, mostrato, onCambio }) {
  const btn = root.querySelector('[data-contesto]');
  if (!btn) return;
  btn.onclick = () => apriFoglio(indice, { tutti, mostrato, onCambio, ritorno: btn });
}

function apriFoglio(indice, { tutti, mostrato, onCambio, ritorno }) {
  const scelto = mostrato ?? leggiGirone(indice);
  const velo = document.createElement('div');
  velo.className = 'foglio-velo';
  velo.innerHTML = `<div class="foglio" role="dialog" aria-modal="true" aria-label="Scegli campionato e girone">
    <div class="maniglia"></div>
    ${tutti ? `<div class="chips"><button class="chip ${scelto === TUTTI ? 'attivo' : ''}" aria-pressed="${scelto === TUTTI}" data-girone="${TUTTI}">Tutti i gironi</button></div>` : ''}
    ${indice.campionati.map(c => `<h3>${esc(c.nome)}</h3><div class="chips">${c.gironi.map(g => `<button class="chip ${scelto === g.slug ? 'attivo' : ''}" aria-pressed="${scelto === g.slug}" data-girone="${esc(g.slug)}">${esc(g.nome)}</button>`).join('')}</div>`).join('')}
  </div>`;
  const chiudi = () => { velo.remove(); document.body.classList.remove('foglio-aperto'); document.removeEventListener('keydown', suTasto); window.removeEventListener('hashchange', chiudi); if (ritorno && ritorno.isConnected) ritorno.focus(); };
  const suTasto = (e) => {
    if (e.key === 'Escape') { chiudi(); return; }
    if (e.key !== 'Tab') return;
    const el = [...velo.querySelectorAll('button:not([disabled])')];
    if (!el.length) return;
    const primo = el[0], ultimo = el[el.length - 1], at = document.activeElement;
    if (!velo.contains(at)) { e.preventDefault(); primo.focus(); }
    else if (e.shiftKey && at === primo) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && at === ultimo) { e.preventDefault(); primo.focus(); }
  };
  velo.onclick = (e) => { if (e.target === velo) chiudi(); };
  velo.querySelectorAll('[data-girone]').forEach(b => { b.onclick = () => { impostaGirone(b.dataset.girone); chiudi(); onCambio?.(b.dataset.girone); }; });
  document.addEventListener('keydown', suTasto);
  window.addEventListener('hashchange', chiudi);
  document.body.appendChild(velo);
  document.body.classList.add('foglio-aperto');
  velo.querySelector('.chip.attivo, .chip')?.focus();
}
