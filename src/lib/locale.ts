import { getLocales } from 'expo-localization';

import { setLocale, type Locale } from '@/lib/i18n';
import { getPrefs, type LanguagePref } from '@/lib/prefs';

/** Indonesian devices get Indonesian, everyone else English, unless overridden. */
export function resolveLocale(pref: LanguagePref): Locale {
  if (pref !== 'system') return pref;
  return getLocales()[0]?.languageCode === 'id' ? 'id' : 'en';
}

setLocale(resolveLocale(getPrefs().language));
