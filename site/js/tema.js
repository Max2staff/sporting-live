const CHIAVE = 'sl.tema';
let memoria = null;
export function leggiTema() {
  try { const v = globalThis.localStorage?.getItem(CHIAVE); if (v) return v; } catch { /* storage bloccato */ }
  return memoria || 'scuro';
}
export function impostaTema(t) {
  memoria = t;
  try { globalThis.localStorage?.setItem(CHIAVE, t); } catch { /* solo in memoria */ }
  applicaTema(t);
}
export function applicaTema(t = leggiTema()) {
  const root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t === 'chiaro' ? 'light' : 'dark');
}
