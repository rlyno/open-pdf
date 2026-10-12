import { setPendingUri } from '@/lib/incoming';

/**
 * Rewrites links the OS hands us into app routes:
 * - files shared from another app's share sheet arrive as an `expo-sharing` link;
 * - "Open with Open PDF" (Android) / "Open in" (iOS) arrive as a content:// or
 *   file:// URI of the document itself.
 * Both land on /incoming, which lets the user pick a tool.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (/^(content|file):\/\//i.test(path)) {
      setPendingUri(path);
      return '/incoming';
    }
    if (new URL(path, 'openpdf://app').hostname === 'expo-sharing') {
      return '/incoming';
    }
    return path;
  } catch {
    // Never throw here: an unreadable link should just open the home screen.
    return '/';
  }
}
