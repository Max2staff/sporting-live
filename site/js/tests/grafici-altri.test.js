import { test } from 'node:test';
import assert from 'node:assert/strict';
import { graficoGolSVG, graficoGiocatoreSVG } from '../grafici/barre.js';
import { ciambellaHTML } from '../grafici/ciambella.js';
import { barreConfrontoHTML, righeConfrontoPartita } from '../grafici/confronto.js';

const P = (giornata, gf, gs, esito) => ({ giornata, gf, gs, esito });

test('gol per giornata: due barre per partita giocata, niente NaN', () => {
  const svg = graficoGolSVG([P(1, 3, 1, 'V'), P(2, 0, 0, 'N'), P(3, 1, 4, 'P'), { giornata: 4, gf: null, gs: null, esito: null }]);
  assert.equal((svg.match(/class="gr-barra su/g) || []).length, 3);
  assert.equal((svg.match(/class="gr-barra giu/g) || []).length, 3);
  assert.match(svg, /gr-v/); assert.match(svg, /gr-p/);
  assert.match(svg, /aria-label="Gol per giornata: 4 fatti e 5 subiti in 3 partite"/);
  assert.ok(!/NaN/.test(svg));
  assert.equal(graficoGolSVG([P(1, 1, 0, 'V')]), '');
  assert.equal(graficoGolSVG(undefined), '');
});

test('giocatore: barre dei gol e linea voti solo con almeno 2 voti', () => {
  const pp = [{ giornata: 1, gol: 2, voto: 7.5 }, { giornata: 2, gol: 0, voto: null }, { giornata: 3, gol: 1, voto: 6 }];
  const svg = graficoGiocatoreSVG(pp);
  assert.equal((svg.match(/class="gr-barra su/g) || []).length, 3);
  assert.match(svg, /class="gr-voti"/);
  assert.ok(!/NaN/.test(svg));
  assert.ok(!/gr-voti/.test(graficoGiocatoreSVG([{ giornata: 1, gol: 1, voto: 7 }, { giornata: 2, gol: 0, voto: null }])));
  assert.equal(graficoGiocatoreSVG([{ giornata: 1, gol: 1 }]), '');
});

test('ciambella: tre fette, totale al centro, vuota senza partite', () => {
  const h = ciambellaHTML({ v: 3, n: 1, p: 0 });
  assert.equal((h.match(/class="gr-fetta/g) || []).length, 2);
  assert.match(h, />4</);
  assert.match(h, /3 vinte/);
  assert.equal(ciambellaHTML({ v: 0, n: 0, p: 0 }), '');
  assert.equal(ciambellaHTML(null), '');
});

test('barre di confronto: meglio alto/basso, decimali con virgola, escape', () => {
  const h = barreConfrontoHTML([
    { etichetta: 'Punti', a: 9, b: 3, meglio: 'alto' },
    { etichetta: 'Posizione', a: 1, b: 7, meglio: 'basso' },
    { etichetta: 'Media', a: 1.5, b: 1.25, meglio: 'alto', decimali: 1 },
    { etichetta: 'Saltata', a: null, b: 2, meglio: 'alto' }], { nomeA: 'EASY M&M', nomeB: 'B' });
  assert.equal((h.match(/class="cf-riga"/g) || []).length, 3);
  assert.equal((h.match(/cf-val a meglio/g) || []).length, 3);
  assert.match(h, /1,5/);
  assert.match(h, /EASY M&amp;M/);
  assert.equal(barreConfrontoHTML([], { nomeA: 'A', nomeB: 'B' }), '');
});

test('righe confronto partita: punti ultime 5 dalla forma, precedenti se ci sono', () => {
  const p = { confronto: { casa: { pos: 2, pt: 10, g: 4, gf: 9, gs: 3, forma: ['V', 'V', 'N', 'P'] }, ospite: { pos: 5, pt: 4, g: 4, gf: 5, gs: 8, forma: ['P', 'N', 'V', 'P'] } },
    precedenti: { bilancio: { casa: 2, pari: 1, ospite: 0 } } };
  const r = righeConfrontoPartita(p);
  assert.deepEqual(r.map(x => x.etichetta), ['Posizione', 'Punti', 'Gol fatti', 'Gol subiti', 'Punti nelle ultime 5', 'Vittorie nei precedenti']);
  assert.deepEqual(r.find(x => x.etichetta === 'Punti nelle ultime 5'), { etichetta: 'Punti nelle ultime 5', a: 7, b: 4, meglio: 'alto' });
  assert.deepEqual(righeConfrontoPartita({ confronto: null }), []);
});

test('barre "meno è meglio": la barra più lunga va al valore migliore', () => {
  const larghezze = (h) => [...h.matchAll(/width:(\d+)%/g)].map(m => Number(m[1]));
  assert.deepEqual(larghezze(barreConfrontoHTML([{ etichetta: 'Posizione', a: 13, b: 1, meglio: 'basso' }], { nomeA: 'A', nomeB: 'B' })), [8, 100]);
  assert.deepEqual(larghezze(barreConfrontoHTML([{ etichetta: 'Gol subiti', a: 0, b: 4, meglio: 'basso' }], { nomeA: 'A', nomeB: 'B' })), [100, 0]);
  assert.deepEqual(larghezze(barreConfrontoHTML([{ etichetta: 'Punti', a: 0, b: 12, meglio: 'alto' }], { nomeA: 'A', nomeB: 'B' })), [0, 100]);
});

test('confronto partita assente se una squadra non ha ancora giocato', () => {
  const lato = (g) => ({ pos: 4, pt: 0, g, gf: 0, gs: 0, forma: [] });
  assert.deepEqual(righeConfrontoPartita({ confronto: { casa: lato(0), ospite: lato(0) } }), []);
  assert.deepEqual(righeConfrontoPartita({ confronto: { casa: lato(1), ospite: lato(0) } }), []);
  assert.equal(righeConfrontoPartita({ confronto: { casa: lato(1), ospite: lato(1) } }).length, 5);
});
