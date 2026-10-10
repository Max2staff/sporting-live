export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
const GIORNI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
const GIORNI_LUNGHI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const pad = (n) => String(n).padStart(2, '0');
export function daISO(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
export function formattaData(iso) { if (!iso) return 'da definire'; const d = daISO(iso); return `${GIORNI[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; }
export function formattaDataLunga(iso) { if (!iso) return 'da definire'; const d = daISO(iso); return `${GIORNI_LUNGHI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}`; }
export function formattaOra(isoTs) { const d = new Date(isoTs); return isNaN(d) ? '' : `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
export function oggiISO() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
const TITOLO_FORMA = { V: 'vittoria', N: 'pareggio', P: 'sconfitta' };
export function pallinoForma(e) { return `<span class="forma ${e}" title="${TITOLO_FORMA[e] || ''}">${e}</span>`; }
export const formaHTML = (lista) => `<span class="forma-lista">${(lista || []).map(pallinoForma).join('')}</span>`;
export const segnoDR = (dr) => (dr > 0 ? '+' : '') + dr;
