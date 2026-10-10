// Dati "in evidenza" di un girone (girone/<slug>.json). Funzioni pure.
// La squadra fittizia "RIPOSO" non e' mai una squadra vera (mai capolista/podio).
export const squadraReale = r => String(r?.nome ?? '').trim().toUpperCase() !== 'RIPOSO';
export function capolista(girone) {
  return (girone?.classifica?.totale || []).find(r => r.g > 0 && squadraReale(r)) || null;
}
export const capocannoniere = (girone) => girone?.giocatori?.marcatori?.[0] || null;
export function ultimaGiornata(girone) {
  const giocate = (girone?.partite || []).filter(p => p.giocata);
  if (!giocate.length) return null;
  const giornata = Math.max(...giocate.map(p => p.giornata));
  return { giornata, partite: giocate.filter(p => p.giornata === giornata) };
}
export const podio = (righe) => (righe || []).filter(squadraReale).slice(0, 3);
