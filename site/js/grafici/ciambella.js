// Ciambella vittorie/pari/sconfitte con il totale al centro.
import { num, f1 } from './base.js';

export function ciambellaHTML(stat) {
  const v = num(stat && stat.v) || 0, n = num(stat && stat.n) || 0, p = num(stat && stat.p) || 0;
  const tot = v + n + p;
  if (!tot) return '';
  let inizio = 0;
  const fetta = (val, cls) => {
    if (!val) return '';
    const len = (val / tot) * 100;
    const s = `<circle class="gr-fetta ${cls}" cx="50" cy="50" r="40" pathLength="100" stroke-dasharray="${f1(len)} ${f1(100 - len)}" stroke-dashoffset="${f1(-inizio)}"/>`;
    inizio += len;
    return s;
  };
  const titolo = `${v} vinte, ${n} pari, ${p} perse su ${tot} partite`;
  return `<div class="ciambella"><svg class="anima" viewBox="0 0 100 100" width="120" height="120" role="img" aria-label="${titolo}"><title>${titolo}</title>
      <g transform="rotate(-90 50 50)">${fetta(v, 'gr-v')}${fetta(n, 'gr-n')}${fetta(p, 'gr-p')}</g>
      <text class="cb-num" x="50" y="52" text-anchor="middle">${tot}</text><text class="cb-et" x="50" y="66" text-anchor="middle">partite</text></svg>
    <ul class="cb-leg"><li><i class="gr-v"></i>${v} vinte</li><li><i class="gr-n"></i>${n} pari</li><li><i class="gr-p"></i>${p} perse</li></ul></div>`;
}
