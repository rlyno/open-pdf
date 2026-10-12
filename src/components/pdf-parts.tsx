import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Alert, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Body, Button, Card, ErrorBanner, IconBadge, Label } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { usePageThumbs, type PdfSource } from '@/hooks/use-tool';
import { useTheme } from '@/hooks/use-theme';
import { exportFile, formatBytes, shareFile, type OutputFile } from '@/lib/files';
import { t } from '@/lib/i18n';

const PDF_ICON = { ios: 'doc.fill', android: 'picture_as_pdf' } as const;

/** Exports a file and tells the user how it went (iOS uses the share sheet). */
export async function saveWithFeedback(file: OutputFile) {
  try {
    const saved = await exportFile(file);
    if (saved && Platform.OS === 'android') Alert.alert(t('Tersimpan'), t('{name} berhasil disimpan.', { name: file.name }));
  } catch (e) {
    Alert.alert(t('Gagal menyimpan'), (e as Error)?.message ?? String(e));
  }
}

/** Shows the chosen PDF, or a prompt to choose one. */
export function SourceCard({
  source,
  onPick,
  loading,
  error,
}: {
  source: PdfSource | null;
  onPick: () => void;
  loading?: boolean;
  error?: string | null;
}) {
  const theme = useTheme();
  if (!source) {
    return (
      <Card>
        <Body secondary>{t('Pilih file PDF dari perangkat. Semua proses berjalan di HP kamu, tanpa upload.')}</Body>
        <Button title={t('Pilih PDF')} icon={{ ios: 'doc.badge.plus', android: 'upload_file' }} onPress={onPick} loading={loading} />
        {error && <ErrorBanner message={error} />}
      </Card>
    );
  }
  const { info } = source;
  return (
    <Card>
      <View style={styles.fileRow}>
        <IconBadge icon={PDF_ICON} color={theme.accent} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={2} style={[styles.fileName, { color: theme.text }]}>
            {source.name}
          </Text>
          <Text style={{ color: theme.textSecondary }}>
            {t('{n} halaman', { n: info.pageCount })} · {formatBytes(source.size)}
            {info.encrypted ? ` · ${t('terkunci')}` : ''}
          </Text>
        </View>
        <Button title={t('Ganti')} variant="secondary" compact onPress={onPick} loading={loading} />
      </View>
      {error && <ErrorBanner message={error} />}
    </Card>
  );
}

/**
 * Thumbnail grid. Tapping a page calls `onPress`; `badge` and `rotation`
 * decorate each page (selection number, preview rotation).
 */
export function PageGrid({
  source,
  selected,
  onPress,
  badge,
  rotation,
  pages,
}: {
  source: PdfSource;
  selected?: (index: number) => boolean;
  onPress?: (index: number) => void;
  badge?: (index: number) => string | undefined;
  rotation?: (index: number) => number;
  /** Which source pages to show, in order. Defaults to all. */
  pages?: number[];
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const thumbs = usePageThumbs(source.uri, source.info.pageCount);
  const contentWidth = Math.min(width, MaxContentWidth) - Spacing.three * 2;
  const cols = contentWidth > 520 ? 4 : 3;
  const cell = Math.floor((contentWidth - Spacing.two * (cols - 1)) / cols);
  const list = pages ?? source.info.pageSizes.map((_, i) => i);

  return (
    <View style={[styles.grid, { gap: Spacing.two }]}>
      {list.map((pageIndex, pos) => {
        const isSel = selected?.(pageIndex) ?? false;
        const rot = rotation?.(pageIndex) ?? 0;
        // A sideways preview swaps its box so it still fits after rotating.
        const sideways = rot % 180 !== 0;
        const boxW = cell - 8;
        const boxH = cell * 1.5 - 8;
        const label = badge?.(pageIndex);
        return (
          <Pressable
            key={`${pageIndex}-${pos}`}
            accessibilityRole="button"
            accessibilityLabel={t('Halaman {n}', { n: pageIndex + 1 })}
            accessibilityState={{ selected: isSel }}
            onPress={() => onPress?.(pageIndex)}
            style={{ width: cell, alignItems: 'center', gap: 4 }}>
            <View
              style={[
                styles.thumb,
                {
                  width: cell,
                  height: cell * 1.5,
                  borderColor: isSel ? theme.accent : theme.border,
                  borderWidth: isSel ? 3 : 1,
                  backgroundColor: theme.background,
                },
              ]}>
              {thumbs[pageIndex] ? (
                <Image
                  source={{ uri: thumbs[pageIndex] }}
                  contentFit="contain"
                  style={{
                    width: sideways ? boxH : boxW,
                    height: sideways ? boxW : boxH,
                    transform: [{ rotate: `${rot}deg` }],
                  }}
                />
              ) : (
                <Text style={{ color: theme.textSecondary, fontSize: 20, fontWeight: '600' }}>{pageIndex + 1}</Text>
              )}
              {label && (
                <View style={[styles.badge, { backgroundColor: theme.accent }]}>
                  <Text style={styles.badgeText}>{label}</Text>
                </View>
              )}
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{pageIndex + 1}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Lists files a tool produced, with share and save actions. */
export function ResultPanel({ results }: { results: OutputFile[] }) {
  const theme = useTheme();
  if (results.length === 0) return null;
  return (
    <Card style={{ borderWidth: 1, borderColor: theme.success }}>
      <Label>{results.length > 1 ? t('Selesai · {n} file', { n: results.length }) : t('Selesai')}</Label>
      {results.map((r) => (
        <View key={r.uri} style={styles.resultRow}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={[styles.fileName, { color: theme.text }]}>
              {r.name}
            </Text>
            <Text style={{ color: theme.textSecondary }}>{formatBytes(r.size)}</Text>
          </View>
          <Button
            title={t('Bagikan')}
            compact
            variant="secondary"
            icon={{ ios: 'square.and.arrow.up', android: 'share' }}
            onPress={() => shareFile(r)}
          />
          <Button
            title={t('Simpan')}
            compact
            icon={{ ios: 'square.and.arrow.down', android: 'download' }}
            onPress={() => saveWithFeedback(r)}
          />
        </View>
      ))}
      <Button title={t('Lihat semua file')} variant="secondary" onPress={() => router.navigate('/files')} />
    </Card>
  );
}

const styles = StyleSheet.create({
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  fileName: { fontSize: 16, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  thumb: { borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});

/** The run button plus whatever the run produced (error or files). */
export function RunSection({
  title,
  onPress,
  disabled,
  run,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  run: { busy: boolean; error: string | null; results: OutputFile[] };
}) {
  return (
    <>
      <Button title={run.busy ? t('Memproses…') : title} onPress={onPress} loading={run.busy} disabled={disabled} />
      {run.error && <ErrorBanner message={run.error} />}
      <ResultPanel results={run.results} />
    </>
  );
}
