import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageZoom } from '@/components/page-zoom';
import { Button, ErrorBanner, Pill, Screen, SymbolIcon, Txt, type Icon } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing, Type } from '@/constants/theme';
import { usePageImages } from '@/hooks/use-page-images';
import { messageOf, usePageThumbs } from '@/hooks/use-tool';
import { useTheme } from '@/hooks/use-theme';
import { formatBytes, readBytes, shareFile, type PickedFile } from '@/lib/files';
import { t } from '@/lib/i18n';
import { setPendingFiles } from '@/lib/incoming';
import { openTool } from '@/lib/navigation';
import { getInfo, type PdfInfo } from '@/lib/pdf/ops';
import type { ToolId } from '@/lib/tools';

const GAP = Spacing.three;
const PAD = Spacing.three;

/** Read-only PDF viewer with page navigation and quick access to tools. */
export default function ViewerScreen() {
  const params = useLocalSearchParams<{ file: string }>();
  const file = useMemo(() => JSON.parse(params.file) as PickedFile, [params.file]);
  const [info, setInfo] = useState<PdfInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    readBytes(file.uri)
      .then(getInfo)
      .then(
        (i) => active && setInfo(i),
        (e) => active && setError(messageOf(e))
      );
    return () => {
      active = false;
    };
  }, [file.uri]);

  const header = <Stack.Screen options={{ headerTitle: () => <Title file={file} info={info} /> }} />;
  if (error) {
    return (
      <Screen>
        {header}
        <ErrorBanner message={error} />
      </Screen>
    );
  }
  if (!info) {
    return <Loading>{header}</Loading>;
  }
  if (info.encrypted) {
    return (
      <Screen>
        {header}
        <ErrorBanner message={t('PDF ini dilindungi password. Buka dulu dengan alat "Hapus Password".')} />
        <Button title={t('Hapus Password')} onPress={() => openTool('unlock', [file])} />
      </Screen>
    );
  }
  return (
    <>
      {header}
      <Pages file={file} info={info} />
    </>
  );
}

function Title({ file, info }: { file: PickedFile; info: PdfInfo | null }) {
  return (
    <View style={{ maxWidth: 240 }}>
      <Txt variant="titleSm" numberOfLines={1}>
        {file.name}
      </Txt>
      <Txt variant="bodySm" color="textSecondary" numberOfLines={1}>
        {info ? `${t('{n} halaman', { n: info.pageCount })} · ` : ''}
        {formatBytes(file.size)}
      </Txt>
    </View>
  );
}

function Loading({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: theme.background }]}>
      {children}
      <ActivityIndicator size="large" color={theme.accent} />
    </View>
  );
}

// Labels are functions so they translate at render time, after the locale is set.
const QUICK: { id: ToolId; label: () => string; icon: Icon }[] = [
  { id: 'organize', label: () => t('Atur'), icon: { ios: 'square.grid.2x2', android: 'grid_view' } },
  { id: 'sign', label: () => t('Tanda tangan'), icon: { ios: 'signature', android: 'draw' } },
  { id: 'compress', label: () => t('Kompres'), icon: { ios: 'arrow.down.right.and.arrow.up.left', android: 'compress' } },
];

function Pages({ file, info }: { file: PickedFile; info: PdfInfo }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, scale } = useWindowDimensions();
  const listRef = useRef<FlatList<number>>(null);
  const [visible, setVisible] = useState<number[]>([0]);
  const [stripOpen, setStripOpen] = useState(false);
  const [zoomed, setZoomed] = useState<number | null>(null);

  const pageW = Math.min(width, MaxContentWidth) - PAD * 2;
  const pixelW = Math.min(1600, Math.round(pageW * scale));
  const { image, request } = usePageImages(file.uri, pixelW);
  const pages = useMemo(() => info.pageSizes.map((_, i) => i), [info]);
  const heights = useMemo(() => info.pageSizes.map((s) => (pageW * s.height) / s.width), [info, pageW]);
  const offsets = useMemo(() => {
    const out: number[] = [];
    let y = PAD;
    for (const h of heights) {
      out.push(y);
      y += h + GAP;
    }
    return out;
  }, [heights]);

  // Render what is on screen plus a page either side.
  useEffect(() => {
    const lo = Math.min(...visible);
    const hi = Math.max(...visible);
    const around = [...visible, hi + 1, lo - 1, hi + 2].filter((i) => i >= 0 && i < info.pageCount);
    request(around);
  }, [visible, info.pageCount, request]);

  // FlatList requires a stable callback; it only forwards to a state setter.
  const onViewable = useCallback(({ viewableItems }: { viewableItems: ViewToken<number>[] }) => {
    const idx = viewableItems.map((v) => v.index).filter((i): i is number => i !== null);
    if (idx.length) setVisible(idx);
  }, []);

  const current = Math.min(...visible);
  const goTo = (i: number) => listRef.current?.scrollToIndex({ index: i, animated: true });
  const more = () => {
    setPendingFiles([file]);
    router.push('/incoming');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Bagikan')}
              hitSlop={10}
              onPress={() => shareFile({ uri: file.uri, mimeType: 'application/pdf' })}>
              <SymbolIcon icon={{ ios: 'square.and.arrow.up', android: 'share' }} size={20} color={theme.text} />
            </Pressable>
          ),
        }}
      />
      <FlatList
        ref={listRef}
        data={pages}
        keyExtractor={(i) => String(i)}
        contentContainerStyle={{ padding: PAD, gap: GAP, paddingBottom: insets.bottom + (stripOpen ? 230 : 120) }}
        getItemLayout={(_, i) => ({ index: i, length: heights[i], offset: offsets[i] })}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 15 }}
        initialNumToRender={2}
        windowSize={5}
        renderItem={({ item }) => (
          <PageView index={item} width={pageW} height={heights[item]} image={image(item)} onOpen={setZoomed} />
        )}
      />

      <View pointerEvents="none" style={[styles.counter, { top: Spacing.two }]}>
        <Pill tone="neutral" label={`${current + 1} / ${info.pageCount}`} />
      </View>

      <View pointerEvents="box-none" style={[styles.dock, { bottom: insets.bottom + 10 }]}>
        {stripOpen && (
          <Strip uri={file.uri} info={info} current={current} onPick={goTo} />
        )}
        <View style={[styles.bar, { backgroundColor: theme.chrome, borderColor: theme.border }]}>
          <BarItem
            label={t('Halaman')}
            icon={{ ios: 'rectangle.split.3x1', android: 'view_carousel' }}
            active={stripOpen}
            onPress={() => setStripOpen((o) => !o)}
          />
          {QUICK.map((q) => (
            <BarItem key={q.id} label={q.label()} icon={q.icon} onPress={() => openTool(q.id, [file])} />
          ))}
          <BarItem label={t('Lainnya')} icon={{ ios: 'ellipsis.circle', android: 'more_horiz' }} onPress={more} />
        </View>
      </View>

      <PageZoom
        uri={file.uri}
        page={zoomed}
        pageCount={info.pageCount}
        aspect={zoomed === null ? 1.414 : heights[zoomed] / pageW}
        preview={zoomed === null ? undefined : image(zoomed)}
        onClose={() => setZoomed(null)}
      />
    </View>
  );
}

