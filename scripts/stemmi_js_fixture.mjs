// Genera la fixture di parità JS -> Python per gli stemmi.
// Uso: node scripts/stemmi_js_fixture.mjs
import { writeFileSync } from 'node:fs';
import { iniziali, coloriStemma } from '../site/js/stemma.js';

const ids = [1, 7, 2480, 2532, 99999];
const nomi = ['SOCKS', "F.C. BECK'S", '6 GOMME SCORZE', 'EASY M&M', 'IMPRESA EDILE GABRIELI', 'NZ', 'S.GIORGIO', "D'ESTE"];
const out = {
  colori: ids.map(id => ({ id, ...coloriStemma(id) })),
  iniziali: nomi.map(nome => ({ nome, iniziali: iniziali(nome) })),
};
const dest = new URL('../scraper/tests/fixtures/stemmi_js.json', import.meta.url);
writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
console.log('scritto', dest.pathname);
