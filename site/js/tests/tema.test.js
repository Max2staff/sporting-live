import { test } from 'node:test';
import assert from 'node:assert/strict';

function finto() {
  const attr = {};
  globalThis.document = { documentElement: { setAttribute: (k, v) => { attr[k] = v; }, removeAttribute: (k) => { delete attr[k]; } } };
  return attr;
}

test('tema scuro di default, chiaro e auto', async () => {
  const attr = finto();
  const { leggiTema, impostaTema, applicaTema } = await import('../tema.js');
  assert.equal(leggiTema(), 'scuro');
  applicaTema();
  assert.equal(attr['data-theme'], 'dark');
  impostaTema('chiaro');
  assert.equal(attr['data-theme'], 'light');
  impostaTema('auto');
  assert.equal(attr['data-theme'], undefined);
  delete globalThis.document;
});
