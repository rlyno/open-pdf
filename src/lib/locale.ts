import { getLocales } from 'expo-localization';

import { setLocale } from '@/lib/i18n';

// Indonesian devices get Indonesian; everyone else gets English. Read once at
// startup, so changing the device language takes effect on the next launch.
setLocale(getLocales()[0]?.languageCode === 'id' ? 'id' : 'en');
