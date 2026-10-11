import { test } from 'node:test';
import assert from 'node:assert/strict';
import { giornate, giornataIniziale, partiteGiornata, senzaGiornata, separaRiposo } from '../calendario.js';

const P = (id, giornata, giocata, data = '2026-10-0' + (giornata || 9), ora = '20:00') => ({ id, giornata, giocata, data, ora });

test('giornate distinte e ordinate, senza null', () => {
  assert.deepEqual(giornate([P(1, 2, true), P(2, 1, true), P(3, 2, false), P(4, null, false)]), [1, 2]);
  assert.deepEqual(giornate([]), []);
  assert.deepEqual(giornate(undefined), []);
});

test('giornata iniziale: la prima con partite da giocare', () => {
  assert.equal(giornataIniziale([P(1, 1, true), P(2, 2, true), P(3, 2, false), P(4, 3, false)]), 2);
});

test('giornata iniziale: girone finito -> ultima; mai iniziato -> prima; vuoto -> null', () => {
  assert.equal(giornataIniziale([P(1, 1, true), P(2, 2, true)]), 2);
  assert.equal(giornataIniziale([P(1, 1, false), P(2, 2, false)]), 1);
  assert.equal(giornataIniziale([]), null);
});

test('partite della giornata ordinate per data, ora, id; data mancante in fondo', () => {
  const l = [P(3, 1, false, null, null), P(2, 1, true, '2026-10-02', '21:00'), P(1, 1, true, '2026-10-02', '20:00'), P(9, 2, true)];
  assert.deepEqual(partiteGiornata(l, 1).map(p => p.id), [1, 2, 3]);
  assert.deepEqual(partiteGiornata(l, 5), []);
});

test('partite senza giornata', () => {
  assert.deepEqual(senzaGiornata([P(1, 1, true), P(2, null, false), P(3, undefined, false)]).map(p => p.id), [2, 3]);
});

test('partite contro RIPOSO: tolte dal calendario, la squadra risulta a riposo', () => {
  const l = [{ id: 1, giornata: 1, giocata: true, casaId: 10, ospiteId: 20 }, { id: 2, giornata: 1, giocata: false, casaId: 30, ospiteId: 99 },
    { id: 3, giornata: 2, giocata: false, casaId: 99, ospiteId: 10 }];
  const r = separaRiposo(l, [99]);
  assert.deepEqual(r.partite.map(p => p.id), [1]);
  assert.deepEqual(r.riposa, [{ giornata: 1, squadraId: 30 }, { giornata: 2, squadraId: 10 }]);
  assert.equal(giornataIniziale(r.partite), 1);
  assert.deepEqual(separaRiposo(l, []).partite.length, 3);
});

test('giornata iniziale con oggi: una partita rinviata non blocca il calendario', () => {
  const l = [P(1, 1, true, '2026-09-14'), P(2, 2, false, '2026-09-21'), P(3, 2, true, '2026-09-21'),
    P(4, 3, true, '2026-09-28'), P(5, 4, false, '2026-10-12'), P(6, 5, false, '2026-10-19')];
  assert.equal(giornataIniziale(l, '2026-10-11'), 4);
  assert.equal(giornataIniziale(l, '2026-10-12'), 4);
  // stagione finita salvo un recupero mai giocato: l'ultima giornata giocata
  assert.equal(giornataIniziale(l.slice(0, 4), '2027-05-01'), 3);
  // recupero senza data: non conta
  assert.equal(giornataIniziale([P(1, 1, true), P(2, 2, false, null), P(3, 2, true)], '2026-10-11'), 2);
  // niente giocato e date future: la prima
  assert.equal(giornataIniziale([P(1, 1, false, '2026-10-13'), P(2, 2, false, '2026-10-20')], '2026-10-11'), 1);
});
