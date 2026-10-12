import '@/lib/polyfills';
import '@/lib/locale';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { t } from '@/lib/i18n';

// Keep the tool grid under deep-linked screens so "back" always leads home.
export const unstable_settings = { initialRouteName: '(tabs)' };

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="tool/[id]" options={{ title: '' }} />
        <Stack.Screen name="incoming" options={{ title: t('Buka file') }} />
      </Stack>
    </ThemeProvider>
  );
}
