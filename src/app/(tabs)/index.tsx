import Constants from 'expo-constants';
import { Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionSheet, type SheetAction } from '@/components/action-sheet';
import { saveWithFeedback } from '@/components/pdf-parts';
import { ToolTile } from '@/components/tool-card';
import { Button, Card, Chip, PageHeader, Pill, Screen, SymbolIcon, Txt, type Icon } from '@/components/ui';
import { Radius, Spacing, TabBarClearance, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteOutput, formatBytes, listOutputs, pickPdfs, shareFile, type OutputFile } from '@/lib/files';
import { relativeTime } from '@/lib/format';
import { t } from '@/lib/i18n';
import { setPendingFiles } from '@/lib/incoming';
import { openViewer } from '@/lib/navigation';
import { canRender, renderPage } from '@/lib/render';
import { TOOLS } from '@/lib/tools';

type Filter = 'all' | 'pdf' | 'other';

const ICONS = {
  pdf: { ios: 'doc.fill', android: 'picture_as_pdf' },
  zip: { ios: 'doc.zipper', android: 'folder_zip' },
  image: { ios: 'photo', android: 'image' },
} as const;

const kindOf = (f: OutputFile) =>
  f.mimeType === 'application/pdf' ? 'pdf' : f.mimeType === 'application/zip' ? 'zip' : 'image';

