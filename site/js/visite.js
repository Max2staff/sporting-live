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

// Provenienza da un QR stampato (?da=segreteria): letta una volta all'avvio, tolta dall'indirizzo
// (così un preferito salvato non la ripete) e inviata solo con la prima pagina vista.
let origine = null;
export function leggiProvenienza(loc = globalThis.location, hist = globalThis.history) {
  try {
    const da = new URLSearchParams(loc.search || '').get('da');
    if (!da) return null;
    origine = SLUG.test(da) ? da : null;
    if (hist) hist.replaceState(hist.state, '', loc.pathname + (loc.hash || ''));
    return origine;
  } catch { return null; }
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
    const r = origine ? `&r=${encodeURIComponent(`qr-${origine}`)}` : '';
    origine = null;
    img.src = `https://${codice}.goatcounter.com/count?p=${encodeURIComponent(percorsoAnonimo(rotta))}&t=${encodeURIComponent(titolo)}${r}&rnd=${rnd}`;
    return true;
  } catch { return false; }
}