/** One page on the canvas: white paper with the design's soft drop shadow. */
const PageView = memo(function PageView({
  index,
  width,
  height,
  image,
  onOpen,
}: {
  index: number;
  width: number;
  height: number;
  image?: string;
  onOpen: (i: number) => void;
}) {
  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={t('Halaman {n}', { n: index + 1 })}
      accessibilityHint={t('Ketuk untuk memperbesar')}
      onPress={() => onOpen(index)}
      style={[styles.paper, { width, height }]}>
      {image ? (
        <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="contain" transition={120} />
      ) : (
        <ActivityIndicator color="#94A3B8" />
      )}
    </Pressable>
  );
});

/** Horizontal page thumbnails for quick jumps. */
function Strip({
  uri,
  info,
  current,
  onPick,
}: {
  uri: string;
  info: PdfInfo;
  current: number;
  onPick: (i: number) => void;
}) {
  const theme = useTheme();
  const thumbs = usePageThumbs(uri, info.pageCount, 140);
  const ref = useRef<FlatList<number>>(null);
  const pages = useMemo(() => info.pageSizes.map((_, i) => i), [info]);

  useEffect(() => {
    ref.current?.scrollToIndex({ index: current, animated: true, viewPosition: 0.5 });
  }, [current]);

  return (
    <View style={[styles.strip, { backgroundColor: theme.chrome, borderColor: theme.border }]}>
      <FlatList
        ref={ref}
        horizontal
        data={pages}
        keyExtractor={(i) => String(i)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: Spacing.two, paddingHorizontal: Spacing.two }}
        getItemLayout={(_, i) => ({ index: i, length: 56 + Spacing.two, offset: Spacing.two + i * (56 + Spacing.two) })}
        // Start near the current page; the effect above keeps it centred after.
        initialScrollIndex={Math.max(0, current - 2)}
        onScrollToIndexFailed={() => {}}
        renderItem={({ item }) => {
          const active = item === current;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Halaman {n}', { n: item + 1 })}
              accessibilityState={{ selected: active }}
              onPress={() => onPick(item)}
              style={styles.thumbWrap}>
              <View
                style={[
                  styles.thumb,
                  { borderColor: active ? theme.accent : theme.border, borderWidth: active ? 2 : StyleSheet.hairlineWidth },
                ]}>
                {thumbs[item] && <Image source={{ uri: thumbs[item] }} style={StyleSheet.absoluteFill} contentFit="contain" />}
              </View>
              <Txt variant="labelSm" style={{ color: active ? theme.accentOnSurface : theme.textMuted }}>
                {`P${item + 1}`}
              </Txt>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function BarItem({ label, icon, onPress, active }: { label: string; icon: Icon; onPress: () => void; active?: boolean }) {
  const theme = useTheme();
  const color = active ? theme.accentOnSurface : theme.textSecondary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.barItem,
        (active || pressed) && { backgroundColor: theme.accentSoft },
      ]}>
      <SymbolIcon icon={icon} size={20} color={color} />
      <Txt variant="labelSm" numberOfLines={1} style={[Type.labelSm, { color }]}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  paper: {
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  counter: { position: 'absolute', alignSelf: 'center' },
  dock: { position: 'absolute', left: 16, right: 16, alignItems: 'center', gap: Spacing.two },
  bar: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: MaxContentWidth - 32,
    borderRadius: Radius.xl + 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 6,
    gap: 2,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  barItem: { flex: 1, height: 52, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center', gap: 2 },
  strip: {
    width: '100%',
    maxWidth: MaxContentWidth - 32,
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.two,
  },
  thumbWrap: { width: 56, alignItems: 'center', gap: 4 },
  thumb: { width: 56, height: 74, borderRadius: Radius.sm + 2, backgroundColor: '#ffffff', overflow: 'hidden' },
});
