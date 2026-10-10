import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leggiPreferiti, togglePreferito, èPreferita, _reset } from '../preferiti.js';

test('senza localStorage funziona in memoria', () => {
  _reset();
  assert.deepEqual(leggiPreferiti(), []);
  assert.deepEqual(togglePreferito(2480), [2480]);
  assert.equal(èPreferita(2480), true);
  assert.deepEqual(togglePreferito(2480), []);
});
test('con localStorage che lancia non esplode', () => {
  globalThis.localStorage = { getItem() { throw new Error('bloccato'); }, setItem() { throw new Error('bloccato'); } };
  _reset();
  assert.deepEqual(togglePreferito(1), [1]);
  assert.deepEqual(leggiPreferiti(), [1]);
  delete globalThis.localStorage;
});
test('con localStorage vero persiste', () => {
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); } };
  _reset();
  togglePreferito(7);
  _reset();
  assert.deepEqual(leggiPreferiti(), [7]);
  delete globalThis.localStorage;
});
