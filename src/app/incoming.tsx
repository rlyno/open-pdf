import { router, Stack } from 'expo-router';
import { useIncomingShare } from 'expo-sharing';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ToolRow } from '@/components/tool-card';
import { Body, Button, Card, ErrorBanner, IconBadge, Label, Screen, SectionHeader, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { messageOf } from '@/hooks/use-tool';
import { useTheme } from '@/hooks/use-theme';
import { formatBytes, importIncoming, type PickedFile } from '@/lib/files';
import { t } from '@/lib/i18n';
import { clearPendingFiles, clearPendingUri, peekPendingFiles, peekPendingUri } from '@/lib/incoming';
import { openViewer } from '@/lib/navigation';
import { toolsFor, type ToolDef } from '@/lib/tools';

type Incoming = { uri: string; name: string | null; mimeType: string | null };
type Received = { pdfs: PickedFile[]; images: PickedFile[]; skipped: number };

const isPdf = (f: Incoming) => f.mimeType === 'application/pdf' || /\.pdf$/i.test(f.name ?? f.uri);
const isImage = (f: Incoming) => !!f.mimeType?.startsWith('image/') || /\.(jpe?g|png|heic|webp)$/i.test(f.name ?? f.uri);

/** Landing screen for files shared into the app or opened with it. */
export default function IncomingScreen() {
  const theme = useTheme();
  const [uri] = useState(peekPendingUri);
  // Files picked inside the app are already local; no import needed.
  const [preset] = useState(peekPendingFiles);
  const share = useIncomingShare();
  const [received, setReceived] = useState<Received | null>(() =>
    preset.length
      ? {
          pdfs: preset.filter((f) => /\.pdf$/i.test(f.name)),
          images: preset.filter((f) => !/\.pdf$/i.test(f.name)),
          skipped: 0,
        }
      : null
  );

  useEffect(() => {
    if (preset.length) clearPendingFiles();
  }, [preset]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);

  const ready = !!uri || !share.isResolving;
  const sources: Incoming[] = uri
    ? [{ uri, name: null, mimeType: 'application/pdf' }]
    : share.resolvedSharedPayloads.flatMap((p) =>
        p.contentUri && p.contentType !== 'text' && p.contentType !== 'website'
          ? [{ uri: p.contentUri, name: p.originalName, mimeType: p.contentMimeType }]
          : []
      );
  const sourceKey = sources.map((s) => s.uri).join('|');

  useEffect(() => {
    if (!ready || received) return;
    let active = true;
    (async () => {
      const pdfs: PickedFile[] = [];
      const images: PickedFile[] = [];
      let skipped = 0;
      for (const s of sources) {
        if (isPdf(s)) pdfs.push(await importIncoming(s.uri, s.name, 'pdf'));
        else if (isImage(s)) images.push(await importIncoming(s.uri, s.name, s.mimeType === 'image/png' ? 'png' : 'jpg'));
        else skipped++;
      }
      return { pdfs, images, skipped };
    })()
      .then(
        (r) => {
          if (!active) return;
          setReceived(r);
          // Everything is copied now; clear the hand-off so it isn't reused.
          if (uri) clearPendingUri();
          else share.clearSharedPayloads();
        },
        (e) => active && setError(messageOf(e))
      );
    return () => {
      active = false;
    };
    // sourceKey stands in for `sources`, which is rebuilt on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, sourceKey]);

  function open(tool: ToolDef, files: PickedFile[]) {
    router.replace({ pathname: '/tool/[id]', params: { id: tool.id, files: JSON.stringify(files) } });
  }

  if (error) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('Buka file') }} />
        <ErrorBanner message={t('Gagal membuka file. {error}', { error })} />
      </Screen>
    );
  }
  if (!received) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: t('Buka file') }} />
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  const { pdfs, images, skipped } = received;
  const current = pdfs[selected];
  return (
    <Screen>
      <Stack.Screen options={{ title: t('Buka file') }} />
      {pdfs.length === 0 && images.length === 0 && (
        <Card>
          <Body secondary>{t('Tidak ada PDF atau gambar yang bisa diproses.')}</Body>
        </Card>
      )}
      {skipped > 0 && <Body secondary>{t('{n} file dilewati karena bukan PDF atau gambar.', { n: skipped })}</Body>}

      {images.length > 0 && (
        <>
          <SectionHeader title={t('{n} gambar', { n: images.length })} />
          <ToolList tools={toolsFor('images')} onPress={(tool) => open(tool, images)} />
        </>
      )}

      {pdfs.length > 1 && (
        <>
          <SectionHeader title={t('{n} PDF', { n: pdfs.length })} />
          <ToolList tools={toolsFor('pdfs')} onPress={(tool) => open(tool, pdfs)} />
          <Label>{t('Atau pilih satu file')}</Label>
          <Card style={{ gap: 4, padding: Spacing.two }}>
            {pdfs.map((f, i) => (
              <Pressable
                key={f.uri}
                accessibilityRole="radio"
                accessibilityState={{ selected: i === selected }}
                onPress={() => setSelected(i)}
                style={[styles.fileRow, i === selected && { backgroundColor: theme.accentSoft }]}>
                <View style={[styles.radio, { borderColor: i === selected ? theme.accent : theme.textMuted }]}>
                  {i === selected && <View style={[styles.radioDot, { backgroundColor: theme.accent }]} />}
                </View>
                <Txt variant="labelLg" numberOfLines={1} style={{ flex: 1 }}>
                  {f.name}
                </Txt>
                <Txt variant="bodySm" color="textMuted">
                  {formatBytes(f.size)}
                </Txt>
              </Pressable>
            ))}
          </Card>
        </>
      )}

      {current && (
        <>
          <Card style={styles.active}>
            <IconBadge icon={{ ios: 'doc.fill', android: 'picture_as_pdf' }} color={theme.accent} size={40} solid />
            <View style={{ flex: 1 }}>
              <Label>{pdfs.length > 1 ? t('File terpilih') : t('Dokumen aktif')}</Label>
              <Txt variant="titleSm" numberOfLines={1}>
                {current.name}
              </Txt>
            </View>
            <Button title={t('Lihat')} compact variant="secondary" icon={{ ios: 'eye', android: 'visibility' }} onPress={() => openViewer(current)} />
          </Card>
          <ToolList tools={toolsFor('pdf')} onPress={(tool) => open(tool, [current])} />
        </>
      )}
    </Screen>
  );
}

function ToolList({ tools, onPress }: { tools: ToolDef[]; onPress: (tool: ToolDef) => void }) {
  return (
    <Card style={{ padding: Spacing.one, gap: 0 }}>
      {tools.map((tool) => (
        <ToolRow key={tool.id} tool={tool} onPress={() => onPress(tool)} />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  active: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 44, borderRadius: 10, paddingHorizontal: 8 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
});
