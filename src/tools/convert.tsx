import { Image } from 'expo-image';
import { zipSync } from 'fflate';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { RunSection, SourceCard } from '@/components/pdf-parts';
import { Body, Button, Card, ErrorBanner, Field, Label, Screen, Segmented, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { messageOf, outName, type ToolProps, usePdfSource, useToolRun } from '@/hooks/use-tool';
import { useTheme } from '@/hooks/use-theme';
import { baseName, formatBytes, normalizeImage, pickImages, readBytes, type PickedImage } from '@/lib/files';
import { t } from '@/lib/i18n';
import * as ops from '@/lib/pdf/ops';
import { canRender, renderPage } from '@/lib/render';

export function ImagesToPdfTool({ initial }: ToolProps) {
  const theme = useTheme();
  const run = useToolRun();
  const [images, setImages] = useState<PickedImage[]>([]);
  const [pageSize, setPageSize] = useState<ops.ImagesToPdfOptions['pageSize']>('A4');
  const [margin, setMargin] = useState(20);
  // Shared-in images still need converting before they can be embedded.
  const [adding, setAdding] = useState(!!initial?.length);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    if (!initial?.length) return;
    let active = true;
    Promise.all(initial.map((f) => normalizeImage(f.uri, f.name)))
      .then(
        (imgs) => active && setImages(imgs),
        (e) => active && setAddError(messageOf(e))
      )
      .finally(() => active && setAdding(false));
    return () => {
      active = false;
    };
  }, [initial]);

  async function add() {
    setAdding(true);
    setAddError(null);
    try {
      const picked = await pickImages({ multiple: true });
      setImages((x) => [...x, ...picked]);
    } catch (e) {
      setAddError(messageOf(e));
    } finally {
      setAdding(false);
    }
  }
  function move(i: number, d: number) {
    setImages((f) => {
      const next = [...f];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });
  }

  return (
    <Screen>
      <Card>
        {images.length === 0 && <Body secondary>{t('Pilih foto dari galeri. Urutan di bawah = urutan halaman.')}</Body>}
        {images.map((img, i) => (
          <View key={`${img.uri}-${i}`} style={styles.row}>
            <Image source={{ uri: img.uri }} style={[styles.thumb, { backgroundColor: theme.background }]} contentFit="cover" />
            <Txt variant="labelLg" style={{ flex: 1 }} numberOfLines={1}>
              {i + 1}. {img.name}
            </Txt>
            <Button title="↑" compact variant="secondary" disabled={i === 0} onPress={() => move(i, -1)} />
            <Button title="↓" compact variant="secondary" disabled={i === images.length - 1} onPress={() => move(i, 1)} />
            <Button title="✕" compact variant="secondary" onPress={() => setImages((x) => x.filter((_, k) => k !== i))} />
          </View>
        ))}
        <Button title={t('Tambah gambar')} variant="secondary" icon={{ ios: 'photo.badge.plus', android: 'add_photo_alternate' }} onPress={add} loading={adding} />
        {addError && <ErrorBanner message={addError} />}
      </Card>
      {images.length > 0 && (
        <Card>
          <Segmented
            label={t('Ukuran halaman')}
            value={pageSize}
            onChange={setPageSize}
            options={[
              { value: 'A4', label: 'A4' },
              { value: 'Letter', label: 'Letter' },
              { value: 'fit', label: t('Sesuai gambar') },
            ]}
          />
          {pageSize !== 'fit' && (
            <Segmented
              label={t('Margin')}
              value={margin}
              onChange={setMargin}
              options={[
                { value: 0, label: t('Tanpa') },
                { value: 20, label: t('Kecil') },
                { value: 40, label: t('Besar') },
              ]}
            />
          )}
        </Card>
      )}
      <RunSection
        title={t('Buat PDF ({n} halaman)', { n: images.length })}
        disabled={images.length === 0}
        run={run}
        onPress={() =>
          run.run(async () => [
            {
              name: `${baseName(images[0].name)}.pdf`,
              bytes: await ops.imagesToPdf(images, { pageSize, margin }),
            },
          ])
        }
      />
    </Screen>
  );
}

const RESOLUTIONS = { medium: 1240, high: 2480 } as const;

