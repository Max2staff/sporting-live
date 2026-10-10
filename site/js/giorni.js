export const DA_DEFINIRE = 'da-definire';

export function giorniConPartite(partite) {
  return [...new Set(partite.map(p => p.data).filter(Boolean))].sort();
}

export function giornoIniziale(giorni, oggi) {
  if (!giorni.length) return null;
  if (giorni.includes(oggi)) return oggi;
  return giorni.find(g => g > oggi) || giorni[giorni.length - 1];
}

export function partiteDelGiorno(partite, giorno) {
  const sel = giorno === DA_DEFINIRE ? partite.filter(p => !p.data) : partite.filter(p => p.data === giorno);
  return sel.sort((a, b) => (a.ora || '').localeCompare(b.ora || '') || a.id - b.id);
}

export function raggruppaPerGirone(partite, indice) {
  const out = [];
  for (const c of indice.campionati) for (const g of c.gironi) {
    const mie = partite.filter(p => p.girone === g.slug);
    if (mie.length) out.push({ campionato: c.nome, girone: { slug: g.slug, nome: g.nome }, partite: mie });
  }
  return out;
}

export function partitePreferite(partite, preferiti, oggi) {
  const out = [];
  for (const id of preferiti) {
    const mie = partite.filter(p => p.casaId === id || p.ospiteId === id);
    if (!mie.length) continue;
    const giocate = mie.filter(p => p.giocata).sort((a, b) => (a.data || '').localeCompare(b.data || '') || a.giornata - b.giornata);
    const future = mie.filter(p => !p.giocata);
    const prossima = future.filter(p => p.data && p.data >= oggi).sort((a, b) => a.data.localeCompare(b.data))[0] || future.find(p => !p.data) || null;
    out.push({ squadraId: id, ultima: giocate[giocate.length - 1] || null, prossima });
  }
  return out;
}
