import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { saveWithFeedback } from '@/components/pdf-parts';
import { Body, Button, Card, IconBadge, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteOutput, formatBytes, listOutputs, shareFile, type OutputFile } from '@/lib/files';

const ICONS = {
  pdf: { ios: 'doc.fill', android: 'picture_as_pdf' },
  zip: { ios: 'doc.zipper', android: 'folder_zip' },
  image: { ios: 'photo', android: 'image' },
} as const;

function iconFor(f: OutputFile) {
  if (f.mimeType === 'application/zip') return ICONS.zip;
  if (f.mimeType.startsWith('image/')) return ICONS.image;
  return ICONS.pdf;
}

export default function FilesScreen() {
  const theme = useTheme();
  const [files, setFiles] = useState<OutputFile[]>(listOutputs);
  const refresh = useCallback(() => setFiles(listOutputs()), []);
  useFocusEffect(refresh);

  function confirmDelete(f: OutputFile) {
    Alert.alert('Hapus file?', f.name, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () => {
          deleteOutput(f.uri);
          refresh();
        },
      },
    ]);
  }

  return (
    <Screen topInset>
      <Text style={[styles.title, { color: theme.text }]}>File</Text>
      {files.length === 0 ? (
        <Card>
          <Body secondary>Belum ada hasil. File yang kamu buat dengan alat-alat akan muncul di sini.</Body>
        </Card>
      ) : (
        <Body secondary>
          {files.length} file · {formatBytes(files.reduce((n, f) => n + f.size, 0))} tersimpan di aplikasi
        </Body>
      )}
      {files.map((f) => (
        <Card key={f.uri} style={{ gap: Spacing.two }}>
          <View style={styles.row}>
            <IconBadge icon={iconFor(f)} color={theme.accent} size={40} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={2} style={{ color: theme.text, fontWeight: '600', fontSize: 15 }}>
                {f.name}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                {formatBytes(f.size)} · {new Date(f.modified).toLocaleString('id-ID')}
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Button title="Bagikan" compact variant="secondary" icon={{ ios: 'square.and.arrow.up', android: 'share' }} onPress={() => shareFile(f)} />
            <Button title="Simpan" compact variant="secondary" icon={{ ios: 'square.and.arrow.down', android: 'download' }} onPress={() => saveWithFeedback(f)} />
            <Button title="Hapus" compact variant="danger" onPress={() => confirmDelete(f)} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  actions: { flexDirection: 'row', gap: Spacing.two, justifyContent: 'flex-end' },
});
