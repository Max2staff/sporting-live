import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analizza } from '../router.js';

test('rotte', () => {
  assert.deepEqual(analizza(''), { vista: 'partite', params: [] });
  assert.deepEqual(analizza('#/partite'), { vista: 'partite', params: [] });
  assert.deepEqual(analizza('#/partita/14083'), { vista: 'partita', params: ['14083'] });
  assert.deepEqual(analizza('#/squadra/2480'), { vista: 'squadra', params: ['2480'] });
  assert.deepEqual(analizza('#/giocatore/2480-rossi-mario'), { vista: 'giocatore', params: ['2480-rossi-mario'] });
  assert.deepEqual(analizza('#/classifiche/serie-b'), { vista: 'classifiche', params: ['serie-b'] });
  assert.deepEqual(analizza('#/boh/x'), { vista: 'partite', params: [] });
  assert.deepEqual(analizza('#/partite/2026-09-16'), { vista: 'partite', params: ['2026-09-16'] });
  assert.deepEqual(analizza('#/partita/%E0%A4'), { vista: 'partita', params: ['%E0%A4'] });
});
