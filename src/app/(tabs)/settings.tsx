import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';

import { Button, Card, Label, PageHeader, Screen, Segmented, SymbolIcon, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteOutput, formatBytes, listOutputs } from '@/lib/files';
import { t } from '@/lib/i18n';
import { setPrefs, setReturnTo, usePrefs, type LanguagePref, type ThemePref } from '@/lib/prefs';

const REPO_URL = 'https://github.com/epamemo/open-pdf';

export default function SettingsScreen() {
  const theme = useTheme();
  const prefs = usePrefs();
  const [stats, setStats] = useState(() => summarize());
  useFocusEffect(useCallback(() => setStats(summarize()), []));

  function clearOutputs() {
    Alert.alert(t('Hapus semua file hasil?'), t('{n} file akan dihapus dari aplikasi.', { n: stats.count }), [
      { text: t('Batal'), style: 'cancel' },
      {
        text: t('Hapus semua'),
        style: 'destructive',
        onPress: () => {
          listOutputs().forEach((f) => deleteOutput(f.uri));
          setStats(summarize());
        },
      },
    ]);
  }

  return (
    <Screen tabBar>
      <PageHeader title={t('Pengaturan')} />

      <Card>
        <Segmented<ThemePref>
          label={t('Tema')}
          value={prefs.theme}
          onChange={(theme) => setPrefs({ theme })}
          options={[
            { value: 'system', label: t('Sistem') },
            { value: 'dark', label: t('Gelap') },
            { value: 'light', label: t('Terang') },
          ]}
        />
        <Segmented<LanguagePref>
          label={t('Bahasa')}
          value={prefs.language}
          onChange={(language) => {
            // The app remounts to re-translate; come back here afterwards.
            setReturnTo('/settings');
            setPrefs({ language });
          }}
          options={[
            { value: 'system', label: t('Sistem') },
            { value: 'id', label: 'Indonesia' },
            { value: 'en', label: 'English' },
          ]}
        />
      </Card>

      <Card>
        <Label>{t('Penyimpanan')}</Label>
        <View style={styles.row}>
          <SymbolIcon icon={{ ios: 'folder', android: 'folder' }} size={20} color={theme.textSecondary} />
          <Txt variant="bodyLg" style={{ flex: 1 }}>
            {t('File hasil')}
          </Txt>
          <Txt variant="labelLg" color="textSecondary" style={{ fontVariant: ['tabular-nums'] }}>
            {t('{n} file · {size}', { n: stats.count, size: formatBytes(stats.size) })}
          </Txt>
        </View>
        <Button
          title={t('Hapus semua file hasil')}
          variant="danger"
          icon={{ ios: 'trash', android: 'delete' }}
          disabled={stats.count === 0}
          onPress={clearOutputs}
        />
      </Card>

      <Card>
        <Label>{t('Tentang')}</Label>
        <View style={styles.row}>
          <View style={[styles.mark, { backgroundColor: theme.accent }]}>
            <SymbolIcon icon={{ ios: 'doc.text.fill', android: 'picture_as_pdf' }} size={20} color={theme.accentText} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="titleSm">Open PDF</Txt>
            <Txt variant="bodySm" color="textSecondary">
              {t('Versi {v}', { v: Constants.expoConfig?.version ?? '—' })}
            </Txt>
            <Txt variant="bodySm" color="textSecondary">
              © 2026 RLYNO · GPL-3.0
            </Txt>
          </View>
        </View>
        <Txt variant="bodyMd" color="textSecondary">
          {t('Semua proses berjalan di perangkat. Tidak ada file atau data yang dikirim ke server.')}
        </Txt>
        <Button
          title={t('Kode sumber di GitHub')}
          variant="secondary"
          icon={{ ios: 'chevron.left.forwardslash.chevron.right', android: 'code' }}
          onPress={() => Linking.openURL(REPO_URL)}
        />
      </Card>
    </Screen>
  );
}

function summarize() {
  const files = listOutputs();
  return { count: files.length, size: files.reduce((n, f) => n + f.size, 0) };
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40 },
  mark: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.half },
});
