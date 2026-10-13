import { useColorScheme } from 'react-native';

import { Colors, type Palette } from '@/constants/theme';
import { usePrefs } from '@/lib/prefs';

/** 'dark' or 'light', honouring the user's override in Settings. */
export function useScheme(): 'dark' | 'light' {
  const system = useColorScheme();
  const { theme } = usePrefs();
  if (theme !== 'system') return theme;
  return system === 'light' ? 'light' : 'dark';
}

export function useTheme(): Palette {
  return Colors[useScheme()];
}
