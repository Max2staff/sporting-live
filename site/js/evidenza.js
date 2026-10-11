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

// Inizio di un girone: iniziato se c'è almeno una partita giocata; altrimenti prima data con partite (o null) e
// le partite di quel giorno ordinate per ora.
export function inizioGirone(partite) {
  const lista = partite || [];
  if (lista.some(p => p.giocata)) return { iniziato: true, data: null, partite: [] };
  const data = lista.map(p => p.data).filter(Boolean).sort()[0] || null;
  const primo = data ? lista.filter(p => p.data === data).sort((a, b) => (a.ora || '').localeCompare(b.ora || '') || a.id - b.id) : [];
  return { iniziato: false, data, partite: primo };
}
// Gironi tra `slugs` che non hanno ancora partite giocate (e hanno un calendario, anche senza date).
export function gironiDaIniziare(indice, slugs) {
  const out = [];
  for (const c of indice.campionati || []) for (const g of c.gironi || []) {
    if (!slugs.includes(g.slug)) continue;
    const mie = (indice.partite || []).filter(p => p.girone === g.slug);
    if (!mie.length) continue;
    const i = inizioGirone(mie);
    if (!i.iniziato) out.push({ campionato: c.nome, girone: { slug: g.slug, nome: g.nome }, data: i.data, partite: i.partite });
  }
  return out;
}
