import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PageGrid, RunButton, RunOutput, RunSection, SourceCard } from '@/components/pdf-parts';
import { Body, Button, Card, Field, Label, Screen, Segmented, Stepper, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { outName, type ToolProps, usePdfSource, useToolRun } from '@/hooks/use-tool';
import { baseName, formatBytes, pickPdfs, readBytes, type PickedFile } from '@/lib/files';
import { t } from '@/lib/i18n';
import * as ops from '@/lib/pdf/ops';

export function MergeTool({ initial }: ToolProps) {
  const [files, setFiles] = useState<PickedFile[]>(initial ?? []);
  const run = useToolRun();

  async function add() {
    const picked = await pickPdfs(true);
    setFiles((f) => [...f, ...picked]);
  }
  function move(i: number, d: number) {
    setFiles((f) => {
      const next = [...f];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });
  }

  return (
    <Screen>
      <Card>
        {files.length === 0 && <Body secondary>{t('Tambahkan dua file PDF atau lebih. Urutan di bawah = urutan hasil.')}</Body>}
        {files.map((f, i) => (
          <View key={`${f.uri}-${i}`} style={styles.listRow}>
            <Txt variant="labelLg" color="textMuted" style={styles.index}>{i + 1}</Txt>
            <View style={{ flex: 1 }}>
              <Txt variant="labelLg" numberOfLines={1}>
                {f.name}
              </Txt>
              <Txt variant="bodySm" color="textMuted">{formatBytes(f.size)}</Txt>
            </View>
            <Button title="↑" compact variant="secondary" disabled={i === 0} onPress={() => move(i, -1)} />
            <Button title="↓" compact variant="secondary" disabled={i === files.length - 1} onPress={() => move(i, 1)} />
            <Button title="✕" compact variant="secondary" onPress={() => setFiles((x) => x.filter((_, k) => k !== i))} />
          </View>
        ))}
        <Button title={t('Tambah PDF')} variant="secondary" icon={{ ios: 'plus', android: 'add' }} onPress={add} />
      </Card>
      <RunSection
        title={files.length ? t('Gabungkan {n} file', { n: files.length }) : t('Gabungkan')}
        disabled={files.length < 2}
        run={run}
        onPress={() =>
          run.run(async () => {
            const bytes = await Promise.all(files.map((f) => readBytes(f.uri)));
            return [{ name: `${baseName(files[0].name)}-${t('gabungan')}.pdf`, bytes: await ops.merge(bytes) }];
          })
        }
      />
    </Screen>
  );
}

export function SplitTool({ initial }: ToolProps) {
  const src = usePdfSource(initial?.[0]);
  const run = useToolRun();
  const [mode, setMode] = useState<'ranges' | 'every'>('every');
  const [ranges, setRanges] = useState('');
  const [every, setEvery] = useState(1);
  const s = src.source;

  return (
    <Screen>
      <SourceCard source={s} onPick={src.pick} loading={src.loading} error={src.error} />
      {s && (
        <Card>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'every', label: t('Tiap N halaman') },
              { value: 'ranges', label: t('Rentang khusus') },
            ]}
          />
          {mode === 'every' ? (
            <>
              <Stepper label={t('Halaman per file')} value={every} onChange={setEvery} min={1} max={Math.max(1, s.info.pageCount - 1)} />
              <Body secondary>{t('Menghasilkan {n} file.', { n: Math.ceil(s.info.pageCount / every) })}</Body>
            </>
          ) : (
            <Field
              label={t('Rentang (satu file per bagian)')}
              value={ranges}
              onChangeText={setRanges}
              placeholder={t('contoh: 1-3, 4-{n}', { n: s.info.pageCount })}
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
            />
          )}
        </Card>
      )}
      <RunSection
        title={t('Pisahkan')}
        disabled={!s || (mode === 'ranges' && !ranges.trim())}
        run={run}
        onPress={() =>
          run.run(async () => {
            const bytes = await readBytes(s!.uri);
            const parts =
              mode === 'every'
                ? await ops.splitEvery(bytes, every)
                : await ops.splitIntoGroups(bytes, ops.parseRangeGroups(ranges, s!.info.pageCount));
            return parts.map((b, i) => ({ name: outName(s!, t('bagian-{n}', { n: i + 1 })), bytes: b }));
          })
        }
      />
    </Screen>
  );
}

/** Builds a new page order by tapping pages; tap again to remove. */
export function OrganizeTool({ initial }: ToolProps) {
  const src = usePdfSource(initial?.[0]);
  const run = useToolRun();
  const [order, setOrder] = useState<number[]>([]);
  const s = src.source;
  const all = s ? s.info.pageSizes.map((_, i) => i) : [];

  function toggle(i: number) {
    setOrder((o) => (o.includes(i) ? o.filter((x) => x !== i) : [...o, i]));
  }

  return (
    <Screen
      scrollToTopKey={run.results.length}
      footer={
        <RunButton
          title={t('Buat PDF ({n} halaman)', { n: order.length })}
          disabled={!s || order.length === 0}
          run={run}
          onPress={() =>
            run.run(async () => [{ name: outName(s!, 'diatur'), bytes: await ops.selectPages(await readBytes(s!.uri), order) }])
          }
        />
      }>
      <SourceCard source={s} onPick={async () => { await src.pick(); setOrder([]); }} loading={src.loading} error={src.error} />
      <RunOutput run={run} />
      {s && (
        <>
          <Card>
            <Body secondary>{t('Ketuk halaman sesuai urutan yang kamu mau. Halaman yang tidak diketuk tidak ikut.')}</Body>
            <View style={styles.wrap}>
              <Button title={t('Semua')} compact variant="secondary" onPress={() => setOrder(all)} />
              <Button title={t('Balik urutan')} compact variant="secondary" onPress={() => setOrder([...all].reverse())} />
              <Button title={t('Ganjil')} compact variant="secondary" onPress={() => setOrder(all.filter((i) => i % 2 === 0))} />
              <Button title={t('Genap')} compact variant="secondary" onPress={() => setOrder(all.filter((i) => i % 2 === 1))} />
              <Button title={t('Reset')} compact variant="secondary" onPress={() => setOrder([])} />
            </View>
            <Txt variant="bodyMd" color="textSecondary">
              {order.length
                ? t('Urutan baru: {pages}', { pages: order.map((i) => i + 1).join(', ') })
                : t('Belum ada halaman dipilih.')}
            </Txt>
          </Card>
          <PageGrid
            source={s}
            selected={(i) => order.includes(i)}
            badge={(i) => (order.includes(i) ? String(order.indexOf(i) + 1) : undefined)}
            onPress={toggle}
          />
        </>
      )}
    </Screen>
  );
}

