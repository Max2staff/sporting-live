// Tasto indietro: numero di passo in history.state e pagina "madre" per chi arriva da un link esterno.
const DETTAGLI = ['partita', 'squadra', 'giocatore'];

// Voce già vista: il suo passo. Voce nuova: uno in più dell'ultima mostrata (0 se è la prima della sessione).
export function passoDa(stato, ultimo) {
  if (stato && Number.isInteger(stato.sl)) return stato.sl;
  return Number.isInteger(ultimo) ? ultimo + 1 : 0;
}

export function madre(vista, dati) {
  const d = dati || {};
  if (vista === 'partita') return d.data ? `#/partite/${d.data}` : '#/partite';
  if (vista === 'squadra') return d.girone && d.girone.slug ? `#/classifiche/${encodeURIComponent(d.girone.slug)}` : '#/classifiche';
  if (vista === 'giocatore') return d.squadraId != null ? `#/squadra/${Number(d.squadraId)}` : '#/giocatori';
  return null;
}

export const mostraIndietro = (vista, passo) => vista !== 'intro' && (DETTAGLI.includes(vista) || passo > 0);
