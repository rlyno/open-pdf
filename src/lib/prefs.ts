import { File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';

export type ThemePref = 'system' | 'dark' | 'light';
export type LanguagePref = 'system' | 'id' | 'en';
export type Prefs = { theme: ThemePref; language: LanguagePref };

const DEFAULTS: Prefs = { theme: 'system', language: 'system' };
const FILE = new File(Paths.document, 'settings.json');

function load(): Prefs {
  try {
    if (FILE.exists) return { ...DEFAULTS, ...JSON.parse(FILE.textSync()) };
  } catch {
    // Corrupt or unreadable settings: fall back to defaults.
  }
  return DEFAULTS;
}

let prefs = load();
const listeners = new Set<() => void>();

export function getPrefs() {
  return prefs;
}

export function setPrefs(patch: Partial<Prefs>) {
  prefs = { ...prefs, ...patch };
  try {
    if (!FILE.exists) FILE.create();
    FILE.write(JSON.stringify(prefs));
  } catch {
    // Keep the in-memory value even if saving fails.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** User preferences, re-rendering the caller when they change. */
export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, getPrefs);
}

/**
 * A language change remounts the app (so every string re-translates), which
 * resets navigation; the tab layout reads this to return to where the user was.
 */
let returnTo: string | null = null;

export function setReturnTo(path: string) {
  returnTo = path;
}

export function takeReturnTo() {
  const path = returnTo;
  returnTo = null;
  return path;
}
