import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TUTTI, gironi, leggiGirone, impostaGirone, gironeEffettivo, etichettaGirone, introDaMostrare, segnaIntroVista, riattivaIntro, _reset, fotografiaContesto, ripristinaContesto } from '../contesto.js';

const indice = { campionati: [
  { id: 'c8', nome: 'Calcio a 8', gironi: [{ slug: 'serie-a', nome: 'Serie A' }, { slug: 'serie-b', nome: 'Serie B' }] },
  { id: 'c5', nome: 'Calcio a 5', gironi: [{ slug: 'super-league', nome: 'Super League' }] }] };

test('gironi piatti con campionato', () => {
  assert.deepEqual(gironi(indice).map(g => [g.slug, g.campionato.nome]), [['serie-a', 'Calcio a 8'], ['serie-b', 'Calcio a 8'], ['super-league', 'Calcio a 5']]);
  assert.deepEqual(gironi({ campionati: [{ id: 'x', nome: 'X' }] }), []);
});

test('girone: default, scelta, slug sparito, effettivo, etichetta (senza storage)', () => {
  _reset();
  assert.equal(leggiGirone(indice), TUTTI);
  assert.equal(gironeEffettivo(indice), 'serie-a');
  impostaGirone('serie-b');
  assert.equal(leggiGirone(indice), 'serie-b');
  assert.equal(gironeEffettivo(indice), 'serie-b');
  assert.equal(etichettaGirone(indice, 'serie-b'), 'Calcio a 8 · Serie B');
  assert.equal(etichettaGirone(indice, TUTTI), 'Tutti i gironi');
  impostaGirone('girone-vecchio');
  assert.equal(leggiGirone(indice), TUTTI);
  assert.equal(gironeEffettivo({ campionati: [] }), null);
});

test('intro: una volta, anche con storage che lancia', () => {
  globalThis.localStorage = { getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); } };
  try {
    _reset();
    assert.equal(introDaMostrare(), true);
    segnaIntroVista();
    assert.equal(introDaMostrare(), false);
    riattivaIntro();
    assert.equal(introDaMostrare(), true);
  } finally { delete globalThis.localStorage; }
});

test('persistenza con storage vero', () => {
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); } };
  try {
    _reset();
    impostaGirone('super-league');
    segnaIntroVista();
    _reset();
    assert.equal(leggiGirone(indice), 'super-league');
    assert.equal(introDaMostrare(), false);
  } finally { delete globalThis.localStorage; }
});

import { risolviGirone as _risolvi, impostaGirone as _imposta, _reset as _rst } from '../contesto.js';
test('risolviGirone: con "tutti" salvato lo slug di rotta non si salva', () => {
  const indice = { campionati: [{ id: 1, nome: 'A', gironi: [{ slug: 'a1', nome: '1' }, { slug: 'b1', nome: '2' }] }] };
  _rst();
  assert.deepEqual(_risolvi(indice, 'b1'), { mostrato: 'b1', salva: false });
  assert.deepEqual(_risolvi(indice, undefined), { mostrato: 'a1', salva: false });
  assert.deepEqual(_risolvi(indice, 'zz'), { mostrato: 'a1', salva: false });
  _imposta('a1');
  assert.deepEqual(_risolvi(indice, 'b1'), { mostrato: 'b1', salva: true });
  assert.deepEqual(_risolvi(indice, 'zz'), { mostrato: 'a1', salva: false });
  _rst();
});

import { categorie, leggiCategoria, impostaCategoria, gironiVisibili } from '../contesto.js';
import { impostaArchivio } from '../archivio.js';
test('categoria: elenco dai campionati, scelta, azzeramento girone, derivazione dal girone', () => {
  _reset();
  assert.deepEqual(categorie(indice), [{ id: 'c8', nome: 'Calcio a 8' }, { id: 'c5', nome: 'Calcio a 5' }]);
  assert.equal(leggiCategoria(indice), TUTTI);
  assert.deepEqual(gironiVisibili(indice), ['serie-a', 'serie-b', 'super-league']);
  impostaGirone('serie-b', indice);
  assert.equal(leggiCategoria(indice), 'c8');
  assert.deepEqual(gironiVisibili(indice), ['serie-b']);
  impostaCategoria('c5');                       // azzera il girone a "tutti"
  assert.equal(leggiGirone(indice), TUTTI);
  assert.equal(leggiCategoria(indice), 'c5');
  assert.deepEqual(gironiVisibili(indice), ['super-league']);
  impostaGirone('serie-a', indice);
  assert.equal(leggiCategoria(indice), 'c8');
  impostaGirone(TUTTI, indice);                 // "Tutti i gironi" azzera anche la categoria
  assert.equal(leggiCategoria(indice), TUTTI);
  impostaCategoria('zz');                       // categoria sparita: ignorata
  assert.equal(leggiCategoria(indice), TUTTI);
  _reset();
});

test('categoria: persistenza in storage (sl.categoria) e storage che lancia', () => {
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); } };
  try {
    _reset();
    impostaCategoria('c5');
    assert.equal(mem['sl.categoria'], 'c5');
    _reset();
    assert.equal(leggiCategoria(indice), 'c5');
  } finally { delete globalThis.localStorage; }
  globalThis.localStorage = { getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); } };
  try { _reset(); impostaCategoria('c5'); assert.equal(leggiCategoria(indice), 'c5'); } finally { delete globalThis.localStorage; _reset(); }
});

test('categoria in archivio: solo in memoria, nulla nello storage', () => {
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); } };
  try {
    _reset(); impostaArchivio('2025-26');
    assert.equal(leggiCategoria(indice), 'c8');   // default: primo girone dell'edizione
    impostaCategoria('c5');
    assert.equal(leggiCategoria(indice), 'c5');
    assert.deepEqual(mem, {});
  } finally { impostaArchivio(null); delete globalThis.localStorage; _reset(); }
});

test('gironeEffettivo: con "tutti" e una categoria vale il primo girone della categoria', () => {
  _reset();
  assert.equal(gironeEffettivo(indice), 'serie-a');
  impostaCategoria('c5');
  assert.equal(gironeEffettivo(indice), 'super-league');
  assert.deepEqual(_risolvi(indice, undefined), { mostrato: 'super-league', salva: false });
  impostaCategoria('c8');
  assert.equal(gironeEffettivo(indice), 'serie-a');
  _reset();
});

test('fotografia e ripristino del contesto', () => {
  _reset();
  impostaGirone('serie-b', indice);
  const a = fotografiaContesto(indice);
  impostaCategoria('c5');
  const b = fotografiaContesto(indice);
  assert.deepEqual(a, { girone: 'serie-b', categoria: 'c8' });
  assert.deepEqual(b, { girone: TUTTI, categoria: 'c5' });
  ripristinaContesto(a, indice);
  assert.equal(leggiGirone(indice), 'serie-b');
  ripristinaContesto(b, indice);
  assert.equal(leggiGirone(indice), TUTTI);
  assert.equal(leggiCategoria(indice), 'c5');
  ripristinaContesto(null, indice);
  assert.equal(leggiCategoria(indice), 'c5');
});