export function PdfToImagesTool({ initial }: ToolProps) {
  const src = usePdfSource(initial?.[0]);
  const run = useToolRun();
  const [res, setRes] = useState<keyof typeof RESOLUTIONS>('medium');
  const [range, setRange] = useState('');
  const s = src.source;

  return (
    <Screen>
      {!canRender() && <ErrorBanner message={t('Fitur ini butuh development build (tidak berjalan di Expo Go).')} />}
      <SourceCard source={s} onPick={src.pick} loading={src.loading} error={src.error} />
      {s && (
        <Card>
          <Segmented
            label={t('Resolusi')}
            value={res}
            onChange={setRes}
            options={[
              { value: 'medium', label: t('Sedang (~150 dpi)') },
              { value: 'high', label: t('Tinggi (~300 dpi)') },
            ]}
          />
          <Field
            label={t('Halaman (kosongkan = semua)')}
            value={range}
            onChangeText={setRange}
            placeholder={`1-${s.info.pageCount}`}
            keyboardType="numbers-and-punctuation"
          />
          <Body secondary>{t('Satu halaman menghasilkan JPEG, lebih dari satu dikemas sebagai ZIP.')}</Body>
        </Card>
      )}
      <RunSection
        title={t('Ekspor gambar')}
        disabled={!s || !canRender()}
        run={run}
        onPress={() =>
          run.run(async () => {
            const pages = range.trim() ? ops.parsePageRanges(range, s!.info.pageCount) : s!.info.pageSizes.map((_, i) => i);
            const files: Record<string, Uint8Array> = {};
            const stem = baseName(s!.name);
            for (const i of pages) {
              const r = await renderPage(s!.uri, i, { maxWidth: RESOLUTIONS[res], maxHeight: RESOLUTIONS[res] * 1.5, quality: 90 });
              files[`${stem}-${i + 1}.jpg`] = await readBytes(r.uri);
            }
            const names = Object.keys(files);
            if (names.length === 1) return [{ name: names[0], bytes: files[names[0]] }];
            // JPEGs are already compressed; store them as-is.
            return [{ name: `${stem}-${t('gambar')}.zip`, bytes: zipSync(files, { level: 0 }) }];
          })
        }
      />
    </Screen>
  );
}

const LEVELS = {
  light: { dpi: 150, quality: 80 },
  medium: { dpi: 110, quality: 65 },
  strong: { dpi: 80, quality: 50 },
} as const;

export function CompressTool({ initial }: ToolProps) {
  const theme = useTheme();
  const src = usePdfSource(initial?.[0]);
  const run = useToolRun();
  const [mode, setMode] = useState<'lossless' | 'raster'>('lossless');
  const [level, setLevel] = useState<keyof typeof LEVELS>('medium');
  const s = src.source;
  const result = run.results[0];

  return (
    <Screen>
      <SourceCard source={s} onPick={src.pick} loading={src.loading} error={src.error} />
      {s && (
        <Card>
          <Segmented
            label={t('Metode')}
            value={mode}
            onChange={setMode}
            options={[
              { value: 'lossless', label: t('Tanpa kehilangan') },
              { value: 'raster', label: t('Maksimal') },
            ]}
          />
          {mode === 'lossless' ? (
            <Body secondary>{t('Menyusun ulang struktur file dan membuang data tak terpakai. Kualitas tetap sama.')}</Body>
          ) : (
            <>
              <Segmented
                label={t('Tingkat')}
                value={level}
                onChange={setLevel}
                options={[
                  { value: 'light', label: t('Ringan') },
                  { value: 'medium', label: t('Sedang') },
                  { value: 'strong', label: t('Kuat') },
                ]}
              />
              <Body secondary>
                {t('Setiap halaman diubah menjadi gambar JPEG. Cocok untuk hasil scan; teks tidak bisa dipilih/dicari lagi.')}
              </Body>
              {!canRender() && <ErrorBanner message={t('Mode ini butuh development build (tidak berjalan di Expo Go).')} />}
            </>
          )}
        </Card>
      )}
      {s && result && (
        <Card>
          <Label>{t('Hasil')}</Label>
          <Txt variant="headlineMd" style={{ fontVariant: ['tabular-nums'] }}>
            {formatBytes(s.size)} → {formatBytes(result.size)}
          </Txt>
          <Txt variant="labelLg" style={{ color: result.size < s.size ? theme.success : theme.dangerText }}>
            {result.size < s.size
              ? t('Lebih kecil {pct}%', { pct: Math.round((1 - result.size / s.size) * 100) })
              : t('File sudah optimal; hasil tidak lebih kecil. Coba metode Maksimal.')}
          </Txt>
        </Card>
      )}
      <RunSection
        title={t('Kompres')}
        disabled={!s || (mode === 'raster' && !canRender())}
        run={run}
        onPress={() =>
          run.run(async () => {
            if (mode === 'lossless') {
              return [{ name: outName(s!, 'kompres'), bytes: await ops.optimize(await readBytes(s!.uri)) }];
            }
            const { dpi, quality } = LEVELS[level];
            const pages = [];
            for (let i = 0; i < s!.info.pageCount; i++) {
              const size = s!.info.pageSizes[i];
              const r = await renderPage(s!.uri, i, { maxWidth: Math.round((size.width * dpi) / 72), quality });
              pages.push({ jpeg: await readBytes(r.uri), width: size.width, height: size.height });
            }
            return [{ name: outName(s!, 'kompres'), bytes: await ops.pdfFromPageImages(pages) }];
          })
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  thumb: { width: 44, height: 44, borderRadius: 8 },
});
