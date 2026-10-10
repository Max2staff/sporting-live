import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timelineMarcatori, formazioniAffiancate, slugGiocatore } from '../tabellino.js';

const tab = {
  marcatori: [{ squadraId: 20, nome: 'B', minuto: 30 }, { squadraId: 10, nome: 'A', minuto: 5 }, { squadraId: null, nome: 'X', minuto: 1 }],
  formazioni: [{ squadraId: 10, nome: 'A', numero: 7, voto: 7 }, { squadraId: 10, nome: 'C', numero: null, voto: null }, { squadraId: 20, nome: 'B', numero: 1, voto: 6 }],
  migliore: null, completo: true,
};
test('timeline ordinata, ignoti esclusi', () => {
  assert.deepEqual(timelineMarcatori(tab, 10), [{ minuto: 5, nome: 'A', lato: 'casa' }, { minuto: 30, nome: 'B', lato: 'ospite' }]);
});
test('formazioni affiancate', () => {
  const r = formazioniAffiancate(tab, 10, 20);
  assert.equal(r.length, 2);
  assert.equal(r[0].casa.nome, 'A'); assert.equal(r[0].ospite.nome, 'B');
  assert.equal(r[1].casa.nome, 'C'); assert.equal(r[1].ospite, null);
});
test('slug uguale a python', () => {
  assert.equal(slugGiocatore(2480, "D'ANGELO JOSÈ  MARÍA"), '2480-d-angelo-jose-maria');
});
