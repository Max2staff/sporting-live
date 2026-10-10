const cache = new Map();
export async function caricaJSON(rel) {
  if (cache.has(rel)) return cache.get(rel);
  const r = await fetch(`data/${rel}`);
  if (!r.ok) throw new Error('DATI_NON_DISPONIBILI');
  const obj = await r.json();
  cache.set(rel, obj);
  return obj;
}
export const caricaIndice = () => caricaJSON('indice.json');
export function svuotaCache() { cache.clear(); }