/** Home: privacy status, quick tools, device storage and recent results. */
export default function FilesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [files, setFiles] = useState<OutputFile[]>(listOutputs);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [menuFor, setMenuFor] = useState<OutputFile | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const refresh = useCallback(() => setFiles(listOutputs()), []);
  useFocusEffect(refresh);

  const q = query.trim().toLowerCase();
  const shown = files.filter(
    (f) =>
      (!q || f.name.toLowerCase().includes(q)) &&
      (filter === 'all' || (filter === 'pdf') === (kindOf(f) === 'pdf'))
  );
  const used = files.reduce((n, f) => n + f.size, 0);
  const total = Paths.totalDiskSpace;
  const free = Paths.availableDiskSpace;
  const quick = TOOLS.filter((tool) => tool.quick);

  function openWithTool(f: OutputFile) {
    setPendingFiles([{ uri: f.uri, name: f.name, size: f.size }]);
    router.push('/incoming');
  }

  function confirmDelete(f: OutputFile) {
    Alert.alert(t('Hapus file?'), f.name, [
      { text: t('Batal'), style: 'cancel' },
      {
        text: t('Hapus'),
        style: 'destructive',
        onPress: () => {
          deleteOutput(f.uri);
          refresh();
        },
      },
    ]);
  }

  async function openPdf() {
    const picked = await pickPdfs(true);
    if (!picked.length) return;
    setPendingFiles(picked);
    router.push('/incoming');
  }

  const fileActions: SheetAction[] = menuFor
    ? [
        ...(kindOf(menuFor) === 'pdf'
          ? [
              { label: t('Lihat'), icon: { ios: 'eye', android: 'visibility' } as Icon, onPress: () => openViewer(menuFor) },
              { label: t('Proses dengan alat…'), icon: { ios: 'wand.and.stars', android: 'auto_fix_high' } as Icon, onPress: () => openWithTool(menuFor) },
            ]
          : []),
        { label: t('Bagikan'), icon: { ios: 'square.and.arrow.up', android: 'share' }, onPress: () => shareFile(menuFor) },
        { label: t('Simpan ke perangkat'), icon: { ios: 'square.and.arrow.down', android: 'download' }, onPress: () => saveWithFeedback(menuFor) },
        { label: t('Hapus'), icon: { ios: 'trash', android: 'delete' }, destructive: true, onPress: () => confirmDelete(menuFor) },
      ]
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Screen tabBar>
        <PageHeader title={t('File')} />

        {/* Privacy & engine status */}
        <Card style={styles.banner}>
          <View style={[styles.bannerIcon, { backgroundColor: theme.accentSoft }]}>
            <SymbolIcon icon={{ ios: 'lock.shield.fill', android: 'shield_lock' }} size={20} color={theme.accentOnSurface} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.row}>
              <View style={[styles.liveDot, { backgroundColor: theme.accentOnSurface }]} />
              <Txt variant="labelSm" style={{ color: theme.accentOnSurface, textTransform: 'uppercase' }}>
                {t('Privasi offline')}
              </Txt>
            </View>
            <Txt variant="bodySm" color="textSecondary" numberOfLines={1}>
              {t('Diproses di perangkat · Tanpa upload')}
            </Txt>
          </View>
          {Constants.expoConfig?.version && <Pill tone="neutral" label={`v${Constants.expoConfig.version}`} />}
        </Card>

        {/* Search & filters */}
        <View style={[styles.search, { backgroundColor: theme.surfaceLowest, borderColor: theme.border }]}>
          <SymbolIcon icon={{ ios: 'magnifyingglass', android: 'search' }} size={18} color={theme.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('Cari nama file…')}
            placeholderTextColor={theme.textMuted}
            clearButtonMode="while-editing"
            autoCorrect={false}
            style={[Type.bodyMd, styles.searchInput, { color: theme.text }]}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label={t('Semua file')} icon={{ ios: 'folder.fill', android: 'folder' }} selected={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label="PDF" icon={ICONS.pdf} selected={filter === 'pdf'} onPress={() => setFilter('pdf')} />
          <Chip label={t('Gambar & ZIP')} icon={ICONS.image} selected={filter === 'other'} onPress={() => setFilter('other')} />
        </ScrollView>

        {/* Quick tools */}
        <Card style={{ gap: 12 }}>
          <View style={styles.row}>
            <SymbolIcon icon={{ ios: 'wand.and.stars', android: 'auto_fix_high' }} size={20} color={theme.accentOnSurface} />
            <Txt variant="titleSm" style={{ flex: 1 }}>
              {t('Alat cepat')}
            </Txt>
            <Pressable accessibilityRole="link" onPress={() => router.navigate('/tools')} hitSlop={8} style={styles.row}>
              <Txt variant="labelMd" style={{ color: theme.accentOnSurface }}>
                {t('Semua alat')}
              </Txt>
              <SymbolIcon icon={{ ios: 'chevron.right', android: 'chevron_right' }} size={14} color={theme.accentOnSurface} />
            </Pressable>
          </View>
          {[0, 2].map((start) => (
            <View key={start} style={styles.tileRow}>
              {quick.slice(start, start + 2).map((tool) => (
                <ToolTile key={tool.id} tool={tool} onPress={() => router.push({ pathname: '/tool/[id]', params: { id: tool.id } })} />
              ))}
            </View>
          ))}
        </Card>

        {/* Device storage */}
        <Card style={{ gap: Spacing.two }}>
          <View style={styles.row}>
            <SymbolIcon icon={{ ios: 'internaldrive', android: 'storage' }} size={18} color={theme.textSecondary} />
            <Txt variant="labelLg" style={{ flex: 1 }}>
              {t('Penyimpanan perangkat')}
            </Txt>
            <Txt variant="labelMd" color="textSecondary" style={{ fontVariant: ['tabular-nums'] }}>
              {t('{free} tersisa', { free: formatBytes(free) })}
            </Txt>
          </View>
          <View style={[styles.track, { backgroundColor: theme.surfaceHigh }]}>
            <View
              style={[
                styles.fill,
                { backgroundColor: theme.accentOnSurface, width: `${total > 0 ? Math.min(100, ((total - free) / total) * 100) : 0}%` },
              ]}
            />
          </View>
          <View style={styles.row}>
            <Txt variant="labelMd" color="textSecondary" style={{ flex: 1 }}>
              {t('{n} file hasil · {size}', { n: files.length, size: formatBytes(used) })}
            </Txt>
            <Txt variant="labelMd" style={{ color: theme.accentOnSurface }}>
              {t('100% lokal')}
            </Txt>
          </View>
        </Card>

        {/* Recent results */}
        <View style={styles.row}>
          <Txt variant="headlineMd">{t('Dokumen terbaru')}</Txt>
          <Pill tone="neutral" label={String(shown.length)} />
        </View>
        {files.length === 0 ? (
          <Card style={{ alignItems: 'center', paddingVertical: Spacing.four }}>
            <SymbolIcon icon={{ ios: 'tray', android: 'inbox' }} size={32} color={theme.textMuted} />
            <Txt variant="bodyMd" color="textSecondary" style={{ textAlign: 'center' }}>
              {t('Belum ada hasil. File yang kamu buat dengan alat-alat akan muncul di sini.')}
            </Txt>
            <Button title={t('Buka PDF')} compact onPress={openPdf} />
          </Card>
        ) : shown.length === 0 ? (
          <Txt variant="bodyMd" color="textSecondary">
            {t('Tidak ada file yang cocok.')}
          </Txt>
        ) : (
          shown.map((f) => (
            <FileRow
              key={f.uri}
              file={f}
              onOpen={() => (kindOf(f) === 'pdf' ? openViewer(f) : setMenuFor(f))}
              onMenu={() => setMenuFor(f)}
            />
          ))
        )}
      </Screen>

      {/* New document */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('Buka dokumen baru')}
        onPress={() => setAddOpen(true)}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.accent, bottom: insets.bottom + TabBarClearance, transform: [{ scale: pressed ? 0.94 : 1 }] },
        ]}>
        <SymbolIcon icon={{ ios: 'plus', android: 'add' }} size={28} color={theme.accentText} />
      </Pressable>

      <ActionSheet visible={!!menuFor} title={menuFor?.name} actions={fileActions} onClose={() => setMenuFor(null)} />
      <ActionSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        actions={[
          { label: t('Buka PDF'), icon: { ios: 'doc.badge.plus', android: 'upload_file' }, onPress: openPdf },
          {
            label: t('Gambar ke PDF'),
            icon: { ios: 'photo.on.rectangle', android: 'image' },
            onPress: () => router.push({ pathname: '/tool/[id]', params: { id: 'images-to-pdf' } }),
          },
        ]}
      />
    </View>
  );
}

