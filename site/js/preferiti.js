import { inArchivio } from './archivio.js';
const CHIAVE = 'sl.preferiti';
let memoria = null;

function leggi() {
  if (memoria) return memoria;
  try { memoria = JSON.parse(globalThis.localStorage?.getItem(CHIAVE) || '[]'); } catch { memoria = []; }
  if (!Array.isArray(memoria)) memoria = [];
  return memoria;
}
function salva(lista) {
  memoria = lista;
  try { globalThis.localStorage?.setItem(CHIAVE, JSON.stringify(lista)); } catch { /* solo in memoria */ }
}
export const leggiPreferiti = () => (inArchivio() ? [] : [...leggi()]);
export const èPreferita = (id) => !inArchivio() && leggi().includes(Number(id));
export function togglePreferito(id) {
  if (inArchivio()) return [];
  id = Number(id);
  const l = leggi();
  salva(l.includes(id) ? l.filter(x => x !== id) : [...l, id]);
  return leggiPreferiti();
}
export function _reset() { memoria = null; }
