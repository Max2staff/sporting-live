import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, formattaData, formattaDataLunga, pallinoForma } from '../util.js';

test('esc', () => assert.equal(esc('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;'));
test('date', () => {
  assert.equal(formattaData('2026-09-16'), 'mer 16/09');
  assert.equal(formattaData(null), 'da definire');
  assert.equal(formattaDataLunga('2026-09-16'), 'mercoledì 16 settembre');
});
test('forma', () => assert.equal(pallinoForma('V'), '<span class="forma V" title="vittoria">V</span>'));
test('forma escape', () => assert.equal(pallinoForma('<x>'), '<span class="forma &lt;x&gt;" title="">&lt;x&gt;</span>'));
