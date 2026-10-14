import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { RunButton, RunOutput, RunSection, SourceCard } from '@/components/pdf-parts';
import { INK_COLORS, INK_WIDTH, SignaturePad } from '@/components/signature-pad';
import { Body, Button, Card, Chip, ErrorBanner, Field, Label, Screen, Segmented, Stepper, SwitchRow, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { messageOf, outName, type PdfSource, type ToolProps, usePdfSource, useToolRun } from '@/hooks/use-tool';
import { useTheme } from '@/hooks/use-theme';
import { pickImages, readBytes, type PickedImage } from '@/lib/files';
import { localeTag, t } from '@/lib/i18n';
import * as ops from '@/lib/pdf/ops';
import { canRender, renderPage } from '@/lib/render';
import {
  imageUri,
  loadImage,
  removeSignature,
  saveDrawn,
  saveImage,
  useSignatures,
  type SavedSignature,
} from '@/lib/signatures';

const COLORS = ['#808080', '#E5483B', '#2F6FEB', '#1A9A6C', '#000000'];

export function WatermarkTool({ initial }: ToolProps) {
  const theme = useTheme();
  const src = usePdfSource(initial?.[0]);
  const run = useToolRun();
  const [text, setText] = useState(() => t('RAHASIA'));
  const [fontSize, setFontSize] = useState(60);
  const [opacity, setOpacity] = useState(25);
  const [angle, setAngle] = useState(45);
  const [color, setColor] = useState(COLORS[0]);
  const [tiled, setTiled] = useState(false);
  const s = src.source;

  return (
    <Screen>
      <SourceCard source={s} onPick={src.pick} loading={src.loading} error={src.error} />
      {s && (
        <Card>
          <Field label={t('Teks')} value={text} onChangeText={setText} placeholder={t('RAHASIA')} />
          <Stepper label={t('Ukuran huruf')} value={fontSize} onChange={setFontSize} min={12} max={160} step={4} />
          <Stepper label={t('Transparansi')} value={opacity} onChange={setOpacity} min={5} max={100} step={5} format={(v) => `${v}%`} />
          <Segmented
            label={t('Kemiringan')}
            value={angle}
            onChange={setAngle}
            options={[
              { value: 0, label: '0°' },
              { value: 30, label: '30°' },
              { value: 45, label: '45°' },
              { value: 90, label: '90°' },
            ]}
          />
          <Label>{t('Warna')}</Label>
          <View style={styles.swatches}>
            {COLORS.map((c) => (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityLabel={t('Warna {color}', { color: c })}
                accessibilityState={{ selected: c === color }}
                onPress={() => setColor(c)}
                style={[styles.swatch, { backgroundColor: c, borderColor: c === color ? theme.text : 'transparent' }]}
              />
            ))}
          </View>
          <SwitchRow label={t('Ulangi di seluruh halaman')} value={tiled} onChange={setTiled} />
        </Card>
      )}
      <RunSection
        title={t('Tambahkan watermark')}
        disabled={!s || !text.trim()}
        run={run}
        onPress={() =>
          run.run(async () => [
            {
              name: outName(s!, 'watermark'),
              bytes: await ops.addTextWatermark(await readBytes(s!.uri), {
                text,
                fontSize,
                opacity: opacity / 100,
                angle,
                color,
                tiled,
              }),
            },
          ])
        }
      />
    </Screen>
  );
}

/** Number formats; the words are printed into the PDF, so they follow the app language. */
const formats = () => [
  { value: '{n}', label: '1' },
  { value: '{n} / {total}', label: '1 / N' },
  { value: t('Halaman {n}', { n: '{n}' }), label: t('Hal. 1') },
  { value: t('Halaman {n} dari {total}', { n: '{n}', total: '{total}' }), label: t('Hal. 1 dari N') },
];

export function PageNumbersTool({ initial }: ToolProps) {
  const src = usePdfSource(initial?.[0]);
  const run = useToolRun();
  const [vert, setVert] = useState<'top' | 'bottom'>('bottom');
  const [horiz, setHoriz] = useState<'left' | 'center' | 'right'>('center');
  const [format, setFormat] = useState('{n}');
  const [startAt, setStartAt] = useState(1);
  const [fontSize, setFontSize] = useState(11);
  const [skipFirst, setSkipFirst] = useState(false);
  const s = src.source;

  return (
    <Screen>
      <SourceCard source={s} onPick={src.pick} loading={src.loading} error={src.error} />
      {s && (
        <Card>
          <Segmented
            label={t('Posisi vertikal')}
            value={vert}
            onChange={setVert}
            options={[
              { value: 'top', label: t('Atas') },
              { value: 'bottom', label: t('Bawah') },
            ]}
          />
          <Segmented
            label={t('Posisi horizontal')}
            value={horiz}
            onChange={setHoriz}
            options={[
              { value: 'left', label: t('Kiri') },
              { value: 'center', label: t('Tengah') },
              { value: 'right', label: t('Kanan') },
            ]}
          />
          <Segmented label={t('Format')} value={format} onChange={setFormat} options={formats()} />
          <Stepper label={t('Mulai dari')} value={startAt} onChange={setStartAt} min={0} max={9999} />
          <Stepper label={t('Ukuran huruf')} value={fontSize} onChange={setFontSize} min={6} max={36} />
          <SwitchRow label={t('Lewati halaman pertama (sampul)')} value={skipFirst} onChange={setSkipFirst} />
        </Card>
      )}
      <RunSection
        title={t('Tambahkan nomor')}
        disabled={!s}
        run={run}
        onPress={() =>
          run.run(async () => [
            {
              name: outName(s!, 'bernomor'),
              bytes: await ops.addPageNumbers(await readBytes(s!.uri), {
                position: `${vert}-${horiz}` as ops.NumberPosition,
                format,
                startAt,
                fontSize,
                margin: 28,
                pages: skipFirst ? s!.info.pageSizes.map((_, i) => i).slice(1) : undefined,
              }),
            },
          ])
        }
      />
    </Screen>
  );
}

/** Places an image (signature, stamp, logo) by tapping on a page preview. */
type Stamp =
  | { kind: 'image'; image: PickedImage }
  | { kind: 'drawn'; path: ops.DrawnPath; color: string };

/** Places a drawn or picked signature (or stamp/logo) by tapping a page preview. */
export function SignTool({ initial }: ToolProps) {
  const theme = useTheme();
  const src = usePdfSource(initial?.[0]);
  const run = useToolRun();
  const [stamp, setStamp] = useState<Stamp | null>(null);
  // Id of the saved signature in use, or null when the stamp isn't saved yet.
  const [savedId, setSavedId] = useState<string | null>(null);
  const signatures = useSignatures();
  const [drawing, setDrawing] = useState(false);
  const [ink, setInk] = useState(INK_COLORS[1]);
  const [page, setPage] = useState(1);
  const [pos, setPos] = useState({ cx: 0.7, cy: 0.85 });
  const [widthPct, setWidthPct] = useState(30);
  const [rendered, setRendered] = useState<{ key: string; uri: string } | null>(null);
  const [boxW, setBoxW] = useState(0);
  const s = src.source;
  const previewKey = s ? `${s.uri}#${page}` : '';
  const preview = rendered?.key === previewKey ? rendered.uri : null;

  useEffect(() => {
    if (!s || !canRender()) return;
    let active = true;
    const key = `${s.uri}#${page}`;
    renderPage(s.uri, page - 1, { maxWidth: 1000, quality: 80 })
      .then((r) => active && setRendered({ key, uri: r.uri }))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [s, page]);

  const size = s?.info.pageSizes[page - 1];
  const boxH = size ? (boxW * size.height) / size.width : 0;
  const stampW = (boxW * widthPct) / 100;
  const aspect = !stamp ? 0 : stamp.kind === 'image' ? stamp.image.height / stamp.image.width : stamp.path.height / stamp.path.width;
  const stampH = stampW * aspect;

  function choose(next: Stamp, id: string | null = null) {
    setStamp(next);
    setSavedId(id);
  }

  async function pickSaved(sig: SavedSignature) {
    if (sig.kind === 'drawn') choose({ kind: 'drawn', path: sig.path, color: sig.color }, sig.id);
    else choose({ kind: 'image', image: await loadImage(sig) }, sig.id);
  }

  function confirmRemove(sig: SavedSignature) {
    Alert.alert(t('Hapus tanda tangan tersimpan?'), undefined, [
      { text: t('Batal'), style: 'cancel' },
      {
        text: t('Hapus'),
        style: 'destructive',
        onPress: () => {
          removeSignature(sig.id);
          if (sig.id === savedId) setSavedId(null);
        },
      },
    ]);
  }

  return (
    <Screen
      scrollToTopKey={run.results.length}
      footer={
        <RunButton
          title={t('Tempel ke PDF')}
          disabled={!s || !stamp}
          run={run}
          onPress={() =>
            run.run(async () => {
              const bytes = await readBytes(s!.uri);
              const place = { pageIndex: page - 1, cx: pos.cx, cy: pos.cy, widthFraction: widthPct / 100 };
              const out =
                stamp!.kind === 'image'
                  ? await ops.stampImage(bytes, { ...place, image: stamp!.image })
                  : await ops.stampPath(bytes, { ...place, path: stamp!.path, color: stamp!.color, strokeWidth: INK_WIDTH });
              return [{ name: outName(s!, 'ditandatangani'), bytes: out }];
            })
          }
        />
      }>
      <SourceCard source={s} onPick={async () => { await src.pick(); setPage(1); }} loading={src.loading} error={src.error} />
      <RunOutput run={run} />
      {s && (
        <Card>
          {signatures.length > 0 && (
            <>
              <Label>{t('Tanda tangan tersimpan')}</Label>
              <View style={styles.savedGrid}>
                {signatures.map((sig) => (
                  <SavedTile
                    key={sig.id}
                    sig={sig}
                    selected={sig.id === savedId}
                    onPress={() => pickSaved(sig)}
                    onLongPress={() => confirmRemove(sig)}
                  />
                ))}
              </View>
            </>
          )}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Button
                title={t('Gambar')}
                variant={stamp?.kind === 'drawn' ? 'primary' : 'secondary'}
                icon={{ ios: 'signature', android: 'draw' }}
                onPress={() => setDrawing(true)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={t('Dari foto')}
                variant={stamp?.kind === 'image' ? 'primary' : 'secondary'}
                icon={{ ios: 'photo', android: 'image' }}
                onPress={async () => {
                  const [img] = await pickImages({ multiple: false, maxSide: 1600 });
                  if (img) choose({ kind: 'image', image: img });
                }}
              />
            </View>
          </View>
          <Body secondary>
            {stamp
              ? t('Ketuk halaman di bawah untuk memindahkan posisi.')
              : t('Gambar tanda tangan dengan jari, atau pakai foto/PNG transparan.')}
          </Body>
          {stamp && !savedId && (
            <Button
              title={t('Simpan untuk dipakai lagi')}
              variant="ghost"
              compact
              icon={{ ios: 'bookmark', android: 'bookmark' }}
              onPress={() => setSavedId(stamp.kind === 'drawn' ? saveDrawn(stamp.path, stamp.color) : saveImage(stamp.image))}
            />
          )}
          {signatures.length > 0 && <Body secondary>{t('Tekan lama tanda tangan tersimpan untuk menghapusnya.')}</Body>}
          <Stepper label={t('Halaman ke')} value={page} onChange={setPage} min={1} max={s.info.pageCount} />
          <Stepper label={t('Lebar')} value={widthPct} onChange={setWidthPct} min={5} max={90} step={5} format={(v) => `${v}%`} />
        </Card>
      )}
      <SignaturePad
        visible={drawing}
        color={ink}
        onColor={setInk}
        onCancel={() => setDrawing(false)}
        onDone={(path) => {
          choose({ kind: 'drawn', path, color: ink });
          setDrawing(false);
        }}
      />
      {s && size && (
        <View onLayout={(e) => setBoxW(e.nativeEvent.layout.width)}>
          {!canRender() && <ErrorBanner message={t('Pratinjau halaman butuh development build. Posisi tetap bisa diatur.')} />}
          {boxW > 0 && (
            <Pressable
              accessibilityLabel={t('Ketuk untuk menempatkan tanda tangan')}
              onPress={(e) => setPos({ cx: e.nativeEvent.locationX / boxW, cy: e.nativeEvent.locationY / boxH })}
              style={[styles.page, { width: boxW, height: boxH, borderColor: theme.border }]}>
              {preview && <Image source={{ uri: preview }} style={StyleSheet.absoluteFill} contentFit="fill" pointerEvents="none" />}
              {stamp && (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    width: stampW,
                    height: stampH,
                    left: pos.cx * boxW - stampW / 2,
                    top: pos.cy * boxH - stampH / 2,
                    borderWidth: 1,
                    borderColor: theme.accent,
                    borderStyle: 'dashed',
                  }}>
                  {stamp.kind === 'image' ? (
                    <Image source={{ uri: stamp.image.uri }} contentFit="fill" style={StyleSheet.absoluteFill} />
                  ) : (
                    <Svg width="100%" height="100%" viewBox={`0 0 ${stamp.path.width} ${stamp.path.height}`}>
                      <Path
                        d={stamp.path.d}
                        stroke={stamp.color}
                        strokeWidth={INK_WIDTH}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </Svg>
                  )}
                </View>
              )}
            </Pressable>
          )}
        </View>
      )}
    </Screen>
  );
}

/** A saved signature as a small tile: tap to use, long-press to delete. */
function SavedTile({
  sig,
  selected,
  onPress,
  onLongPress,
}: {
  sig: SavedSignature;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('Tanda tangan tersimpan')}
      accessibilityHint={t('Tekan lama untuk menghapus')}
      accessibilityState={{ selected }}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.savedTile, { borderColor: selected ? theme.accent : theme.border, borderWidth: selected ? 2 : 1 }]}>
      {sig.kind === 'image' ? (
        <Image source={{ uri: imageUri(sig) }} contentFit="contain" style={StyleSheet.absoluteFill} />
      ) : (
        <Svg width="100%" height="100%" viewBox={`0 0 ${sig.path.width} ${sig.path.height}`}>
          <Path d={sig.path.d} stroke={sig.color} strokeWidth={INK_WIDTH} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      )}
    </Pressable>
  );
}

