// Grafico a più linee: corsa al titolo (punti) e corsa marcatori (gol cumulati, a gradini).
import { esc } from '../util.js';
import { num, f1, scala, tacche } from './base.js';

const W = 340, H = 210, SX = 28, DX = 10, SU = 10, GIU = 24;

export function graficoCorsaSVG(xs, serie, { gradini = false, titolo = '' } = {}) {
  const X = (xs || []).map(num);
  const S = (serie || []).filter(s => s && Array.isArray(s.valori) && s.valori.some(v => num(v) !== null));
  if (X.length < 2 || X.some(v => v === null) || !S.length) return '';
  const max = Math.max(1, ...S.flatMap(s => s.valori.map(num).filter(v => v !== null)));
  const tk = tacche(max);
  const x = scala(0, X.length - 1, SX, W - DX), y = scala(0, tk[tk.length - 1], H - GIU, SU);
  const griglia = tk.map(v => `<line class="gr-griglia" x1="${SX}" x2="${W - DX}" y1="${f1(y(v))}" y2="${f1(y(v))}"/><text class="gr-et" x="${SX - 6}" y="${f1(y(v) + 4)}" text-anchor="end">${v}</text>`).join('');
  const passoX = Math.max(1, Math.ceil(X.length / 8));
  const asse = X.map((gg, i) => (i % passoX === 0 || i === X.length - 1 ? `<text class="gr-et" x="${f1(x(i))}" y="${H - 6}" text-anchor="middle">${gg}</text>` : '')).join('');
  const linee = S.map(s => {
    const pti = s.valori.map((v, i) => [i, num(v)]).filter(([, v]) => v !== null);
    const d = pti.map(([i, v], k) => (k === 0 ? `M${f1(x(i))} ${f1(y(v))}` : gradini ? `H${f1(x(i))}V${f1(y(v))}` : `L${f1(x(i))} ${f1(y(v))}`)).join('');
    const [ui, uv] = pti[pti.length - 1];
    return `<g class="gr-serie ${esc(s.classe || '')}" data-serie="${esc(String(s.id))}"><title>${esc(s.nome)}: ${uv}</title><path class="gr-linea" d="${d}" pathLength="1" fill="none"/><circle class="gr-punto" cx="${f1(x(ui))}" cy="${f1(y(uv))}" r="3.5"/></g>`;
  }).join('');
  return `<svg class="grafico grafico-corsa anima" viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(titolo)}"><title>${esc(titolo)}</title>${griglia}${asse}${linee}</svg>`;
}

// Legenda nell'ordine della classifica (al contrario dell'ordine di disegno).
export const legendaHTML = (serie) => `<div class="legenda">${[...(serie || [])].reverse().map(s =>
  `<button type="button" class="leg ${esc(s.classe || '')}" data-serie="${esc(String(s.id))}" aria-pressed="false"><i aria-hidden="true"></i>${esc(s.nome)}</button>`).join('')}</div>`;

// Toccando un nome la sua linea si accende e le altre si spengono; un secondo tocco torna normale.
export function collegaLegenda(root) {
  root.querySelectorAll('.corsa').forEach(box => {
    const svg = box.querySelector('svg');
    if (!svg) return;
    box.querySelectorAll('.legenda button[data-serie]').forEach(b => {
      b.onclick = () => {
        const on = b.getAttribute('aria-pressed') !== 'true';
        box.querySelectorAll('.legenda button').forEach(x => x.setAttribute('aria-pressed', 'false'));
        svg.querySelectorAll('.gr-serie.acceso').forEach(gg => gg.classList.remove('acceso'));
        svg.classList.toggle('con-focus', on);
        if (!on) return;
        b.setAttribute('aria-pressed', 'true');
        const gg = [...svg.querySelectorAll('.gr-serie')].find(e => e.dataset.serie === b.dataset.serie);
        if (gg) { gg.classList.add('acceso'); gg.parentNode.appendChild(gg); }
      };
    });
  });
}

// Punti per giornata di ogni squadra. Classi: c-p1..c-p3 (podio attuale), c-pref (preferite), c-altro.
// Ordine di disegno: prima le grigie, poi le preferite, poi il podio (1º per ultimo, quindi sopra).
export function serieTitolo(g, preferiti = []) {
  const and = (g && g.andamento) || {};
  const righe = ((g && g.classifica && g.classifica.totale) || []).filter(r => Array.isArray(and[r.squadraId]) && and[r.squadraId].length);
  const xs = [...new Set(righe.flatMap(r => and[r.squadraId].map(e => e.giornata)))].sort((a, b) => a - b);
  const pref = new Set((preferiti || []).map(Number));
  const serie = righe.map(r => {
    const per = new Map(and[r.squadraId].map(e => [e.giornata, e.pt]));
    const classe = r.pos <= 3 ? `c-p${r.pos}` : pref.has(Number(r.squadraId)) ? 'c-pref' : 'c-altro';
    return { id: r.squadraId, nome: r.nome, classe, pos: r.pos, valori: xs.map(x => (per.has(x) ? per.get(x) : null)) };
  });
  const peso = (s) => (s.classe === 'c-altro' ? 0 : s.classe === 'c-pref' ? 1 : 2);
  serie.sort((a, b) => peso(a) - peso(b) || b.pos - a.pos);
  return { xs, serie: serie.map(({ pos, ...s }) => s) };
}

export function serieMarcatori(g) {
  const c = g && g.corsaMarcatori;
  if (!c || !Array.isArray(c.marcatori)) return { xs: [], serie: [] };
  const serie = c.marcatori.map((m, i) => ({ id: m.slug, nome: m.nome, classe: `c-m${i + 1}`, valori: m.gol }));
  return { xs: c.giornate || [], serie: serie.reverse() };
}
