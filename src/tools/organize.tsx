import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PageGrid, RunSection, SourceCard } from '@/components/pdf-parts';
import { Body, Button, Card, Field, Label, Screen, Segmented, Stepper } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { outName, usePdfSource, useToolRun } from '@/hooks/use-tool';
import { useTheme } from '@/hooks/use-theme';
import { baseName, formatBytes, pickPdfs, readBytes, type PickedFile } from '@/lib/files';
import * as ops from '@/lib/pdf/ops';

export function MergeTool() {
  const theme = useTheme();
  const [files, setFiles] = useState<PickedFile[]>([]);
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
        {files.length === 0 && <Body secondary>Tambahkan dua file PDF atau lebih. Urutan di bawah = urutan hasil.</Body>}
        {files.map((f, i) => (
          <View key={`${f.uri}-${i}`} style={styles.listRow}>
            <Text style={[styles.index, { color: theme.textSecondary }]}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: theme.text, fontWeight: '600', fontSize: 15 }}>
                {f.name}
              </Text>
              <Text style={{ color: theme.textSecondary }}>{formatBytes(f.size)}</Text>
            </View>
            <Button title="↑" compact variant="secondary" disabled={i === 0} onPress={() => move(i, -1)} />
            <Button title="↓" compact variant="secondary" disabled={i === files.length - 1} onPress={() => move(i, 1)} />
            <Button title="✕" compact variant="secondary" onPress={() => setFiles((x) => x.filter((_, k) => k !== i))} />
          </View>
        ))}
        <Button title="Tambah PDF" variant="secondary" icon={{ ios: 'plus', android: 'add' }} onPress={add} />
      </Card>
      <RunSection
        title={`Gabungkan ${files.length || ''} file`}
        disabled={files.length < 2}
        run={run}
        onPress={() =>
          run.run(async () => {
            const bytes = await Promise.all(files.map((f) => readBytes(f.uri)));
            return [{ name: `${baseName(files[0].name)}-gabungan.pdf`, bytes: await ops.merge(bytes) }];
          })
        }
      />
    </Screen>
  );
}

export function SplitTool() {
  const src = usePdfSource();
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
              { value: 'every', label: 'Tiap N halaman' },
              { value: 'ranges', label: 'Rentang khusus' },
            ]}
          />
          {mode === 'every' ? (
            <>
              <Stepper label="Halaman per file" value={every} onChange={setEvery} min={1} max={Math.max(1, s.info.pageCount - 1)} />
              <Body secondary>Menghasilkan {Math.ceil(s.info.pageCount / every)} file.</Body>
            </>
          ) : (
            <Field
              label="Rentang (satu file per bagian)"
              value={ranges}
              onChangeText={setRanges}
              placeholder={`contoh: 1-3, 4-${s.info.pageCount}`}
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
            />
          )}
        </Card>
      )}
      <RunSection
        title="Pisahkan"
        disabled={!s || (mode === 'ranges' && !ranges.trim())}
        run={run}
        onPress={() =>
          run.run(async () => {
            const bytes = await readBytes(s!.uri);
            const parts =
              mode === 'every'
                ? await ops.splitEvery(bytes, every)
                : await ops.splitIntoGroups(bytes, ops.parseRangeGroups(ranges, s!.info.pageCount));
            return parts.map((b, i) => ({ name: outName(s!, `bagian-${i + 1}`), bytes: b }));
          })
        }
      />
    </Screen>
  );
}