export function MetadataTool({ initial }: ToolProps) {
  const src = usePdfSource(initial?.[0]);
  const s = src.source;
  return (
    <Screen>
      <SourceCard source={s} onPick={src.pick} loading={src.loading} error={src.error} />
      {/* Keyed so the form starts fresh from each newly picked file. */}
      {s && <MetadataForm key={s.uri} source={s} />}
    </Screen>
  );
}

function MetadataForm({ source: s }: { source: PdfSource }) {
  const run = useToolRun();
  const [meta, setMeta] = useState<ops.Metadata>(() => ({
    title: s.info.title,
    author: s.info.author,
    subject: s.info.subject,
    keywords: s.info.keywords,
    creator: s.info.creator,
  }));

  const field = (key: keyof ops.Metadata, label: string) => (
    <Field label={label} value={meta[key] ?? ''} onChangeText={(v) => setMeta((m) => ({ ...m, [key]: v }))} />
  );
  const fmt = (d?: Date) => (d ? d.toLocaleString(localeTag()) : '—');

  return (
    <>
      <Card>
        <Label>{t('Informasi')}</Label>
        {[
          [t('Halaman'), String(s.info.pageCount)],
          [t('Ukuran halaman 1'), `${Math.round(s.info.pageSizes[0]?.width ?? 0)} × ${Math.round(s.info.pageSizes[0]?.height ?? 0)} pt`],
          [t('Terenkripsi'), s.info.encrypted ? t('Ya') : t('Tidak')],
          [t('Formulir'), s.info.hasForm ? t('Ada') : t('Tidak ada')],
          [t('Dibuat'), fmt(s.info.creationDate)],
          [t('Diubah'), fmt(s.info.modificationDate)],
          ['Producer', s.info.producer || '—'],
        ].map(([k, v]) => (
          <View key={k} style={styles.infoRow}>
            <Txt variant="bodyMd" color="textSecondary">{k}</Txt>
            <Txt variant="labelLg" style={{ flexShrink: 1, textAlign: 'right' }}>{v}</Txt>
          </View>
        ))}
      </Card>
      {s.info.encrypted ? (
        <ErrorBanner message={t('PDF terkunci. Buka dulu dengan alat "Hapus Password" untuk mengubah metadata.')} />
      ) : (
        <>
          <Card>
            <Label>{t('Metadata')}</Label>
            {field('title', t('Judul'))}
            {field('author', t('Penulis'))}
            {field('subject', t('Subjek'))}
            {field('keywords', t('Kata kunci (pisahkan dengan koma)'))}
            {field('creator', t('Aplikasi pembuat'))}
          </Card>
          <RunSection
            title={t('Simpan metadata')}
            run={run}
            onPress={() => run.run(async () => [{ name: outName(s, 'metadata'), bytes: await ops.setMetadata(await readBytes(s.uri), meta) }])}
          />
        </>
      )}
    </>
  );
}