const thumbCache = new Map<string, string>();

/** Recent document card with a first-page preview for PDFs. */
function FileRow({ file, onOpen, onMenu }: { file: OutputFile; onOpen: () => void; onMenu: () => void }) {
  const theme = useTheme();
  const kind = kindOf(file);
  const [thumb, setThumb] = useState(() => thumbCache.get(file.uri));

  useEffect(() => {
    if (kind !== 'pdf' || thumbCache.has(file.uri) || !canRender()) return;
    let active = true;
    renderPage(file.uri, 0, { maxWidth: 120, maxHeight: 160, quality: 70 })
      .then((r) => {
        thumbCache.set(file.uri, r.uri);
        if (active) setThumb(r.uri);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [file.uri, kind]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={file.name}
      onPress={onOpen}
      style={({ pressed }) => [
        styles.fileRow,
        { backgroundColor: theme.surface, borderColor: theme.border, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}>
      <View style={[styles.preview, { backgroundColor: theme.surfaceHigh }]}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" />
        ) : (
          <SymbolIcon icon={ICONS[kind]} size={22} color={theme.textMuted} />
        )}
        <View style={[styles.previewTag, { backgroundColor: theme.accent }]}>
          <Txt variant="labelSm" style={{ color: theme.accentText }}>
            {kind.toUpperCase()}
          </Txt>
        </View>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Txt variant="titleSm" numberOfLines={1}>
          {file.name}
        </Txt>
        <Txt variant="bodySm" color="textSecondary">
          {formatBytes(file.size)} · {relativeTime(file.modified)}
        </Txt>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Opsi')} onPress={onMenu} hitSlop={10} style={styles.more}>
        <SymbolIcon icon={{ ios: 'ellipsis', android: 'more_vert' }} size={20} color={theme.textSecondary} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: undefined },
  bannerIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 46,
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, height: '100%' },
  chips: { gap: 6 },
  tileRow: { flexDirection: 'row', gap: Spacing.two },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  preview: {
    width: 52,
    height: 64,
    borderRadius: Radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTag: { position: 'absolute', bottom: 4, borderRadius: 4, paddingHorizontal: 4 },
  more: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
});
