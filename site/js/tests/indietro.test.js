import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passoDa, madre, mostraIndietro } from '../indietro.js';
import { prefissaHash } from '../router.js';

test('passo: prima pagina 0, nuove voci +1, voci già viste tengono il loro', () => {
  assert.equal(passoDa(null, null), 0);
  assert.equal(passoDa(null, 0), 1);
  assert.equal(passoDa({}, 4), 5);
  assert.equal(passoDa({ sl: 2 }, 7), 2);
});

test('pagina madre per ogni dettaglio, con e senza dati', () => {
  assert.equal(madre('partita', { data: '2026-10-13' }), '#/partite/2026-10-13');
  assert.equal(madre('partita', { data: null }), '#/partite');
  assert.equal(madre('squadra', { girone: { slug: 'serie-a' } }), '#/classifiche/serie-a');
  assert.equal(madre('squadra', null), '#/classifiche');
  assert.equal(madre('giocatore', { squadraId: 2480 }), '#/squadra/2480');
  assert.equal(madre('giocatore', {}), '#/giocatori');
  assert.equal(madre('partite', {}), null);
});

test('madre in archivio mantiene il prefisso', () => {
  assert.equal(prefissaHash(madre('squadra', { girone: { slug: 'serie-a' } }), '2025-26'), '#/a/2025-26/classifiche/serie-a');
});

test('tasto visibile nei dettagli sempre, altrove solo se c\'è cronologia', () => {
  assert.equal(mostraIndietro('partita', 0), true);
  assert.equal(mostraIndietro('partite', 0), false);
  assert.equal(mostraIndietro('partite', 3), true);
  assert.equal(mostraIndietro('intro', 3), false);
});
