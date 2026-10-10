// Stemmi delle squadre: logo vero se presente, altrimenti scudo SVG generato in modo stabile dall'id.
import { esc } from './util.js';

const PAROLE_IGNORATE = new Set(['REAL', 'ASD', 'FC', 'AC', 'SS', 'US', 'AS', 'CALCIO', 'C5', 'C8']);

export function iniziali(nome) {
  const parole = String(nome ?? '').toUpperCase().split(/\s+/).filter(Boolean)
    .filter(p => !p.includes('.'))                        // sigle puntate: F.C., R.S.M., A.S.D.
    .map(p => p.replace(/[^A-Z0-9À-Ý&]/g, ''))
    .filter(p => p && !PAROLE_IGNORATE.has(p));
  const pulite = parole.map(p => p.replace(/&/g, '')).filter(Boolean);
  if (!pulite.length) return '?';
  if (pulite.length === 1) return pulite[0].slice(0, 2);
  return pulite[0][0] + pulite[1][0];
}

function hash(id) {
  let h = 2166136261;
  for (const ch of String(id)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function coloriStemma(id) {
  const h = hash(id);
  const tinta = h % 360;
  const tinta2 = (tinta + 140 + ((h >>> 9) % 80)) % 360;
  const chiaro = (t) => t >= 40 && t <= 200;               // gialli/verdi/ciani: serve più scuro per il bianco
  return {
    primario: `hsl(${tinta} 68% ${chiaro(tinta) ? 30 : 40}%)`,
    secondario: `hsl(${tinta2} 78% ${chiaro(tinta2) ? 44 : 52}%)`,
    motivo: (h >>> 17) % 3,
  };
}

const SCUDO = 'M20 1.5 37.5 6.5V22c0 12-7.5 20-17.5 24.5C10 42 2.5 34 2.5 22V6.5Z';
const MOTIVI = [
  'M2 31 38 11v12L2 43Z',          // fascia diagonale
  'M20 0h20v48H20Z',               // metà verticale
  'M2 17 20 29 38 17v11L20 40 2 28Z', // chevron
];
let contatore = 0;

export function stemmaHTML(squadra, dim = 40) {
  if (!squadra) return '';
  const id = Number(squadra.id);
  if (squadra.stemma) return `<img class="stemma" src="img/stemmi/${id}.png" width="${dim}" height="${dim}" alt="" aria-hidden="true" loading="lazy">`;
  const { primario, secondario, motivo } = coloriStemma(id);
  const sigla = esc(iniziali(squadra.nome));
  const clip = `sc${id}-${++contatore}`;
  const larg = Math.round(dim * 40 / 48);
  return `<svg class="stemma" viewBox="0 0 40 48" width="${larg}" height="${dim}" aria-hidden="true">`
    + `<clipPath id="${clip}"><path d="${SCUDO}"/></clipPath>`
    + `<g clip-path="url(#${clip})"><rect width="40" height="48" fill="${primario}"/><path d="${MOTIVI[motivo]}" fill="${secondario}"/></g>`
    + `<path d="${SCUDO}" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="1.6"/>`
    + `<text x="20" y="25" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,-apple-system,sans-serif" font-weight="800" font-size="${sigla.length > 1 ? 15 : 19}" fill="#fff" stroke="rgba(0,0,0,.45)" stroke-width="2.4" paint-order="stroke">${sigla}</text>`
    + '</svg>';
}
