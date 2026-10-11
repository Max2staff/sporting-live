// Ricerca di squadre e giocatori: logica pura.
export function normalizza(s) {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['’`´.]/g, ' ').replace(/\s+/g, ' ').trim();
}

const parole = (s) => normalizza(s).split(' ').filter(Boolean);

// Tutte le parole di q devono essere prefisso di una parola del nome, in qualsiasi ordine.
// Nota: "deste" NON trova D'ESTE (l'apostrofo separa le parole); "d este" ed "este" si'.
export function cerca(dati, q, max = 30) {
  const qp = parole(q);
  if (normalizza(q).length < 2) return [];
  const ok = (nome) => { const np = parole(nome); return qp.every(w => np.some(n => n.startsWith(w))); };
  const ordina = (a, b) => normalizza(a.nome).localeCompare(normalizza(b.nome), 'it');
  const sq = (dati?.squadre || []).filter(s => String(s.nome).trim().toUpperCase() !== 'RIPOSO' && ok(s.nome))
    .sort(ordina).map(s => ({ tipo: 'squadra', ...s }));
  const gi = (dati?.giocatori || []).filter(g => ok(g.nome)).sort(ordina).map(g => ({ tipo: 'giocatore', ...g }));
  return [...sq, ...gi].slice(0, max);
}
