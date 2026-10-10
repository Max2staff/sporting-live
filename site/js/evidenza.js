// Dati "in evidenza" di un girone (girone/<slug>.json). Funzioni pure.
export function capolista(girone) {
  const r = girone?.classifica?.totale?.[0];
  return r && r.g > 0 ? r : null;
}
export const capocannoniere = (girone) => girone?.giocatori?.marcatori?.[0] || null;
export function ultimaGiornata(girone) {
  const giocate = (girone?.partite || []).filter(p => p.giocata);
  if (!giocate.length) return null;
  const giornata = Math.max(...giocate.map(p => p.giornata));
  return { giornata, partite: giocate.filter(p => p.giornata === giornata) };
}
export const podio = (righe) => (righe || []).slice(0, 3);
