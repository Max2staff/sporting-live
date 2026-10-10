import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iniziali, coloriStemma, stemmaHTML } from '../stemma.js';

test('iniziali', () => {
  assert.equal(iniziali('SOCKS'), 'SO');
  assert.equal(iniziali('F.C. PELIGROS'), 'PE');
  assert.equal(iniziali('R.S.M. CARPENEDO'), 'CA');
  assert.equal(iniziali('REAL GNECA MIAMI'), 'GM');
  assert.equal(iniziali('EASY M&M'), 'EM');
  assert.equal(iniziali("AUTOSANDONA'"), 'AU');
  assert.equal(iniziali('6 GOMME SCORZE'), '6G');
  assert.equal(iniziali('NZ'), 'NZ');
  assert.equal(iniziali(''), '?');
  assert.equal(iniziali(null), '?');
});

test('colori stabili e diversi', () => {
  assert.deepEqual(coloriStemma(2480), coloriStemma(2480));
  assert.notEqual(coloriStemma(1).primario, coloriStemma(2).primario);
  assert.ok([0, 1, 2].includes(coloriStemma(2480).motivo));
  assert.match(coloriStemma(7).primario, /^hsl\(\d+ \d+% \d+%\)$/);
});

test('stemma generato o immagine', () => {
  const svg = stemmaHTML({ id: 2480, nome: 'SOCKS' }, 40);
  assert.match(svg, /^<svg class="stemma"/);
  assert.match(svg, />SO</);
  assert.match(svg, /aria-hidden="true"/);
  const img = stemmaHTML({ id: 2480, nome: 'SOCKS', stemma: true }, 24);
  assert.match(img, /<img class="stemma" src="img\/stemmi\/2480\.png" width="24" height="24"/);
  assert.equal(stemmaHTML(null), '');
  assert.ok(!stemmaHTML({ id: 1, nome: '<b>x</b>' }).includes('<b>'));
});

test('contrasto: tinte chiare più scure', () => {
  for (let id = 1; id < 400; id++) {
    const { primario } = coloriStemma(id);
    const [, h, , l] = primario.match(/^hsl\((\d+) (\d+)% (\d+)%\)$/).map(Number);
    assert.ok(h >= 40 && h <= 200 ? l === 30 : l === 40, `id ${id}: ${primario}`);
  }
});
