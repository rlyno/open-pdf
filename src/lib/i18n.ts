/**
 * Minimal gettext-style translation. Indonesian source text is the key, so
 * screens stay readable and an untranslated string still shows something
 * sensible. `{name}` placeholders are filled from `params`.
 *
 * Pure module (no React Native imports) so the PDF engine can use it too.
 * tests/i18n.test.ts checks that every key passed to t() has an English entry.
 */
import { EN } from './i18n-en';

export type Locale = 'id' | 'en';

let locale: Locale = 'id';

export function setLocale(next: Locale) {
  locale = next;
}

export function getLocale(): Locale {
  return locale;
}

/** BCP 47 tag for number/date formatting. */
export function localeTag() {
  return locale === 'id' ? 'id-ID' : 'en-US';
}

export function t(text: string, params?: Record<string, string | number>): string {
  const s = locale === 'en' ? (EN[text] ?? text) : text;
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}
