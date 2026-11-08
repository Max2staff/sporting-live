import { test } from 'node:test';
import assert from 'node:assert/strict';
import { percorsoAnonimo, conta, leggiProvenienza } from '../visite.js';

test('percorsoAnonimo: nessun dato personale', () => {
  assert.equal(percorsoAnonimo({ vista: 'partite', params: [] }), '/partite');
  assert.equal(percorsoAnonimo({ vista: 'partita', params: ['14083'] }), '/partita');
  assert.equal(percorsoAnonimo({ vista: 'classifiche', params: ['serie-b'] }), '/classifiche/serie-b');
  assert.equal(percorsoAnonimo({ vista: 'squadra', params: ['2480'] }), '/squadra/2480');
  assert.equal(percorsoAnonimo({ vista: 'squadra', params: ['mario rossi'] }), '/squadra');
  assert.equal(percorsoAnonimo({ vista: 'giocatore', params: ['2480-rossi-mario'] }), '/giocatore');
  assert.equal(percorsoAnonimo({ vista: 'cerca', params: ['rossi mario'] }), '/cerca');
  assert.equal(percorsoAnonimo({ vista: 'vantaggi', params: [] }), '/vantaggi');
  assert.equal(percorsoAnonimo({ vista: 'classifiche', params: ['a b?x=1'] }), '/classifiche');
});

test('percorsoAnonimo: archivio', () => {
  assert.equal(percorsoAnonimo({ vista: 'partite', params: [], edizione: '2025-26' }), '/a/2025-26/partite');
  assert.equal(percorsoAnonimo({ vista: 'giocatore', params: ['x'], edizione: 'torneo-2026' }), '/a/torneo-2026/giocatore');
});

function ambiente(over = {}) {
  const inviati = [];
  class Img { set src(v) { inviati.push(v); } }
  return { inviati, env: { Image: Img, location: { hostname: 'sportinglive.it' }, navigator: { doNotTrack: null }, document: { title: 'Partite · Sporting Live' }, random: () => 0.5, ...over } };
}
const rotta = { vista: 'cerca', params: ['rossi'] };

test('conta invia il pixel con percorso e titolo codificati', () => {
  const { inviati, env } = ambiente();
  assert.equal(conta(rotta, { goatcounter: 'sportinglive' }, env), true);
  assert.equal(inviati.length, 1);
  assert.match(inviati[0], /^https:\/\/sportinglive\.goatcounter\.com\/count\?p=%2Fcerca&t=Partite%20%C2%B7%20Sporting%20Live&rnd=\w+$/);
  assert.ok(!inviati[0].includes('rossi'));
});

test('conta non invia: config vuota o assente, localhost, DNT, codice non valido', () => {
  for (const [cfg, over] of [
    [{ goatcounter: '' }, {}], [{}, {}], [null, {}],
    [{ goatcounter: 'x' }, { location: { hostname: 'localhost' } }],
    [{ goatcounter: 'x' }, { location: { hostname: '127.0.0.1' } }],
    [{ goatcounter: 'sportinglive' }, { location: { hostname: 'localhost' } }],
    [{ goatcounter: 'sportinglive' }, { navigator: { doNotTrack: '1' } }],
    [{ goatcounter: 'evil.com/x?' }, {}], [{ goatcounter: 'A_B' }, {}],
  ]) {
    const { inviati, env } = ambiente(over);
    assert.equal(conta(rotta, cfg, env), false);
    assert.equal(inviati.length, 0);
  }
});

test('provenienza da QR: inviata solo con la prima pagina e tolta dall\'indirizzo', () => {
  const sostituiti = [];
  const hist = { state: null, replaceState: (_s, _t, u) => sostituiti.push(u) };
  assert.equal(leggiProvenienza({ search: '?da=segreteria', pathname: '/sporting-live/', hash: '#/partite' }, hist), 'segreteria');
  assert.deepEqual(sostituiti, ['/sporting-live/#/partite']);
  const { inviati, env } = ambiente();
  conta(rotta, { goatcounter: 'sportinglive' }, env);
  conta(rotta, { goatcounter: 'sportinglive' }, env);
  assert.match(inviati[0], /&r=qr-segreteria&/);
  assert.doesNotMatch(inviati[1], /&r=/);
});

test('provenienza non valida o assente: niente referrer', () => {
  const hist = { state: null, replaceState: () => {} };
  assert.equal(leggiProvenienza({ search: '?da=<script>', pathname: '/', hash: '' }, hist), null);
  assert.equal(leggiProvenienza({ search: '', pathname: '/', hash: '' }, hist), null);
  const { inviati, env } = ambiente();
  conta(rotta, { goatcounter: 'sportinglive' }, env);
  assert.doesNotMatch(inviati[0], /&r=/);
});
