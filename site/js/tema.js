const CHIAVE = 'sl.tema';
export function leggiTema() { try { return localStorage.getItem(CHIAVE) || 'auto'; } catch { return 'auto'; } }
export function impostaTema(t) {
  try { localStorage.setItem(CHIAVE, t); } catch { /* storage non disponibile */ }
  applicaTema(t);
}
export function applicaTema(t = leggiTema()) {
  const root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', t === 'scuro' ? 'dark' : 'light');
}
