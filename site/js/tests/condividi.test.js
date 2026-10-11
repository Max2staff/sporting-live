import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiCondivisione } from '../views/condividi.js';

const SITO = 'https://example.github.io/sporting-live/';
const giocata = { id: 14627, giocata: true, casa: { nome: 'ALFA' }, ospite: { nome: 'BETA' }, golCasa: 2, golOspite: 1, girone: { nome: 'Serie B' } };

test('partita giocata: pagina e immagine di condivisione', () => {
  const d = datiCondivisione('partita', giocata, SITO, '#/partita/14627');
  assert.equal(d.url, SITO + 's/p/14627.html');
  assert.equal(d.immagine, SITO + 's/p/14627.jpg');
  assert.equal(d.titolo, 'ALFA 2-1 BETA');
});

test('sito senza slash finale', () => {
  assert.equal(datiCondivisione('partita', giocata, 'https://x.it/a', '#/x').url, 'https://x.it/a/s/p/14627.html');
});

test('partita non giocata: url dell app, niente immagine, data e ora', () => {
  const d = datiCondivisione('partita', { ...giocata, giocata: false, data: '2026-10-14', ora: '21:00' }, SITO, 'https://app/#/partita/1');
  assert.equal(d.url, 'https://app/#/partita/1');
  assert.equal(d.immagine, undefined);
  assert.match(d.testo, /ore 21:00/);
  assert.match(d.testo, /14/);
});

test('classifica, squadra, giocatore', () => {
  assert.equal(datiCondivisione('classifica', { nome: 'Serie B' }, SITO, '#/c').titolo, 'Classifica Serie B · Sporting Live');
  const s = datiCondivisione('squadra', { nome: 'ALFA', girone: { nome: 'Serie B' } }, SITO, '#/s');
  assert.match(s.testo, /ALFA/); assert.match(s.testo, /Serie B/); assert.equal(s.url, '#/s');
  const g = datiCondivisione('giocatore', { nome: 'ROSSI M.', squadra: 'ALFA', girone: { nome: 'Serie B' } }, SITO, '#/g');
  assert.match(g.testo, /ROSSI M\./); assert.match(g.testo, /Serie B/);
});

test('partita giocata in archivio: nessun URL s/p ne immagine, si condivide l app', () => {
  const d = datiCondivisione('partita', giocata, SITO, 'https://app/#/a/2025-26/partita/14627', true);
  assert.equal(d.url, 'https://app/#/a/2025-26/partita/14627');
  assert.equal(d.immagine, undefined);
  assert.equal(d.titolo, 'ALFA 2-1 BETA');
});
