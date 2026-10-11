// Campionato/girone scelto e stato dell'introduzione. Storage con fallback in memoria.
import { inArchivio } from './archivio.js';

const K_GIRONE = 'sl.girone';
const K_INTRO = 'sl.intro';
const K_CATEGORIA = 'sl.categoria';
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
let categoriaArchivio = TUTTI;
export function azzeraSceltaArchivio() { sceltaArchivio = null; categoriaArchivio = TUTTI; }
export function leggiGirone(indice) {
  if (inArchivio()) {
    return sceltaArchivio === TUTTI || (sceltaArchivio && gironi(indice).some(g => g.slug === sceltaArchivio))
      ? sceltaArchivio : (gironi(indice)[0]?.slug ?? TUTTI);
  }
  const v = leggi(K_GIRONE);
  return v && v !== TUTTI && gironi(indice).some(g => g.slug === v) ? v : TUTTI;
}
// Categoria = id del campionato (es. 'c5') oppure 'tutti'. Con un girone scelto la categoria è quella del girone;
// con "tutti i gironi" vale il valore salvato. Come il girone, in archivio vive solo in memoria.
export const categorie = (indice) => (indice.campionati || []).map(c => ({ id: c.id, nome: c.nome }));
const categoriaDelGirone = (indice, slug) => gironi(indice).find(g => g.slug === slug)?.campionato.id ?? TUTTI;
export function leggiCategoria(indice) {
  const g = leggiGirone(indice);
  if (g !== TUTTI) return categoriaDelGirone(indice, g);
  const v = inArchivio() ? categoriaArchivio : leggi(K_CATEGORIA);
  return v && categorie(indice).some(c => c.id === v) ? v : TUTTI;
}
function salvaCategoria(v) { if (inArchivio()) categoriaArchivio = v; else scrivi(K_CATEGORIA, v); }
// Sceglie una categoria (o 'tutti') e azzera il girone a "tutti i gironi".
export function impostaCategoria(id) {
  if (inArchivio()) sceltaArchivio = TUTTI; else scrivi(K_GIRONE, TUTTI);
  salvaCategoria(id);
}
export function impostaGirone(slug, indice) {
  if (inArchivio()) sceltaArchivio = slug; else scrivi(K_GIRONE, slug);
  if (slug === TUTTI) salvaCategoria(TUTTI);
  else if (indice) salvaCategoria(categoriaDelGirone(indice, slug));
}
// Slug dei gironi coperti dal contesto corrente: il girone scelto, oppure quelli della categoria, oppure tutti.
export function gironiVisibili(indice) {
  const g = leggiGirone(indice);
  if (g !== TUTTI) return [g];
  const cat = leggiCategoria(indice);
  return gironi(indice).filter(x => cat === TUTTI || x.campionato.id === cat).map(x => x.slug);
}
export function gironeEffettivo(indice) {
  const g = leggiGirone(indice);
  if (g !== TUTTI) return g;
  const cat = leggiCategoria(indice);
  const lista = gironi(indice);
  return (lista.find(x => cat !== TUTTI && x.campionato.id === cat) ?? lista[0])?.slug ?? null;
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
export function _reset() { for (const k of Object.keys(memoria)) delete memoria[k]; sceltaArchivio = null; categoriaArchivio = TUTTI; }
// Contesto in vigore (girone + categoria), salvato in ogni voce della cronologia per il tasto indietro.
export const fotografiaContesto = (indice) => ({ girone: leggiGirone(indice), categoria: leggiCategoria(indice) });
export function ripristinaContesto(f, indice) {
  if (!f || typeof f.girone !== 'string') return;
  if (f.girone !== TUTTI) impostaGirone(f.girone, indice);
  else impostaCategoria(typeof f.categoria === 'string' ? f.categoria : TUTTI);
}
