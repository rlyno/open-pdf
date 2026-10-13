import { Image } from 'expo-image';
import { router } from 'expo-router';
import { memo } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Button, Card, ErrorBanner, IconBadge, Label, Pill, SymbolIcon, Txt } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing, Type } from '@/constants/theme';
import { usePageThumbs, type PdfSource } from '@/hooks/use-tool';
import { useTheme } from '@/hooks/use-theme';
import { exportFile, formatBytes, shareFile, type OutputFile } from '@/lib/files';
import { t } from '@/lib/i18n';
import { openViewer } from '@/lib/navigation';

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

/** Shows the chosen PDF ("active document"), or a prompt to choose one. */
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
      <View style={[styles.empty, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <IconBadge icon={{ ios: 'doc.badge.plus', android: 'upload_file' }} color={theme.accent} size={52} />
        <Txt variant="titleSm" style={{ textAlign: 'center' }}>
          {t('Pilih dokumen PDF')}
        </Txt>
        <Txt variant="bodyMd" color="textSecondary" style={{ textAlign: 'center' }}>
          {t('Pilih file PDF dari perangkat. Semua proses berjalan di HP kamu, tanpa upload.')}
        </Txt>
        <View style={{ alignSelf: 'stretch' }}>
          <Button title={t('Pilih PDF')} onPress={onPick} loading={loading} />
        </View>
        {error && <ErrorBanner message={error} />}
      </View>
    );
  }
  const { info } = source;
  return (
    <Card style={{ padding: 12 }}>
      <View style={styles.fileRow}>
        <IconBadge icon={PDF_ICON} color={theme.accent} size={40} solid />
        <View style={{ flex: 1, gap: 2 }}>
          <Label>{t('Dokumen aktif')}</Label>
          <Txt variant="titleSm" numberOfLines={1}>
            {source.name}
          </Txt>
          <View style={styles.pills}>
            <Pill tone="neutral" label={`${t('{n} halaman', { n: info.pageCount })} · ${formatBytes(source.size)}`} />
            {info.encrypted && <Pill tone="danger" label={t('terkunci')} />}
          </View>
        </View>
        <Button title={t('Ganti')} variant="ghost" compact onPress={onPick} loading={loading} />
      </View>
      {error && <ErrorBanner message={error} />}
    </Card>
  );
}

/**
 * Thumbnail grid. Tapping a page calls `onPress`; `badge` and `rotation`
 * decorate each page (selection number, preview rotation). `tone` colours
 * the selection: indigo by default, crimson for pages about to be removed.
 */
export function PageGrid({
  source,
  selected,
  onPress,
  badge,
  rotation,
  pages,
  tone = 'accent',
}: {
  source: PdfSource;
  selected?: (index: number) => boolean;
  onPress?: (index: number) => void;
  badge?: (index: number) => string | undefined;
  rotation?: (index: number) => number;
  /** Which source pages to show, in order. Defaults to all. */
  pages?: number[];
  tone?: 'accent' | 'danger';
}) {
  const { width } = useWindowDimensions();
  const thumbs = usePageThumbs(source.uri, source.info.pageCount);
  const contentWidth = Math.min(width, MaxContentWidth) - Spacing.three * 2;
  const cols = contentWidth > 520 ? 4 : 3;
  const cell = Math.floor((contentWidth - Spacing.two * (cols - 1)) / cols);
  const list = pages ?? source.info.pageSizes.map((_, i) => i);

  return (
    <View style={[styles.grid, { gap: Spacing.two }]}>
      {list.map((pageIndex, pos) => (
        <PageCell
          key={`${pageIndex}-${pos}`}
          pageIndex={pageIndex}
          size={cell}
          thumb={thumbs[pageIndex]}
          selected={selected?.(pageIndex) ?? false}
          rotation={rotation?.(pageIndex) ?? 0}
          badge={badge?.(pageIndex)}
          tone={tone}
          onPress={onPress}
        />
      ))}
    </View>
  );
}

/**
 * One page card: page number top-left, selection mark top-right. Memoised
 * with primitive props so a newly rendered thumbnail only re-renders its own
 * card, not every page of a large document.
 */
