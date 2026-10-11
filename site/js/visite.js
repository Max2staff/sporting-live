// Statistiche di visita anonime (GoatCounter). Spente finché config.goatcounter è vuoto.
const CODICE = /^[a-z0-9-]{2,50}$/;
const SLUG = /^[a-z0-9-]{1,60}$/;
const ED = /^[A-Za-z0-9_-]{1,60}$/;

// Percorso senza dati personali: niente query di ricerca, niente slug di giocatori.
export function percorsoAnonimo(rotta) {
  const r = rotta || {};
  const p = r.params || [];
  let v = String(r.vista || 'partite');
  if (v === 'classifiche' && p[0] && SLUG.test(p[0])) v += `/${p[0]}`;
  else if (v === 'squadra' && /^\d{1,8}$/.test(p[0] || '')) v += `/${p[0]}`;
  const base = `/${v}`;
  return r.edizione && ED.test(r.edizione) ? `/a/${r.edizione}${base}` : base;
}

// env iniettabile per i test: { Image, location, navigator, document, random }
export function conta(rotta, config, env = {}) {
  try {
    const codice = config && config.goatcounter;
    if (!codice || typeof codice !== 'string' || !CODICE.test(codice)) return false;
    const loc = env.location || globalThis.location;
    const nav = env.navigator || globalThis.navigator;
    const host = loc && loc.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return false;
    if (nav && nav.doNotTrack === '1') return false;
    const Img = env.Image || globalThis.Image;
    const doc = env.document || globalThis.document;
    const rnd = (env.random || Math.random)().toString(36).slice(2);
    const titolo = (doc && doc.title) || '';
    const img = new Img();
    img.src = `https://${codice}.goatcounter.com/count?p=${encodeURIComponent(percorsoAnonimo(rotta))}&t=${encodeURIComponent(titolo)}&rnd=${rnd}`;
    return true;
  } catch { return false; }
}
