import { test } from 'node:test';
import assert from 'node:assert/strict';
import { graficoAndamentoSVG } from '../grafico.js';

const serie = [7, 5, 6, 4, 3].map((pos, i) => ({ giornata: i + 1, pos, pt: i }));

test('con meno di 2 punti non disegna nulla', () => {
  assert.equal(graficoAndamentoSVG([{ giornata: 1, pos: 3, pt: 1 }], 8), '');
  assert.equal(graficoAndamentoSVG([], 8), '');
  assert.equal(graficoAndamentoSVG(undefined, 8), '');
});

test('5 punti: svg accessibile con viewBox e 5 cerchi', () => {
  const s = graficoAndamentoSVG(serie, 8);
  assert.match(s, /<svg[^>]*viewBox="0 0 \d+ \d+"/);
  assert.equal((s.match(/<circle/g) || []).length, 5);
  assert.match(s, /<title>Andamento in classifica: dalla 7ª alla 3ª posizione<\/title>/);
  assert.match(s, /width="100%"/);
});

test('asse y invertito: la posizione 1 sta più in alto (y minore)', () => {
  const s = graficoAndamentoSVG([{ giornata: 1, pos: 1 }, { giornata: 2, pos: 6 }], 6);
  const cy = [...s.matchAll(/<circle[^>]*cy="([\d.]+)"/g)].map(m => Number(m[1]));
  assert.ok(cy[0] < cy[1]);
});

test('andamento: l\'ultima giornata non si sovrappone alla penultima etichetta', () => {
  const s = Array.from({ length: 26 }, (_, i) => ({ giornata: i + 1, pos: 1 + (i % 5) }));
  const et = [...graficoAndamentoSVG(s, 14).matchAll(/text-anchor="middle">(\d+)</g)].map(m => Number(m[1]));
  assert.equal(et[et.length - 1], 26);
  assert.ok(26 - et[et.length - 2] >= 2, `etichette troppo vicine: ${et.join(',')}`);
});
