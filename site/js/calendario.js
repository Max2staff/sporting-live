// Calendario di un girone per giornate (logica pura).
export const DA_DEFINIRE_G = 'dd';
const intera = (g) => Number.isInteger(g);

export const giornate = (partite) => [...new Set((partite || []).map(p => p.giornata).filter(intera))].sort((a, b) => a - b);

// Prima giornata con almeno una partita da giocare; se sono tutte giocate, l'ultima.
export function giornataIniziale(partite) {
  const gg = giornate(partite);
  if (!gg.length) return null;
  return gg.find(g => partite.some(p => p.giornata === g && !p.giocata)) ?? gg[gg.length - 1];
}

const chiave = (p) => `${p.data || '9999-99-99'} ${p.ora || '99:99'}`;
const ordina = (l) => [...l].sort((a, b) => chiave(a).localeCompare(chiave(b)) || a.id - b.id);

export const partiteGiornata = (partite, n) => ordina((partite || []).filter(p => p.giornata === n));
export const senzaGiornata = (partite) => ordina((partite || []).filter(p => !intera(p.giornata)));

// Le "partite" contro la squadra fittizia RIPOSO non si giocano: escono dal calendario e diventano "riposa".
export function separaRiposo(partite, idsRiposo) {
  const r = new Set((idsRiposo || []).map(Number));
  const out = { partite: [], riposa: [] };
  for (const p of partite || []) {
    if (r.has(Number(p.casaId))) out.riposa.push({ giornata: p.giornata, squadraId: p.ospiteId });
    else if (r.has(Number(p.ospiteId))) out.riposa.push({ giornata: p.giornata, squadraId: p.casaId });
    else out.partite.push(p);
  }
  return out;
}