const PageCell = memo(function PageCell({
  pageIndex,
  size,
  thumb,
  selected,
  rotation,
  badge,
  tone,
  onPress,
}: {
  pageIndex: number;
  size: number;
  thumb?: string;
  selected: boolean;
  rotation: number;
  badge?: string;
  tone: 'accent' | 'danger';
  onPress?: (index: number) => void;
}) {
  const theme = useTheme();
  const toneColor = tone === 'danger' ? theme.danger : theme.accent;
  // A sideways preview swaps its box so it still fits after rotating.
  const sideways = rotation % 180 !== 0;
  const boxW = size - 16;
  const boxH = size * 1.4 - 16;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('Halaman {n}', { n: pageIndex + 1 })}
      accessibilityState={{ selected }}
      onPress={() => onPress?.(pageIndex)}
      style={({ pressed }) => [
        styles.cell,
        {
          width: size,
          height: size * 1.4,
          backgroundColor: theme.surface,
          borderColor: selected ? toneColor : theme.border,
          borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}>
      {thumb ? (
        <Image
          source={{ uri: thumb }}
          contentFit="contain"
          style={{
            width: sideways ? boxH : boxW,
            height: sideways ? boxW : boxH,
            transform: [{ rotate: `${rotation}deg` }],
            opacity: selected && tone === 'danger' ? 0.35 : 1,
          }}
        />
      ) : (
        <Txt variant="headlineMd" color="textMuted">
          {pageIndex + 1}
        </Txt>
      )}
      <View style={[styles.pageNo, { backgroundColor: theme.surfaceLowest }]}>
        <Text style={[Type.labelSm, { color: theme.text }]}>{pageIndex + 1}</Text>
      </View>
      {(badge || selected) && (
        <View style={[styles.mark, { backgroundColor: toneColor }]}>
          {badge ? (
            <Text style={[Type.labelSm, { color: theme.accentText }]}>{badge}</Text>
          ) : (
            <SymbolIcon icon={{ ios: 'checkmark', android: 'check' }} size={12} color={theme.accentText} />
          )}
        </View>
      )}
    </Pressable>
  );
});

/** Lists files a tool produced, with share and save actions. */
export function ResultPanel({ results }: { results: OutputFile[] }) {
  const theme = useTheme();
  if (results.length === 0) return null;
  return (
    <Card style={{ borderColor: theme.success, borderWidth: 1 }}>
      <View style={styles.resultHead}>
        <SymbolIcon icon={{ ios: 'checkmark.circle.fill', android: 'check_circle' }} size={20} color={theme.success} />
        <Txt variant="titleSm" style={{ flex: 1 }}>
          {results.length > 1 ? t('Selesai · {n} file', { n: results.length }) : t('Selesai')}
        </Txt>
      </View>
      {results.map((r) => (
        <View key={r.uri} style={[styles.resultRow, { backgroundColor: theme.surfaceLowest }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityHint={r.mimeType === 'application/pdf' ? t('Ketuk untuk melihat') : undefined}
            disabled={r.mimeType !== 'application/pdf'}
            onPress={() => openViewer(r)}
            style={{ flex: 1 }}>
            <Txt variant="labelLg" numberOfLines={1}>
              {r.name}
            </Txt>
            <Txt variant="bodySm" color="textMuted">
              {r.mimeType === 'application/pdf' ? `${formatBytes(r.size)} · ${t('Ketuk untuk melihat')}` : formatBytes(r.size)}
            </Txt>
          </Pressable>
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
      <Button title={t('Lihat semua file')} variant="ghost" compact onPress={() => router.navigate('/')} />
    </Card>
  );
}

const styles = StyleSheet.create({
  empty: {
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two + 4,
  },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pills: { flexDirection: 'row', gap: 6, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pageNo: {
    position: 'absolute',
    top: 6,
    left: 6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: Radius.lg, padding: 10 },
});

type RunState = { busy: boolean; error: string | null; results: OutputFile[] };

/** The main action button of a tool. */
export function RunButton({
  title,
  onPress,
  disabled,
  run,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  run: RunState;
}) {
  return <Button title={run.busy ? t('Memproses…') : title} onPress={onPress} loading={run.busy} disabled={disabled} />;
}

/** Whatever a run produced: an error or the output files. */
export function RunOutput({ run }: { run: RunState }) {
  return (
    <>
      {run.error && <ErrorBanner message={run.error} />}
      <ResultPanel results={run.results} />
    </>
  );
}

/** The run button plus whatever the run produced, for short screens. */
export function RunSection(props: { title: string; onPress: () => void; disabled?: boolean; run: RunState }) {
  return (
    <>
      <RunButton {...props} />
      <RunOutput run={props.run} />
    </>
  );
}
