import { localeTag, t } from '@/lib/i18n';

/** "baru saja", "5 mnt lalu", "3 jam lalu", "kemarin", or a short date. */
export function relativeTime(ms: number, now = Date.now()): string {
  const s = Math.max(0, (now - ms) / 1000);
  if (s < 60) return t('baru saja');
  if (s < 3600) return t('{n} mnt lalu', { n: Math.floor(s / 60) });
  if (s < 86400) return t('{n} jam lalu', { n: Math.floor(s / 3600) });
  if (s < 172800) return t('kemarin');
  return new Date(ms).toLocaleDateString(localeTag(), { day: 'numeric', month: 'short', year: 'numeric' });
}
