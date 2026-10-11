// Barre per giornata: gol fatti/subiti della squadra; gol (e voti) del giocatore.
import { esc } from '../util.js';
import { num, f1, scala, tacche } from './base.js';

const W = 340;

export function graficoGolSVG(partite) {
  const P = (partite || []).filter(p => p && p.esito && num(p.gf) !== null && num(p.gs) !== null);
  if (P.length < 2) return '';
  const H = 190, SX = 10, DX = 10, SU = 16, GIU = 34;
  const max = Math.max(1, ...P.flatMap(p => [num(p.gf), num(p.gs)]));
  const mezzo = SU + (H - SU - GIU) / 2, alt = (H - SU - GIU) / 2;
  const slot = (W - SX - DX) / P.length, lb = Math.min(22, slot * 0.6);
  const h = (v) => (v / max) * alt;
  const barre = P.map((p, i) => {
    const cx = SX + slot * (i + 0.5), x0 = f1(cx - lb / 2), gf = num(p.gf), gs = num(p.gs);
    return `<g><title>Giornata ${esc(String(p.giornata))}: ${gf}-${gs}</title>
      <rect class="gr-barra su gr-${esc(String(p.esito).toLowerCase())}" x="${x0}" y="${f1(mezzo - h(gf))}" width="${f1(lb)}" height="${f1(h(gf))}" rx="2"/>
      <rect class="gr-barra giu" x="${x0}" y="${f1(mezzo)}" width="${f1(lb)}" height="${f1(h(gs))}" rx="2"/>
      ${gf ? `<text class="gr-et" x="${f1(cx)}" y="${f1(mezzo - h(gf) - 4)}" text-anchor="middle">${gf}</text>` : ''}
      ${gs ? `<text class="gr-et" x="${f1(cx)}" y="${f1(mezzo + h(gs) + 12)}" text-anchor="middle">${gs}</text>` : ''}
      <text class="gr-et" x="${f1(cx)}" y="${H - 6}" text-anchor="middle">${esc(String(p.giornata))}ª</text></g>`;
  }).join('');
  const tf = P.reduce((s, p) => s + num(p.gf), 0), ts = P.reduce((s, p) => s + num(p.gs), 0);
  const titolo = `Gol per giornata: ${tf} fatti e ${ts} subiti in ${P.length} partite`;
  return `<svg class="grafico grafico-barre anima" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${titolo}"><title>${titolo}</title><line class="gr-griglia" x1="${SX}" x2="${W - DX}" y1="${f1(mezzo)}" y2="${f1(mezzo)}"/>${barre}</svg>`;
}

export function graficoGiocatoreSVG(perPartita) {
  const P = (perPartita || []).filter(p => p && num(p.giornata) !== null);
  if (P.length < 2) return '';
  const H = 170, SX = 24, DX = 28, SU = 14, GIU = 24;
  const tk = tacche(Math.max(2, ...P.map(p => num(p.gol) || 0)), 2);
  const yG = scala(0, tk[tk.length - 1], H - GIU, SU), yV = scala(4, 10, H - GIU, SU);
  const slot = (W - SX - DX) / P.length, lb = Math.min(20, slot * 0.55);
  const cx = (i) => SX + slot * (i + 0.5);
  const griglia = tk.map(v => `<line class="gr-griglia" x1="${SX}" x2="${W - DX}" y1="${f1(yG(v))}" y2="${f1(yG(v))}"/><text class="gr-et" x="${SX - 6}" y="${f1(yG(v) + 4)}" text-anchor="end">${v}</text>`).join('');
  const barre = P.map((p, i) => {
    const g = num(p.gol) || 0;
    return `<rect class="gr-barra su gr-gol" x="${f1(cx(i) - lb / 2)}" y="${f1(yG(g))}" width="${f1(lb)}" height="${f1(yG(0) - yG(g))}" rx="2"><title>Giornata ${esc(String(p.giornata))}: ${g} gol</title></rect>
      <text class="gr-et" x="${f1(cx(i))}" y="${H - 6}" text-anchor="middle">${esc(String(p.giornata))}ª</text>`;
  }).join('');
  const voti = P.map((p, i) => [i, num(p.voto)]).filter(([, v]) => v !== null);
  const linea = voti.length >= 2
    ? `<g class="gr-voti"><path class="gr-linea" pathLength="1" fill="none" d="${voti.map(([i, v], k) => `${k ? 'L' : 'M'}${f1(cx(i))} ${f1(yV(Math.min(10, Math.max(4, v))))}`).join('')}"/>${voti.map(([i, v]) => `<circle class="gr-punto" cx="${f1(cx(i))}" cy="${f1(yV(Math.min(10, Math.max(4, v))))}" r="3.5"><title>Voto ${v}</title></circle>`).join('')}<text class="gr-et" x="${W - DX + 4}" y="${f1(yV(10) + 4)}">10</text><text class="gr-et" x="${W - DX + 4}" y="${f1(yV(4) + 4)}">4</text></g>`
    : '';
  const tot = P.reduce((s, p) => s + (num(p.gol) || 0), 0);
  const titolo = `Gol partita per partita: ${tot} in ${P.length} partite${linea ? ', con i voti' : ''}`;
  return `<svg class="grafico grafico-barre anima" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${titolo}"><title>${titolo}</title>${griglia}${barre}${linea}</svg>`;
}
