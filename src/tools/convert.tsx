import { zipSync } from 'fflate';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RunSection, SourceCard } from '@/components/pdf-parts';
import { Body, Button, Card, ErrorBanner, Field, Label, Screen, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { outName, usePdfSource, useToolRun } from '@/hooks/use-tool';
import { useTheme } from '@/hooks/use-theme';
import { baseName, formatBytes, pickImages, readBytes, type PickedImage } from '@/lib/files';
import * as ops from '@/lib/pdf/ops';
import { canRender, renderPage } from '@/lib/render';

export function ImagesToPdfTool() {
  const theme = useTheme();
  const run = useToolRun();
  const [images, setImages] = useState<PickedImage[]>([]);
  const [pageSize, setPageSize] = useState<ops.ImagesToPdfOptions['pageSize']>('A4');
  const [margin, setMargin] = useState(20);
  const [adding, setAdding] = useState(false);

  async function add() {
    setAdding(true);
    try {
      const picked = await pickImages({ multiple: true });
      setImages((x) => [...x, ...picked]);
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
        {images.length === 0 && <Body secondary>Pilih foto dari galeri. Urutan di bawah = urutan halaman.</Body>}
        {images.map((img, i) => (
          <View key={`${img.uri}-${i}`} style={styles.row}>
            <Image source={{ uri: img.uri }} style={[styles.thumb, { backgroundColor: theme.background }]} contentFit="cover" />
            <Text style={{ flex: 1, color: theme.text }} numberOfLines={1}>
              {i + 1}. {img.name}
            </Text>
            <Button title="↑" compact variant="secondary" disabled={i === 0} onPress={() => move(i, -1)} />
            <Button title="↓" compact variant="secondary" disabled={i === images.length - 1} onPress={() => move(i, 1)} />
            <Button title="✕" compact variant="secondary" onPress={() => setImages((x) => x.filter((_, k) => k !== i))} />
          </View>
        ))}
        <Button title="Tambah gambar" variant="secondary" icon={{ ios: 'photo.badge.plus', android: 'add_photo_alternate' }} onPress={add} loading={adding} />
      </Card>
      {images.length > 0 && (
        <Card>
          <Segmented
            label="Ukuran halaman"
            value={pageSize}
            onChange={setPageSize}
            options={[
              { value: 'A4', label: 'A4' },
              { value: 'Letter', label: 'Letter' },
              { value: 'fit', label: 'Sesuai gambar' },
            ]}
          />
          {pageSize !== 'fit' && (
            <Segmented
              label="Margin"
              value={margin}
              onChange={setMargin}
              options={[
                { value: 0, label: 'Tanpa' },
                { value: 20, label: 'Kecil' },
                { value: 40, label: 'Besar' },
              ]}
            />
          )}
        </Card>
      )}
      <RunSection
        title={`Buat PDF (${images.length} halaman)`}
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

export function PdfToImagesTool() {
  const src = usePdfSource();
  const run = useToolRun();
  const [res, setRes] = useState<keyof typeof RESOLUTIONS>('medium');
  const [range, setRange] = useState('');
  const s = src.source;

  return (
    <Screen>
      {!canRender() && <ErrorBanner message="Fitur ini butuh development build (tidak berjalan di Expo Go)." />}
      <SourceCard source={s} onPick={src.pick} loading={src.loading} error={src.error} />
      {s && (
        <Card>
          <Segmented
            label="Resolusi"
            value={res}
            onChange={setRes}
            options={[
              { value: 'medium', label: 'Sedang (~150 dpi)' },
              { value: 'high', label: 'Tinggi (~300 dpi)' },
            ]}
          />
          <Field
            label="Halaman (kosongkan = semua)"
            value={range}
            onChangeText={setRange}
            placeholder={`1-${s.info.pageCount}`}
            keyboardType="numbers-and-punctuation"
          />
          <Body secondary>Satu halaman menghasilkan JPEG, lebih dari satu dikemas sebagai ZIP.</Body>
        </Card>
      )}
      <RunSection
        title="Ekspor gambar"
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
            return [{ name: `${stem}-gambar.zip`, bytes: zipSync(files, { level: 0 }) }];
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

export function CompressTool() {
  const theme = useTheme();
  const src = usePdfSource();
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
            label="Metode"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'lossless', label: 'Tanpa kehilangan' },
              { value: 'raster', label: 'Maksimal' },
            ]}
          />
          {mode === 'lossless' ? (
            <Body secondary>Menyusun ulang struktur file dan membuang data tak terpakai. Kualitas tetap sama.</Body>
          ) : (
            <>
              <Segmented
                label="Tingkat"
                value={level}
                onChange={setLevel}
                options={[
                  { value: 'light', label: 'Ringan' },
                  { value: 'medium', label: 'Sedang' },
                  { value: 'strong', label: 'Kuat' },
                ]}
              />
              <Body secondary>
                Setiap halaman diubah menjadi gambar JPEG. Cocok untuk hasil scan; teks tidak bisa dipilih/dicari lagi.
              </Body>
              {!canRender() && <ErrorBanner message="Mode ini butuh development build (tidak berjalan di Expo Go)." />}
            </>
          )}
        </Card>
      )}
      {s && result && (
        <Card>
          <Label>Hasil</Label>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: '600' }}>
            {formatBytes(s.size)} → {formatBytes(result.size)}
          </Text>
          <Text style={{ color: result.size < s.size ? theme.success : theme.danger }}>
            {result.size < s.size
              ? `Lebih kecil ${Math.round((1 - result.size / s.size) * 100)}%`
              : 'File sudah optimal; hasil tidak lebih kecil. Coba metode Maksimal.'}
          </Text>
        </Card>
      )}
      <RunSection
        title="Kompres"
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
