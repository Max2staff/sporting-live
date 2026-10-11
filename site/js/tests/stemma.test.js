import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iniziali, coloriStemma, stemmaHTML, PALLINI, colorePallino } from '../stemma.js';

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

test('niente stemma generato: pallino negli elenchi, nulla nei formati grandi, logo vero se c\'è', () => {
  const p = stemmaHTML({ id: 2480, nome: 'SOCKS' }, 24);
  assert.match(p, /^<span class="stemma pallino" style="background:#[0-9a-f]{6}" aria-hidden="true"><\/span>$/);
  assert.equal(p, stemmaHTML({ id: 2480, nome: 'ALTRO' }, 32));
  assert.ok(!/<svg/.test(stemmaHTML({ id: 2480, nome: 'SOCKS' }, 24)));
  assert.equal(stemmaHTML({ id: 2480, nome: 'SOCKS' }, 40), '');
  assert.equal(stemmaHTML({ id: 2480, nome: 'SOCKS' }, 72), '');
  const img = stemmaHTML({ id: 2480, nome: 'SOCKS', stemma: true }, 24);
  assert.match(img, /<img class="stemma" src="img\/stemmi\/2480\.png" width="24" height="24"/);
  assert.match(stemmaHTML({ id: 2480, nome: 'SOCKS', stemma: true }, 72), /width="72"/);
  assert.equal(stemmaHTML(null), '');
});

test('contrasto: tinte chiare più scure', () => {
  for (let id = 1; id < 400; id++) {
    const { primario } = coloriStemma(id);
    const [, h, , l] = primario.match(/^hsl\((\d+) (\d+)% (\d+)%\)$/).map(Number);
    assert.ok(h >= 40 && h <= 200 ? l === 30 : l === 40, `id ${id}: ${primario}`);
  }
});

test('pallini: tavolozza di colori distinti, stabile per squadra e ben distribuita', () => {
  assert.equal(new Set(PALLINI).size, PALLINI.length);
  assert.ok(PALLINI.length >= 10);
  assert.equal(colorePallino(2530), colorePallino(2530));
  assert.ok(PALLINI.includes(colorePallino(2530)));
  const usati = new Set(Array.from({ length: 14 }, (_, i) => colorePallino(2529 + i)));
  assert.ok(usati.size >= 8, `solo ${usati.size} colori su 14 squadre consecutive`);
});
