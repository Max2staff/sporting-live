import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analizza, prefissaHash, prefissaLink } from '../router.js';

test('rotte', () => {
  assert.deepEqual(analizza(''), { vista: 'partite', params: [], edizione: null });
  assert.deepEqual(analizza('#/partite'), { vista: 'partite', params: [], edizione: null });
  assert.deepEqual(analizza('#/partita/14083'), { vista: 'partita', params: ['14083'], edizione: null });
  assert.deepEqual(analizza('#/squadra/2480'), { vista: 'squadra', params: ['2480'], edizione: null });
  assert.deepEqual(analizza('#/giocatore/2480-rossi-mario'), { vista: 'giocatore', params: ['2480-rossi-mario'], edizione: null });
  assert.deepEqual(analizza('#/classifiche/serie-b'), { vista: 'classifiche', params: ['serie-b'], edizione: null });
  assert.deepEqual(analizza('#/boh/x'), { vista: 'partite', params: [], edizione: null });
  assert.deepEqual(analizza('#/partite/2026-09-16'), { vista: 'partite', params: ['2026-09-16'], edizione: null });
  assert.deepEqual(analizza('#/partita/%E0%A4'), { vista: 'partita', params: ['%E0%A4'], edizione: null });
});

test('rotta intro', () => {
  assert.deepEqual(analizza('#/intro'), { vista: 'intro', params: [], edizione: null });
  assert.deepEqual(analizza('#/intro/2'), { vista: 'intro', params: ['2'], edizione: null });
});

test('rotta cerca', () => {
  assert.deepEqual(analizza('#/cerca'), { vista: 'cerca', params: [], edizione: null });
  assert.deepEqual(analizza('#/cerca/d%27este%20s'), { vista: 'cerca', params: ["d'este s"], edizione: null });
});

test('rotte d\'archivio', () => {
  assert.deepEqual(analizza('#/a/2025-26/classifiche/serie-b'), { vista: 'classifiche', params: ['serie-b'], edizione: '2025-26' });
  assert.deepEqual(analizza('#/a/estate-2026/partite'), { vista: 'partite', params: [], edizione: 'estate-2026' });
  assert.deepEqual(analizza('#/a/2025-26'), { vista: 'partite', params: [], edizione: '2025-26' });
  assert.deepEqual(analizza('#/a/2025-26/boh/x'), { vista: 'partite', params: [], edizione: '2025-26' });
  assert.deepEqual(analizza('#/a'), { vista: 'partite', params: [], edizione: null });
  assert.deepEqual(analizza('#/a/'), { vista: 'partite', params: [], edizione: null });
  assert.deepEqual(analizza('#/partite'), { vista: 'partite', params: [], edizione: null });
});

test('prefissaHash: idempotente, solo #/…', () => {
  assert.equal(prefissaHash('#/squadra/5', '2025-26'), '#/a/2025-26/squadra/5');
  assert.equal(prefissaHash('#/a/estate-2026/squadra/5', '2025-26'), '#/a/estate-2026/squadra/5');
  assert.equal(prefissaHash('#/squadra/5', null), '#/squadra/5');
  assert.equal(prefissaHash('https://x.it/', '2025-26'), 'https://x.it/');
});

test('prefissaLink su html: salta data-no-prefisso e link esterni', () => {
  const h = '<a class="x" href="#/partita/1">a</a><a href="#/partite" data-no-prefisso>b</a><a href="https://x.it/#/y">c</a><a href=\'#/giocatore/a-b\'>d</a><a href="#/a/estate-2026/partita/3">e</a>';
  const r = prefissaLink(h, '2025-26');
  assert.match(r, /href="#\/a\/2025-26\/partita\/1"/);
  assert.match(r, /<a href="#\/partite" data-no-prefisso>/);
  assert.match(r, /href="https:\/\/x.it\/#\/y"/);
  assert.match(r, /href='#\/a\/2025-26\/giocatore\/a-b'/);
  assert.match(r, /href="#\/a\/estate-2026\/partita\/3"/);
  assert.equal(prefissaLink(h, null), h);
});

test('prefissaLink su elemento DOM', () => {
  const mk = (href) => { let v = href; return { getAttribute: () => v, setAttribute: (_, n) => { v = n; }, get v() { return v; } }; };
  const a1 = mk('#/squadra/2'), a2 = mk('#/a/x/squadra/2');
  const root = { querySelectorAll: (sel) => { assert.match(sel, /:not\(\[data-no-prefisso\]\)/); return [a1, a2]; } };
  prefissaLink(root, 'e1');
  assert.equal(a1.v, '#/a/e1/squadra/2');
  assert.equal(a2.v, '#/a/x/squadra/2');
});

test('prefissaLink su html: non tocca data-href né attributi simili', () => {
  const r = prefissaLink('<a data-href="#/x" href="#/y">a</a><a data-href="#/z">b</a>', 'e1');
  assert.match(r, /data-href="#\/x"/);
  assert.match(r, / href="#\/a\/e1\/y"/);
  assert.match(r, /data-href="#\/z"/);
});
