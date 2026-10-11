// Stemmi delle squadre: logo vero se presente, altrimenti un pallino col colore (stabile) della squadra.

const PAROLE_IGNORATE = new Set(['REAL', 'ASD', 'FC', 'AC', 'SS', 'US', 'AS', 'CALCIO', 'C5', 'C8']);

export function iniziali(nome) {
  const parole = String(nome ?? '').toUpperCase().split(/\s+/).filter(Boolean)
    .filter(p => !p.includes('.'))                        // sigle puntate: F.C., R.S.M., A.S.D.
    .map(p => p.replace(/[^A-Z0-9À-Ý&]/g, ''))
    .filter(p => p && !PAROLE_IGNORATE.has(p));
  const pulite = parole.map(p => p.replace(/&/g, '')).filter(Boolean);
  if (!pulite.length) return '?';
  if (pulite.length === 1) return pulite[0].slice(0, 2);
  return pulite[0][0] + pulite[1][0];
}

function hash(id) {
  let h = 2166136261;
  for (const ch of String(id)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function coloriStemma(id) {
  const h = hash(id);
  const tinta = h % 360;
  const tinta2 = (tinta + 140 + ((h >>> 9) % 80)) % 360;
  const chiaro = (t) => t >= 40 && t <= 200;               // gialli/verdi/ciani: serve più scuro per il bianco
  return {
    primario: `hsl(${tinta} 68% ${chiaro(tinta) ? 30 : 40}%)`,
    secondario: `hsl(${tinta2} 78% ${chiaro(tinta2) ? 44 : 52}%)`,
    motivo: (h >>> 17) % 3,
  };
}

// Colori ben distinguibili tra loro, leggibili su sfondo scuro e chiaro.
export const PALLINI = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#84cc16', '#a16207'];
export const colorePallino = (id) => PALLINI[hash(id) % PALLINI.length];

// Logo vero se c'è; altrimenti negli elenchi (fino a 32px) un pallino col colore della squadra, nei formati grandi niente.
export function stemmaHTML(squadra, dim = 40) {
  if (!squadra) return '';
  const id = Number(squadra.id);
  if (squadra.stemma) return `<img class="stemma" src="img/stemmi/${id}.png" width="${dim}" height="${dim}" alt="" aria-hidden="true" loading="lazy">`;
  if (dim > 32) return '';
  return `<span class="stemma pallino" style="background:${colorePallino(id)}" aria-hidden="true"></span>`;
}
