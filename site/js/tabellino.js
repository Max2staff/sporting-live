export function slugGiocatore(squadraId, nome) {
  const s = String(nome).normalize('NFKD').replace(/[^\x00-\x7F]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${squadraId}-${s}`;
}
export function timelineMarcatori(tab, casaId) {
  return tab.marcatori.filter(m => m.squadraId != null)
    .map(m => ({ minuto: m.minuto, nome: m.nome, lato: m.squadraId === casaId ? 'casa' : 'ospite' }))
    .sort((a, b) => a.minuto - b.minuto);
}
const perNumero = (a, b) => (a.numero ?? 999) - (b.numero ?? 999) || a.nome.localeCompare(b.nome);
export function formazioniAffiancate(tab, casaId, ospiteId) {
  const casa = tab.formazioni.filter(f => f.squadraId === casaId).sort(perNumero);
  const ospite = tab.formazioni.filter(f => f.squadraId === ospiteId).sort(perNumero);
  const n = Math.max(casa.length, ospite.length);
  return Array.from({ length: n }, (_, i) => ({ casa: casa[i] || null, ospite: ospite[i] || null }));
}
