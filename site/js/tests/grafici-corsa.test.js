import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tacche, scala, num } from '../grafici/base.js';
import { graficoCorsaSVG, legendaHTML, serieTitolo, serieMarcatori } from '../grafici/corsa.js';

const g = {
  classifica: { totale: [
    { squadraId: 1, nome: 'ALFA', pos: 1 }, { squadraId: 2, nome: 'EASY M&M', pos: 2 },
    { squadraId: 3, nome: 'GAMMA', pos: 3 }, { squadraId: 4, nome: 'DELTA', pos: 4 }, { squadraId: 5, nome: 'EPS', pos: 5 }] },
  andamento: {
    1: [{ giornata: 1, pt: 3 }, { giornata: 2, pt: 6 }], 2: [{ giornata: 1, pt: 1 }, { giornata: 2, pt: 4 }],
    3: [{ giornata: 1, pt: 1 }, { giornata: 2, pt: 2 }], 4: [{ giornata: 1, pt: 0 }, { giornata: 2, pt: 1 }],
    5: [{ giornata: 1, pt: 0 }, { giornata: 2, pt: 0 }] },
  corsaMarcatori: { giornate: [1, 2], marcatori: [{ slug: '1-rossi', nome: 'ROSSI', squadraId: 1, gol: [2, 3] }, { slug: '2-verdi', nome: 'VERDI', squadraId: 2, gol: [0, 2] }] },
};

test('base: numeri, scala, tacche', () => {
  assert.equal(num('3'), 3); assert.equal(num(null), null); assert.equal(num('x'), null);
  assert.equal(scala(0, 10, 0, 100)(5), 50);
  assert.equal(scala(2, 2, 0, 100)(2), 0);
  assert.deepEqual(tacche(0), [0]);
  assert.deepEqual(tacche(6), [0, 2, 4, 6]);
  assert.deepEqual(tacche(7), [0, 2, 4, 6, 8]);
});

test('serie titolo: classi, ordine di disegno (podio sopra), preferite', () => {
  const { xs, serie } = serieTitolo(g, [4]);
  assert.deepEqual(xs, [1, 2]);
  assert.deepEqual(serie.map(s => [s.id, s.classe]), [[5, 'c-altro'], [4, 'c-pref'], [3, 'c-p3'], [2, 'c-p2'], [1, 'c-p1']]);
  assert.deepEqual(serie.find(s => s.id === 1).valori, [3, 6]);
});

test('svg corsa: una linea per serie, accessibile, nomi con escape, niente NaN', () => {
  const { xs, serie } = serieTitolo(g, []);
  const svg = graficoCorsaSVG(xs, serie, { titolo: 'Corsa al titolo' });
  assert.equal((svg.match(/class="gr-linea"/g) || []).length, 5);
  assert.match(svg, /role="img"/);
  assert.match(svg, /aria-label="Corsa al titolo"/);
  assert.match(svg, /EASY M&amp;M/);
  assert.ok(!/NaN/.test(svg));
  assert.match(legendaHTML(serie), /data-serie="1"/);
});

test('svg corsa: vuoto con meno di 2 giornate o senza dati', () => {
  assert.equal(graficoCorsaSVG([1], [{ id: 1, nome: 'A', valori: [3] }]), '');
  assert.equal(graficoCorsaSVG([1, 2], []), '');
  assert.equal(graficoCorsaSVG(serieTitolo({ classifica: { totale: [] }, andamento: {} }, []).xs, []), '');
  assert.deepEqual(serieTitolo({ classifica: { totale: [] } }, []).xs, []);
});

test('marcatori: gradini e classi c-m1..', () => {
  const { xs, serie } = serieMarcatori(g);
  assert.deepEqual(xs, [1, 2]);
  assert.deepEqual(serie.map(s => s.classe), ['c-m2', 'c-m1']);
  const svg = graficoCorsaSVG(xs, serie, { gradini: true, titolo: 'Marcatori' });
  assert.match(svg, /H[\d.]+V[\d.]+/);
  assert.deepEqual(serieMarcatori({}).serie, []);
});

test('asse x: l\'ultima etichetta non si sovrappone alla penultima', () => {
  const xs = Array.from({ length: 26 }, (_, i) => i + 1);
  const svg = graficoCorsaSVG(xs, [{ id: 1, nome: 'A', valori: xs }]);
  const et = [...svg.matchAll(/text-anchor="middle">(\d+)</g)].map(m => Number(m[1]));
  assert.equal(et[et.length - 1], 26);
  assert.ok(26 - et[et.length - 2] >= 2, `etichette troppo vicine: ${et.join(',')}`);
});
