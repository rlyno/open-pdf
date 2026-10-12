import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { Body, Screen } from '@/components/ui';
import type { PickedFile } from '@/lib/files';
import { t } from '@/lib/i18n';
import { getTool } from '@/lib/tools';
import { TOOL_SCREENS } from '@/tools';

export default function ToolScreen() {
  // `files` carries files shared into the app (see incoming.tsx) as JSON.
  const { id, files } = useLocalSearchParams<{ id: string; files?: string }>();
  const initial = useMemo(() => parseFiles(files), [files]);
  const tool = getTool(id);
  if (!tool) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('Tidak ditemukan') }} />
        <Body>{t('Alat tidak ditemukan.')}</Body>
      </Screen>
    );
  }
  const Tool = TOOL_SCREENS[tool.id];
  return (
    <>
      <Stack.Screen options={{ title: t(tool.title) }} />
      <Tool initial={initial} />
    </>
  );
}

function parseFiles(json?: string): PickedFile[] | undefined {
  if (!json) return undefined;
  try {
    const list = JSON.parse(json);
    return Array.isArray(list) && list.length ? list : undefined;
  } catch {
    return undefined;
  }
}