/** Builds a new page order by tapping pages; tap again to remove. */
export function OrganizeTool() {
  const theme = useTheme();
  const src = usePdfSource();
  const run = useToolRun();
  const [order, setOrder] = useState<number[]>([]);
  const s = src.source;
  const all = s ? s.info.pageSizes.map((_, i) => i) : [];

  function toggle(i: number) {
    setOrder((o) => (o.includes(i) ? o.filter((x) => x !== i) : [...o, i]));
  }

  return (
    <Screen>
      <SourceCard source={s} onPick={async () => { await src.pick(); setOrder([]); }} loading={src.loading} error={src.error} />
      {s && (
        <>
          <Card>
            <Body secondary>Ketuk halaman sesuai urutan yang kamu mau. Halaman yang tidak diketuk tidak ikut.</Body>
            <View style={styles.wrap}>
              <Button title="Semua" compact variant="secondary" onPress={() => setOrder(all)} />
              <Button title="Balik urutan" compact variant="secondary" onPress={() => setOrder([...all].reverse())} />
              <Button title="Ganjil" compact variant="secondary" onPress={() => setOrder(all.filter((i) => i % 2 === 0))} />
              <Button title="Genap" compact variant="secondary" onPress={() => setOrder(all.filter((i) => i % 2 === 1))} />
              <Button title="Reset" compact variant="secondary" onPress={() => setOrder([])} />
            </View>
            <Text style={{ color: theme.textSecondary }}>
              {order.length ? `Urutan baru: ${order.map((i) => i + 1).join(', ')}` : 'Belum ada halaman dipilih.'}
            </Text>
          </Card>
          <PageGrid
            source={s}
            selected={(i) => order.includes(i)}
            badge={(i) => (order.includes(i) ? String(order.indexOf(i) + 1) : undefined)}
            onPress={toggle}
          />
        </>
      )}
      <RunSection
        title={`Buat PDF (${order.length} halaman)`}
        disabled={!s || order.length === 0}
        run={run}
        onPress={() =>
          run.run(async () => [{ name: outName(s!, 'diatur'), bytes: await ops.selectPages(await readBytes(s!.uri), order) }])
        }
      />
    </Screen>
  );
}

export function RotateTool() {
  const src = usePdfSource();
  const run = useToolRun();
  const [angle, setAngle] = useState(90);
  const [scope, setScope] = useState<'all' | 'some'>('all');
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const s = src.source;
  const affected = (i: number) => scope === 'all' || picked.has(i);

  return (
    <Screen>
      <SourceCard source={s} onPick={async () => { await src.pick(); setPicked(new Set()); }} loading={src.loading} error={src.error} />
      {s && (
        <>
          <Card>
            <Segmented
              label="Putar"
              value={angle}
              onChange={setAngle}
              options={[
                { value: 90, label: '90° kanan' },
                { value: 180, label: '180°' },
                { value: 270, label: '90° kiri' },
              ]}
            />
            <Segmented
              label="Halaman"
              value={scope}
              onChange={setScope}
              options={[
                { value: 'all', label: 'Semua' },
                { value: 'some', label: 'Pilih sendiri' },
              ]}
            />
            {scope === 'some' && <Body secondary>Ketuk halaman yang ingin diputar ({picked.size} dipilih).</Body>}
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
      <RunSection
        title="Putar"
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
    </Screen>
  );
}

export function RemovePagesTool() {
  const src = usePdfSource();
  const run = useToolRun();
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const s = src.source;

  return (
    <Screen>
      <SourceCard source={s} onPick={async () => { await src.pick(); setPicked(new Set()); }} loading={src.loading} error={src.error} />
      {s && (
        <>
          <Body secondary>Ketuk halaman yang ingin dihapus ({picked.size} dipilih).</Body>
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
      <RunSection
        title={`Hapus ${picked.size} halaman`}
        disabled={!s || picked.size === 0}
        run={run}
        onPress={() =>
          run.run(async () => [{ name: outName(s!, 'dihapus'), bytes: await ops.removePages(await readBytes(s!.uri), [...picked]) }])
        }
      />
    </Screen>
  );
}

export function NUpTool() {
  const src = usePdfSource();
  const run = useToolRun();
  const [per, setPer] = useState<2 | 4>(2);
  const s = src.source;
  return (
    <Screen>
      <SourceCard source={s} onPick={src.pick} loading={src.loading} error={src.error} />
      {s && (
        <Card>
          <Segmented
            label="Halaman per lembar"
            value={per}
            onChange={setPer}
            options={[
              { value: 2, label: '2 (lanskap)' },
              { value: 4, label: '4 (potret)' },
            ]}
          />
          <Label>Hasil: {Math.ceil(s.info.pageCount / per)} lembar A4</Label>
        </Card>
      )}
      <RunSection
        title="Buat"
        disabled={!s}
        run={run}
        onPress={() => run.run(async () => [{ name: outName(s!, `${per}-up`), bytes: await ops.nUp(await readBytes(s!.uri), per) }])}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  index: { width: 20, fontWeight: '700', textAlign: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
