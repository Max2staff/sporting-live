// Grafico SVG (puro, senza librerie) dell'andamento in classifica: posizione per giornata, 1 in alto.
import { etichettaX } from './grafici/base.js';

const W = 320, H = 160, SX = 24, DX = 12, SU = 14, GIU = 26;

export function graficoAndamentoSVG(serie, nSquadre) {
  const s = (serie || []).filter(r => r && Number.isFinite(Number(r.pos)) && Number.isFinite(Number(r.giornata)));
  if (s.length < 2) return '';
  const n = Math.max(2, Number(nSquadre) || 0, ...s.map(r => Number(r.pos)));
  const x = (i) => SX + (s.length === 1 ? 0 : i * (W - SX - DX) / (s.length - 1));
  const y = (pos) => SU + (Number(pos) - 1) * (H - SU - GIU) / (n - 1);
  const pti = s.map((r, i) => [x(i), y(r.pos), r]);
  const passo = n > 8 ? Math.ceil(n / 5) : 1;
  const righe = [];
  for (let p = 1; p <= n; p++) if ((p - 1) % passo === 0) righe.push(p);
  const griglia = righe.map(p => `<line class="gr-griglia" x1="${SX}" x2="${W - DX}" y1="${y(p).toFixed(1)}" y2="${y(p).toFixed(1)}"/><text class="gr-et" x="${SX - 6}" y="${(y(p) + 3.5).toFixed(1)}" text-anchor="end">${p}º</text>`).join('');
  const passoG = Math.max(1, Math.ceil(s.length / 8));
  const giornate = pti.map(([px, , r], i) => etichettaX(i, s.length, passoG) ? `<text class="gr-et" x="${px.toFixed(1)}" y="${H - 8}" text-anchor="middle">${Number(r.giornata)}</text>` : '').join('');
  const linea = pti.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  const punti = pti.map(([px, py, r]) => `<circle class="gr-punto" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4"><title>Giornata ${Number(r.giornata)}: ${Number(r.pos)}º posto</title></circle>`).join('');
  const titolo = `Andamento in classifica: dalla ${Number(s[0].pos)}ª alla ${Number(s[s.length - 1].pos)}ª posizione`;
  return `<svg class="grafico" viewBox="0 0 ${W} ${H}" width="100%" height="160" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${titolo}"><title>${titolo}</title>${griglia}${giornate}<polyline class="gr-linea" points="${linea}" fill="none"/>${punti}</svg>`;
}
