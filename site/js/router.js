export const VISTE = ['partite', 'partita', 'classifiche', 'squadra', 'giocatori', 'giocatore', 'info'];

function decodifica(p) {
  try { return decodeURIComponent(p); } catch { return p; }
}

export function analizza(hash) {
  const parti = String(hash || '').replace(/^#\/?/, '').split('/').filter(Boolean).map(decodifica);
  if (!parti.length || !VISTE.includes(parti[0])) return { vista: 'partite', params: [] };
  return { vista: parti[0], params: parti.slice(1) };
}
