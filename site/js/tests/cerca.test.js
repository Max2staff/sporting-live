import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizza, cerca } from '../cerca.js';

const dati = {
  squadre: [{ id: 1, nome: 'SOCKS', girone: 'a' }, { id: 2, nome: "F.C. BECK'S", girone: 'a' }, { id: 3, nome: 'RIPOSO', girone: 'a' }],
  giocatori: [
    { slug: '1-d-este-simone', nome: "D'ESTE SIMONE", squadraId: 1, girone: 'a' },
    { slug: '1-bernardis-nicolo', nome: 'BERNARDIS NICOLÒ', squadraId: 1, girone: 'a' },
    { slug: '2-socks-mario', nome: 'SOCKSINI MARIO', squadraId: 2, girone: 'a' }],
};
const nomi = (q, max) => cerca(dati, q, max).map(r => r.nome);

test('normalizza', () => {
  assert.equal(normalizza("  D'ESTE  Nicolò. "), 'd este nicolo');
});
test('ricerca', () => {
  assert.deepEqual(nomi('socks'), ['SOCKS', 'SOCKSINI MARIO']);
  assert.deepEqual(nomi('beck'), ["F.C. BECK'S"]);
  assert.deepEqual(nomi('d este'), ["D'ESTE SIMONE"]);
  assert.deepEqual(nomi('este'), ["D'ESTE SIMONE"]);
  assert.deepEqual(nomi('deste'), []);            // documentato: senza spazio non trova
  assert.deepEqual(nomi('nicolo'), ['BERNARDIS NICOLÒ']);
  assert.deepEqual(nomi('simone d'), ["D'ESTE SIMONE"]);
  assert.deepEqual(nomi('s'), []);
  assert.deepEqual(nomi('riposo'), []);
});
test('max e ordine', () => {
  assert.equal(cerca(dati, 'so', 1).length, 1);
  assert.equal(cerca(dati, 'socks')[0].tipo, 'squadra');
});