export function FillFormTool({ initial }: ToolProps) {
  const src = usePdfSource(initial?.[0]);
  const s = src.source;
  return (
    <Screen>
      <SourceCard source={s} onPick={src.pick} loading={src.loading} error={src.error} />
      {s &&
        (s.info.encrypted ? (
          <ErrorBanner message={t('PDF ini dilindungi password. Buka dulu dengan alat "Hapus Password".')} />
        ) : !s.info.hasForm ? (
          <ErrorBanner message={t('PDF ini tidak memiliki formulir.')} />
        ) : (
          // Keyed so the form starts fresh from each newly picked file.
          <FormFiller key={s.uri} source={s} />
        ))}
    </Screen>
  );
}

/** "Page1.Data_Diri.nama_lengkap" reads as "nama lengkap". */
function fieldLabel(name: string) {
  return (name.split('.').pop() ?? name).replace(/\[\d+\]$/, '').replace(/[_-]+/g, ' ').trim() || name;
}

function FormFiller({ source: s }: { source: PdfSource }) {
  const run = useToolRun();
  const [fields, setFields] = useState<ops.FormField[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Only edited fields are written back, so untouched ones keep their original look.
  const [edits, setEdits] = useState<ops.FormValues>({});
  const [flatten, setFlatten] = useState(false);

  useEffect(() => {
    let active = true;
    readBytes(s.uri)
      .then(ops.getFormFields)
      .then(
        (f) => active && setFields(f),
        (e) => active && setLoadError(messageOf(e))
      );
    return () => {
      active = false;
    };
  }, [s.uri]);

  if (loadError) return <ErrorBanner message={loadError} />;
  if (!fields) return <Body secondary>{t('Membaca formulir…')}</Body>;
  if (fields.length === 0) return <ErrorBanner message={t('PDF ini tidak memiliki kolom yang bisa diisi.')} />;

  const valueOf = (f: ops.FormField) => (f.name in edits ? edits[f.name] : f.value);
  const set = (name: string, v: string | boolean) => setEdits((e) => ({ ...e, [name]: v }));
  const pages = [...new Set(fields.map((f) => f.page))];
  const changed = Object.keys(edits).length;

  return (
    <>
      {pages.map((page) => (
        <Card key={page}>
          {pages.length > 1 && <Label>{t('Halaman {n}', { n: page + 1 })}</Label>}
          {fields
            .filter((f) => f.page === page)
            .map((f) => {
              const label = fieldLabel(f.name);
              if (f.kind === 'checkbox') {
                return <SwitchRow key={f.name} label={label} value={valueOf(f) as boolean} onChange={(v) => !f.readOnly && set(f.name, v)} />;
              }
              if (f.kind === 'choice') {
                const current = valueOf(f) as string;
                return (
                  <View key={f.name} style={styles.choice}>
                    <Label>{label}</Label>
                    <View style={styles.chips}>
                      {f.options.map((o) => (
                        <Chip
                          key={o}
                          label={o}
                          selected={o === current}
                          // Tapping the selected option clears it.
                          onPress={() => !f.readOnly && set(f.name, o === current ? '' : o)}
                        />
                      ))}
                    </View>
                  </View>
                );
              }
              return (
                <Field
                  key={f.name}
                  label={label}
                  value={valueOf(f) as string}
                  onChangeText={(v) => set(f.name, v)}
                  editable={!f.readOnly}
                  multiline={f.multiline}
                  maxLength={f.maxLength}
                />
              );
            })}
        </Card>
      ))}
      <Card>
        <SwitchRow label={t('Kunci isian setelah disimpan')} value={flatten} onChange={setFlatten} />
        <Body secondary>
          {flatten
            ? t('Isian jadi bagian halaman dan tidak bisa diubah lagi.')
            : t('Isian tetap bisa diubah di aplikasi PDF lain.')}
        </Body>
      </Card>
      <RunSection
        title={t('Simpan formulir')}
        disabled={changed === 0 && !flatten}
        run={run}
        onPress={() => run.run(async () => [{ name: outName(s, 'diisi'), bytes: await ops.fillForm(await readBytes(s.uri), edits, { flatten }) }])}
      />
    </>
  );
}

export function FlattenTool({ initial }: ToolProps) {
  const src = usePdfSource(initial?.[0]);
  const run = useToolRun();
  const s = src.source;
  return (
    <Screen>
      <SourceCard source={s} onPick={src.pick} loading={src.loading} error={src.error} />
      {s && (
        <Card>
          <Body secondary>
            {s.info.hasForm
              ? t('Isian formulir akan dijadikan bagian dari halaman sehingga tidak bisa diubah lagi.')
              : t('PDF ini tidak memiliki formulir yang bisa diratakan.')}
          </Body>
        </Card>
      )}
      <RunSection
        title={t('Ratakan')}
        disabled={!s || !s.info.hasForm}
        run={run}
        onPress={() => run.run(async () => [{ name: outName(s!, 'rata'), bytes: await ops.flattenForm(await readBytes(s!.uri)) }])}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  swatches: { flexDirection: 'row', gap: Spacing.three },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 3 },
  page: { borderWidth: 1, backgroundColor: '#fff', overflow: 'hidden' },
  row: { flexDirection: 'row', gap: Spacing.two },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  choice: { gap: Spacing.two },
  savedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  // Signatures are drawn dark, so tiles stay white in dark mode too.
  savedTile: { width: '31%', aspectRatio: 2, borderRadius: 10, padding: 6, backgroundColor: '#fff', overflow: 'hidden' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
