// Utilità comuni ai grafici SVG.
export const num = (v) => { if (v === null || v === undefined || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
export const f1 = (n) => String(Math.round(n * 10) / 10);
export function scala(d0, d1, r0, r1) {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v) => r0 + (v - d0) * k;
}
// Tacche intere da 0 ad almeno max, con circa n intervalli.
export function tacche(max, n = 4) {
  if (!(max > 0)) return [0];
  const passo = Math.max(1, Math.ceil(max / n));
  const out = [];
  for (let v = 0; v < max + passo; v += passo) { out.push(v); if (v >= max) break; }
  return out;
}
