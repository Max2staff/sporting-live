import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capolista, capocannoniere, ultimaGiornata, podio, squadraReale } from '../evidenza.js';

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

test('RIPOSO mai capolista né sul podio', () => {
  const rip = { ...riga(99, 1, 20, 2), nome: ' riposo ' };
  const righe = [rip, riga(1, 2, 9, 3), riga(2, 3, 6, 3), riga(3, 4, 3, 3)];
  assert.equal(squadraReale(rip), false);
  assert.equal(capolista({ classifica: { totale: righe } }).squadraId, 1);
  assert.deepEqual(podio(righe).map(r => r.squadraId), [1, 2, 3]);
});

import { inizioGirone, gironiDaIniziare } from '../evidenza.js';
test('inizioGirone: prima data e partite del giorno; iniziato con una giocata', () => {
  const P2 = (id, data, ora, giocata = false) => ({ id, data, ora, giocata });
  assert.deepEqual(inizioGirone([P2(3, '2026-10-14', '21:00'), P2(2, '2026-10-13', '21:00'), P2(1, '2026-10-13', '20:00'), P2(4, null, null)]),
    { iniziato: false, data: '2026-10-13', partite: [P2(1, '2026-10-13', '20:00'), P2(2, '2026-10-13', '21:00')] });
  assert.deepEqual(inizioGirone([P2(1, null, null)]), { iniziato: false, data: null, partite: [] });
  assert.deepEqual(inizioGirone([]), { iniziato: false, data: null, partite: [] });
  assert.equal(inizioGirone([P2(1, '2026-10-13', '20:00', true), P2(2, null, null)]).iniziato, true);
});

test('gironiDaIniziare: solo gironi visibili, con calendario e senza giocate', () => {
  const ind = { campionati: [
    { id: 'c8', nome: 'Calcio a 8', gironi: [{ slug: 'a', nome: 'A' }] },
    { id: 'c5', nome: 'Calcio a 5', gironi: [{ slug: 's', nome: 'Super League' }, { slug: 'v', nome: 'Vuoto' }] }],
    partite: [{ id: 1, girone: 'a', data: '2026-10-01', giocata: true }, { id: 2, girone: 's', data: '2026-10-13', ora: '20:00', giocata: false }, { id: 3, girone: 's', data: null, giocata: false }] };
  const r = gironiDaIniziare(ind, ['a', 's', 'v']);
  assert.deepEqual(r.map(x => [x.campionato, x.girone.slug, x.data, x.partite.length]), [['Calcio a 5', 's', '2026-10-13', 1]]);
  assert.deepEqual(gironiDaIniziare(ind, ['a']), []);
  r.length = 0;
  ind.partite[1].giocata = true;
  assert.deepEqual(gironiDaIniziare(ind, ['s']), []);   // sparisce alla prima partita giocata
});
