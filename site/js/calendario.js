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
