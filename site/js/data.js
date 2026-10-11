const cache = new Map();
// base: '' = stagione corrente, 'a/<ed>/' = edizione d'archivio. La chiave di cache include la base.
export async function caricaJSON(rel, base = '') {
  const k = base + rel;
  if (cache.has(k)) return cache.get(k);
  const r = await fetch(`data/${k}`);
  if (!r.ok) throw new Error('DATI_NON_DISPONIBILI');
  const obj = await r.json();
  cache.set(k, obj);
  return obj;
}
export const baseEdizione = (slug) => (slug ? `a/${encodeURIComponent(slug)}/` : '');
export const caricaIndice = (slug) => caricaJSON('indice.json', baseEdizione(slug));
export function svuotaCache() { cache.clear(); }
