// Stato "stai guardando un'edizione d'archivio". In archivio preferiti, girone salvato e introduzione
// non si leggono né si scrivono (vedi contesto.js e preferiti.js). Nessuna dipendenza dal browser.
let edizione = null;
export const inArchivio = () => edizione !== null;
export const edizioneCorrente = () => edizione;
export function impostaArchivio(slug) { edizione = slug || null; }
