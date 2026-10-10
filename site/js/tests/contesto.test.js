import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TUTTI, gironi, leggiGirone, impostaGirone, gironeEffettivo, etichettaGirone, introDaMostrare, segnaIntroVista, riattivaIntro, _reset } from '../contesto.js';

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
