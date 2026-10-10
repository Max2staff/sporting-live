// Campionato/girone scelto e stato dell'introduzione. Storage con fallback in memoria.
const K_GIRONE = 'sl.girone';
const K_INTRO = 'sl.intro';
const memoria = {};

function leggi(k) {
  try { const v = globalThis.localStorage?.getItem(k); if (v != null) return v; } catch { /* storage bloccato */ }
  return memoria[k] ?? null;
}
function scrivi(k, v) {
  memoria[k] = v;
  try { globalThis.localStorage?.setItem(k, v); } catch { /* solo in memoria */ }
}

export const TUTTI = 'tutti';
export const gironi = (indice) => (indice.campionati || []).flatMap(c => (c.gironi || []).map(g => ({ ...g, campionato: { id: c.id, nome: c.nome } })));
export function leggiGirone(indice) {
  const v = leggi(K_GIRONE);
  return v && v !== TUTTI && gironi(indice).some(g => g.slug === v) ? v : TUTTI;
}
export const impostaGirone = (slug) => scrivi(K_GIRONE, slug);
export function gironeEffettivo(indice) {
  const g = leggiGirone(indice);
  return g === TUTTI ? (gironi(indice)[0]?.slug ?? null) : g;
}
export function etichettaGirone(indice, slug) {
  const g = gironi(indice).find(x => x.slug === slug);
  return g ? `${g.campionato.nome} · ${g.nome}` : 'Tutti i gironi';
}
export const introDaMostrare = () => leggi(K_INTRO) !== 'ok';
export const segnaIntroVista = () => scrivi(K_INTRO, 'ok');
export const riattivaIntro = () => scrivi(K_INTRO, 'no');
export function _reset() { for (const k of Object.keys(memoria)) delete memoria[k]; }
