// Barre contrapposte "A contro B": ogni riga ha due barre proporzionali al valore più alto.
import { esc } from '../util.js';
import { num } from './base.js';

const fmt = (v, dec) => (dec ? v.toFixed(dec).replace('.', ',') : String(v));

export function barreConfrontoHTML(righe, { nomeA, nomeB }) {
  const R = (righe || []).filter(r => num(r.a) !== null && num(r.b) !== null);
  if (!R.length) return '';
  const riga = (r) => {
    const a = num(r.a), b = num(r.b), max = Math.max(a, b) || 1, min = Math.min(a, b);
    // "Meno è meglio" (posizione, gol subiti): la barra piena va al valore più basso.
    const lung = (v) => Math.round(r.meglio === 'basso' ? (v ? (min / v) * 100 : 100) : (v / max) * 100);
    const vinceA = r.meglio === 'basso' ? a < b : a > b, vinceB = r.meglio === 'basso' ? b < a : b > a;
    return `<div class="cf-riga"><span class="cf-val a${vinceA ? ' meglio' : ''}">${fmt(a, r.decimali)}</span>
      <span class="cf-et">${esc(r.etichetta)}</span><span class="cf-val b${vinceB ? ' meglio' : ''}">${fmt(b, r.decimali)}</span>
      <div class="cf-barre" aria-hidden="true"><i class="cf-a${vinceA ? ' meglio' : ''}" style="width:${lung(a)}%"></i><i class="cf-b${vinceB ? ' meglio' : ''}" style="width:${lung(b)}%"></i></div></div>`;
  };
  return `<div class="confronto"><div class="cf-testa"><b>${esc(nomeA)}</b><b>${esc(nomeB)}</b></div>${R.map(riga).join('')}</div>`;
}

const puntiForma = (f) => (f || []).reduce((s, e) => s + (e === 'V' ? 3 : e === 'N' ? 1 : 0), 0);

export function righeConfrontoPartita(p) {
  const c = p && p.confronto;
  if (!c || !c.casa || !c.ospite || !c.casa.g || !c.ospite.g) return [];   // prima della prima partita la classifica non dice nulla
  const r = [
    { etichetta: 'Posizione', a: c.casa.pos, b: c.ospite.pos, meglio: 'basso' },
    { etichetta: 'Punti', a: c.casa.pt, b: c.ospite.pt, meglio: 'alto' },
    { etichetta: 'Gol fatti', a: c.casa.gf, b: c.ospite.gf, meglio: 'alto' },
    { etichetta: 'Gol subiti', a: c.casa.gs, b: c.ospite.gs, meglio: 'basso' },
    { etichetta: 'Punti nelle ultime 5', a: puntiForma(c.casa.forma), b: puntiForma(c.ospite.forma), meglio: 'alto' },
  ];
  const b = p.precedenti && p.precedenti.bilancio;
  if (b && (b.casa || b.ospite || b.pari)) r.push({ etichetta: 'Vittorie nei precedenti', a: b.casa, b: b.ospite, meglio: 'alto' });
  return r;
}
