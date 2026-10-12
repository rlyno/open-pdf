import assert from 'node:assert/strict';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { EN } from '../src/lib/i18n-en';
import { setLocale, t } from '../src/lib/i18n';
import { collectKeys } from './i18n-keys';

const keys = collectKeys(join(__dirname, '..', 'src'));

describe('i18n', () => {
  afterEach(() => setLocale('id'));

  it('has an English translation for every key used in the app', () => {
    const missing = [...keys].filter((k) => !(k in EN));
    assert.deepEqual(missing, []);
  });

  it('has no stale English entries', () => {
    const unused = Object.keys(EN).filter((k) => !keys.has(k));
    assert.deepEqual(unused, []);
  });

  it('keeps the same placeholders in both languages', () => {
    const names = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const [id, en] of Object.entries(EN)) assert.deepEqual(names(en), names(id), id);
  });

  it('translates and fills placeholders', () => {
    assert.equal(t('Halaman {n}', { n: 3 }), 'Halaman 3');
    setLocale('en');
    assert.equal(t('Halaman {n}', { n: 3 }), 'Page 3');
    assert.equal(t('Teks tanpa terjemahan'), 'Teks tanpa terjemahan');
  });
});
