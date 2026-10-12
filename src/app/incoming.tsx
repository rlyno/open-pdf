import { router, Stack } from 'expo-router';
import { useIncomingShare } from 'expo-sharing';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Body, Card, ErrorBanner, IconBadge, Label, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { messageOf } from '@/hooks/use-tool';
import { useTheme } from '@/hooks/use-theme';
import { formatBytes, importIncoming, type PickedFile } from '@/lib/files';
import { t } from '@/lib/i18n';
import { clearPendingUri, peekPendingUri } from '@/lib/incoming';
import { categoryColor, toolsFor, type ToolDef } from '@/lib/tools';

type Incoming = { uri: string; name: string | null; mimeType: string | null };
type Received = { pdfs: PickedFile[]; images: PickedFile[]; skipped: number };

const isPdf = (f: Incoming) => f.mimeType === 'application/pdf' || /\.pdf$/i.test(f.name ?? f.uri);
const isImage = (f: Incoming) => !!f.mimeType?.startsWith('image/') || /\.(jpe?g|png|heic|webp)$/i.test(f.name ?? f.uri);

/** Landing screen for files shared into the app or opened with it. */
export default function IncomingScreen() {
  const theme = useTheme();
  const [uri] = useState(peekPendingUri);
  const share = useIncomingShare();
  const [received, setReceived] = useState<Received | null>(null);
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
          <Label>{t('{n} gambar', { n: images.length })}</Label>
          <ToolList tools={toolsFor('images')} onPress={(tool) => open(tool, images)} />
        </>
      )}

      {pdfs.length > 1 && (
        <>
          <Label>{t('{n} PDF', { n: pdfs.length })}</Label>
          <ToolList tools={toolsFor('pdfs')} onPress={(tool) => open(tool, pdfs)} />
          <Label>{t('Atau pilih satu file')}</Label>
          <Card style={{ gap: Spacing.two }}>
            {pdfs.map((f, i) => (
              <Pressable
                key={f.uri}
                accessibilityRole="radio"
                accessibilityState={{ selected: i === selected }}
                onPress={() => setSelected(i)}
                style={styles.fileRow}>
                <View style={[styles.radio, { borderColor: i === selected ? theme.accent : theme.border }]}>
                  {i === selected && <View style={[styles.radioDot, { backgroundColor: theme.accent }]} />}
                </View>
                <Text numberOfLines={1} style={{ flex: 1, color: theme.text }}>
                  {f.name}
                </Text>
                <Text style={{ color: theme.textSecondary }}>{formatBytes(f.size)}</Text>
              </Pressable>
            ))}
          </Card>
        </>
      )}

      {current && (
        <>
          <Label>
            {pdfs.length > 1
              ? t('Alat untuk {name}', { name: current.name })
              : `${current.name} · ${formatBytes(current.size)}`}
          </Label>
          <ToolList tools={toolsFor('pdf')} onPress={(tool) => open(tool, [current])} />
        </>
      )}
    </Screen>
  );
}

function ToolList({ tools, onPress }: { tools: ToolDef[]; onPress: (tool: ToolDef) => void }) {
  const theme = useTheme();
  return (
    <Card style={{ padding: Spacing.two, gap: 0 }}>
      {tools.map((tool) => (
        <Pressable
          key={tool.id}
          accessibilityRole="button"
          accessibilityLabel={`${t(tool.title)}. ${t(tool.description)}`}
          onPress={() => onPress(tool)}
          style={({ pressed }) => [styles.toolRow, { opacity: pressed ? 0.6 : 1 }]}>
          <IconBadge icon={tool.icon} color={categoryColor(tool.category)} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontWeight: '600', fontSize: 16 }}>{t(tool.title)}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{t(tool.description)}</Text>
          </View>
        </Pressable>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.two },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 40 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
});
