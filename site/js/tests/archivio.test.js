import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { impostaArchivio, inArchivio } from '../archivio.js';
import { gironi, leggiGirone, impostaGirone, risolviGirone, introDaMostrare, segnaIntroVista, riattivaIntro, _reset, TUTTI } from '../contesto.js';
import { leggiPreferiti, èPreferita, togglePreferito, _reset as resetPref } from '../preferiti.js';

const indice = { campionati: [{ id: 'c8', nome: 'Calcio a 8', gironi: [{ slug: 'serie-a', nome: 'Serie A' }, { slug: 'serie-b', nome: 'Serie B' }] }] };
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };

beforeEach(() => { impostaArchivio(null); _reset(); resetPref(); store.clear(); });

test('archivio: girone dalla rotta, default il primo, niente storage', () => {
  impostaGirone('serie-b');           // stagione corrente: salvato
  assert.equal(store.get('sl.girone'), 'serie-b');
  impostaArchivio('2025-26');
  assert.equal(inArchivio(), true);
  assert.equal(leggiGirone(indice), 'serie-a');                  // non legge il girone salvato
  assert.deepEqual(risolviGirone(indice, 'serie-b'), { mostrato: 'serie-b', salva: true });
  assert.deepEqual(risolviGirone(indice, 'boh'), { mostrato: 'serie-a', salva: false });
  impostaGirone('serie-b');                                        // solo in memoria
  assert.equal(leggiGirone(indice), 'serie-b');
  impostaGirone(TUTTI);
  assert.equal(leggiGirone(indice), TUTTI);
  assert.equal(store.get('sl.girone'), 'serie-b');                // invariato
  impostaArchivio(null);
  assert.equal(leggiGirone(indice), 'serie-b');
  assert.equal(gironi(indice).length, 2);
});

test('archivio: intro e preferiti non letti né scritti', () => {
  togglePreferito(7);
  assert.deepEqual(leggiPreferiti(), [7]);
  impostaArchivio('estate-2026');
  assert.equal(introDaMostrare(), false);
  assert.deepEqual(leggiPreferiti(), []);
  assert.equal(èPreferita(7), false);
  togglePreferito(9);
  segnaIntroVista(); riattivaIntro();
  impostaArchivio(null);
  assert.deepEqual(leggiPreferiti(), [7]);                        // la stagione corrente non è stata toccata
  assert.equal(store.get('sl.intro'), undefined);
  assert.equal(introDaMostrare(), true);
});
