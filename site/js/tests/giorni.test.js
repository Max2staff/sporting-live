import { test } from 'node:test';
import assert from 'node:assert/strict';
import { giorniConPartite, giornoIniziale, partiteDelGiorno, raggruppaPerGirone, partitePreferite } from '../giorni.js';

const P = (id, girone, data, casaId, ospiteId, giocata = false) => ({ id, girone, giornata: 1, data, ora: '20:30', casaId, ospiteId, golCasa: giocata ? 1 : null, golOspite: giocata ? 0 : null, giocata, tavolino: false, tabellino: giocata });
const partite = [P(1, 'serie-b', '2026-09-16', 10, 20, true), P(2, 'serie-a', '2026-09-16', 30, 40, true), P(3, 'serie-b', '2026-09-23', 20, 10), P(4, 'serie-b', null, 10, 30)];
const indice = { campionati: [{ id: 'c8', nome: 'Calcio a 8', gironi: [{ slug: 'serie-a', nome: 'Serie A' }, { slug: 'serie-b', nome: 'Serie B' }] }] };

test('giorni e giorno iniziale', () => {
  assert.deepEqual(giorniConPartite(partite), ['2026-09-16', '2026-09-23']);
  assert.equal(giornoIniziale(['2026-09-16', '2026-09-23'], '2026-09-16'), '2026-09-16');
  assert.equal(giornoIniziale(['2026-09-16', '2026-09-23'], '2026-09-20'), '2026-09-23');
  assert.equal(giornoIniziale(['2026-09-16', '2026-09-23'], '2026-10-01'), '2026-09-23');
  assert.equal(giornoIniziale([], '2026-10-01'), null);
});
test('partite del giorno, anche da definire', () => {
  assert.deepEqual(partiteDelGiorno(partite, '2026-09-16').map(p => p.id), [1, 2]);
  assert.deepEqual(partiteDelGiorno(partite, 'da-definire').map(p => p.id), [4]);
  assert.deepEqual(partiteDelGiorno(partite, '2030-01-01'), []);
});
test('raggruppa per girone nell ordine dell indice', () => {
  const g = raggruppaPerGirone(partiteDelGiorno(partite, '2026-09-16'), indice);
  assert.deepEqual(g.map(x => [x.campionato, x.girone.slug, x.partite.map(p => p.id)]), [['Calcio a 8', 'serie-a', [2]], ['Calcio a 8', 'serie-b', [1]]]);
});
test('partite preferite: ultima e prossima', () => {
  const r = partitePreferite(partite, [10, 99], '2026-09-20');
  assert.equal(r.length, 1);
  assert.equal(r[0].squadraId, 10);
  assert.equal(r[0].ultima.id, 1);
  assert.equal(r[0].prossima.id, 3);
  assert.equal(partitePreferite(partite, [10], '2026-09-30')[0].prossima.id, 4);   // resta solo quella da definire
});