export function RotateTool({ initial }: ToolProps) {
  const src = usePdfSource(initial?.[0]);
  const run = useToolRun();
  const [angle, setAngle] = useState(90);
  const [scope, setScope] = useState<'all' | 'some'>('all');
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const s = src.source;
  const affected = (i: number) => scope === 'all' || picked.has(i);

  return (
    <Screen
      scrollToTopKey={run.results.length}
      footer={
        <RunButton
          title={t('Putar')}
          disabled={!s || (scope === 'some' && picked.size === 0)}
          run={run}
          onPress={() =>
            run.run(async () => [
              {
                name: outName(s!, 'diputar'),
                bytes: await ops.rotate(await readBytes(s!.uri), angle, scope === 'all' ? undefined : [...picked]),
              },
            ])
          }
        />
      }>
      <SourceCard source={s} onPick={async () => { await src.pick(); setPicked(new Set()); }} loading={src.loading} error={src.error} />
      <RunOutput run={run} />
      {s && (
        <>
          <Card>
            <Segmented
              label={t('Putar')}
              value={angle}
              onChange={setAngle}
              options={[
                { value: 90, label: t('90° kanan') },
                { value: 180, label: '180°' },
                { value: 270, label: t('90° kiri') },
              ]}
            />
            <Segmented
              label={t('Halaman')}
              value={scope}
              onChange={setScope}
              options={[
                { value: 'all', label: t('Semua') },
                { value: 'some', label: t('Pilih sendiri') },
              ]}
            />
            {scope === 'some' && <Body secondary>{t('Ketuk halaman yang ingin diputar ({n} dipilih).', { n: picked.size })}</Body>}
          </Card>
          <PageGrid
            source={s}
            selected={(i) => scope === 'some' && picked.has(i)}
            rotation={(i) => (affected(i) ? angle : 0)}
            onPress={(i) => {
              if (scope !== 'some') return;
              setPicked((p) => {
                const n = new Set(p);
                if (n.has(i)) n.delete(i);
                else n.add(i);
                return n;
              });
            }}
          />
        </>
      )}
    </Screen>
  );
}

export function RemovePagesTool({ initial }: ToolProps) {
  const src = usePdfSource(initial?.[0]);
  const run = useToolRun();
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const s = src.source;

  return (
    <Screen
      scrollToTopKey={run.results.length}
      footer={
        <RunButton
          title={t('Hapus {n} halaman', { n: picked.size })}
          disabled={!s || picked.size === 0}
          run={run}
          onPress={() =>
            run.run(async () => [{ name: outName(s!, 'dihapus'), bytes: await ops.removePages(await readBytes(s!.uri), [...picked]) }])
          }
        />
      }>
      <SourceCard source={s} onPick={async () => { await src.pick(); setPicked(new Set()); }} loading={src.loading} error={src.error} />
      <RunOutput run={run} />
      {s && (
        <>
          <Body secondary>{t('Ketuk halaman yang ingin dihapus ({n} dipilih).', { n: picked.size })}</Body>
          <PageGrid
            source={s}
            selected={(i) => picked.has(i)}
            badge={(i) => (picked.has(i) ? '✕' : undefined)}
            onPress={(i) =>
              setPicked((p) => {
                const n = new Set(p);
                if (n.has(i)) n.delete(i);
                else n.add(i);
                return n;
              })
            }
          />
        </>
      )}
    </Screen>
  );
}

export function NUpTool({ initial }: ToolProps) {
  const src = usePdfSource(initial?.[0]);
  const run = useToolRun();
  const [per, setPer] = useState<2 | 4>(2);
  const s = src.source;
  return (
    <Screen>
      <SourceCard source={s} onPick={src.pick} loading={src.loading} error={src.error} />
      {s && (
        <Card>
          <Segmented
            label={t('Halaman per lembar')}
            value={per}
            onChange={setPer}
            options={[
              { value: 2, label: t('2 (lanskap)') },
              { value: 4, label: t('4 (potret)') },
            ]}
          />
          <Label>{t('Hasil: {n} lembar A4', { n: Math.ceil(s.info.pageCount / per) })}</Label>
        </Card>
      )}
      <RunSection
        title={t('Buat')}
        disabled={!s}
        run={run}
        onPress={() => run.run(async () => [{ name: outName(s!, `${per}-up`), bytes: await ops.nUp(await readBytes(s!.uri), per) }])}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  index: { width: 20, textAlign: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
