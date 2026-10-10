import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capolista, capocannoniere, ultimaGiornata, podio } from '../evidenza.js';

const riga = (squadraId, pos, pt, g) => ({ squadraId, nome: `S${squadraId}`, pos, pt, g, v: 0, n: 0, p: 0, gf: 0, gs: 0, dr: 0 });
const P = (id, giornata, giocata) => ({ id, giornata, giocata });
const girone = {
  classifica: { totale: [riga(1, 1, 9, 3), riga(2, 2, 6, 3), riga(3, 3, 3, 3), riga(4, 4, 0, 3)] },
  giocatori: { marcatori: [{ slug: '1-a', nome: 'A', squadraId: 1, gol: 5 }] },
  partite: [P(10, 1, true), P(11, 2, true), P(12, 2, true), P(13, 3, false)],
};

test('evidenza a stagione in corso', () => {
  assert.equal(capolista(girone).squadraId, 1);
  assert.equal(capocannoniere(girone).nome, 'A');
  assert.deepEqual(ultimaGiornata(girone), { giornata: 2, partite: [P(11, 2, true), P(12, 2, true)] });
  assert.deepEqual(podio(girone.classifica.totale).map(r => r.squadraId), [1, 2, 3]);
});

test('evidenza a inizio stagione', () => {
  const vuoto = { classifica: { totale: [riga(1, 1, 0, 0)] }, giocatori: { marcatori: [] }, partite: [P(1, 1, false)] };
  assert.equal(capolista(vuoto), null);
  assert.equal(capocannoniere(vuoto), null);
  assert.equal(ultimaGiornata(vuoto), null);
  assert.deepEqual(podio([]), []);
  assert.equal(capolista({}), null);
  assert.equal(ultimaGiornata({}), null);
});
