// Campionato/girone scelto e stato dell'introduzione. Storage con fallback in memoria.
import { inArchivio } from './archivio.js';

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
// In archivio il girone scelto vive solo in memoria (azzerato a ogni cambio d'edizione), mai nello storage;
// il default è il primo girone dell'edizione.
let sceltaArchivio = null;
export function azzeraSceltaArchivio() { sceltaArchivio = null; }
export function leggiGirone(indice) {
  if (inArchivio()) {
    return sceltaArchivio === TUTTI || (sceltaArchivio && gironi(indice).some(g => g.slug === sceltaArchivio))
      ? sceltaArchivio : (gironi(indice)[0]?.slug ?? TUTTI);
  }
  const v = leggi(K_GIRONE);
  return v && v !== TUTTI && gironi(indice).some(g => g.slug === v) ? v : TUTTI;
}
export const impostaGirone = (slug) => { if (inArchivio()) sceltaArchivio = slug; else scrivi(K_GIRONE, slug); };
export function gironeEffettivo(indice) {
  const g = leggiGirone(indice);
  return g === TUTTI ? (gironi(indice)[0]?.slug ?? null) : g;
}
// Girone da mostrare per una rotta con slug opzionale. Con "tutti" salvato lo slug di rotta non viene memorizzato.
export function risolviGirone(indice, slugRotta) {
  const salvato = leggiGirone(indice);
  if (inArchivio()) {
    return slugRotta && gironi(indice).some(g => g.slug === slugRotta) ? { mostrato: slugRotta, salva: true } : { mostrato: gironeEffettivo(indice), salva: false };
  }
  if (slugRotta && gironi(indice).some(g => g.slug === slugRotta)) return { mostrato: slugRotta, salva: salvato !== TUTTI };
  return { mostrato: gironeEffettivo(indice), salva: false };
}
export function etichettaGirone(indice, slug) {
  const g = gironi(indice).find(x => x.slug === slug);
  return g ? `${g.campionato.nome} · ${g.nome}` : 'Tutti i gironi';
}
export const introDaMostrare = () => !inArchivio() && leggi(K_INTRO) !== 'ok';
export const segnaIntroVista = () => { if (!inArchivio()) scrivi(K_INTRO, 'ok'); };
export const riattivaIntro = () => { if (!inArchivio()) scrivi(K_INTRO, 'no'); };
export function _reset() { for (const k of Object.keys(memoria)) delete memoria[k]; sceltaArchivio = null; }
