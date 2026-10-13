import '@/lib/polyfills';
// Imported first on purpose: sets the app language before any screen loads.
import { resolveLocale } from '@/lib/locale';

import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Font, Type } from '@/constants/theme';
import { useScheme, useTheme } from '@/hooks/use-theme';
import { getLocale, setLocale, t } from '@/lib/i18n';
import { usePrefs } from '@/lib/prefs';

SplashScreen.preventAutoHideAsync();

// Keep the tool grid under deep-linked screens so "back" always leads home.
export const unstable_settings = { initialRouteName: '(tabs)' };

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const scheme = useScheme();
  const theme = useTheme();
  const { language } = usePrefs();

  // Apply a language change from Settings before anything below renders.
  const locale = resolveLocale(language);
  if (getLocale() !== locale) setLocale(locale);

  const ready = fontsLoaded || !!fontError;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.background);
  }, [theme.background]);

  if (!ready) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme: Theme = {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.accent,
      background: theme.background,
      card: theme.background,
      text: theme.text,
      border: theme.border,
    },
    fonts: {
      regular: { fontFamily: Font.regular, fontWeight: '400' },
      medium: { fontFamily: Font.medium, fontWeight: '500' },
      bold: { fontFamily: Font.semibold, fontWeight: '600' },
      heavy: { fontFamily: Font.bold, fontWeight: '700' },
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {/* Keyed by language so every translated string re-renders on change. */}
      <GestureHandlerRootView key={locale} style={{ flex: 1, backgroundColor: theme.background }}>
        <Stack
          screenOptions={{
            headerBackButtonDisplayMode: 'minimal',
            headerShadowVisible: false,
            headerTitleStyle: { ...Type.titleSm, color: theme.text },
            headerTintColor: theme.text,
            headerStyle: { backgroundColor: theme.background },
            contentStyle: { backgroundColor: theme.background },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="tool/[id]" options={{ title: '' }} />
          <Stack.Screen name="incoming" options={{ title: t('Buka file') }} />
          <Stack.Screen name="viewer" options={{ title: '' }} />
        </Stack>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
