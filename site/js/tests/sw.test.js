import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = fileURLToPath(new URL('../../', import.meta.url));

function jsDi(dir) {
  return readdirSync(dir).flatMap(n => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === 'tests' ? [] : jsDi(p);
    return n.endsWith('.js') ? [relative(SITE, p)] : [];
  });
}

test('ogni modulo JS del sito è nella SHELL del service worker', () => {
  const sw = readFileSync(join(SITE, 'sw.js'), 'utf8');
  const mancanti = jsDi(join(SITE, 'js')).filter(f => !sw.includes(`'${f}'`));
  assert.deepEqual(mancanti, []);
});
