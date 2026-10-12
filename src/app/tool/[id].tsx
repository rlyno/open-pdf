import { Stack, useLocalSearchParams } from 'expo-router';

import { Body, Screen } from '@/components/ui';
import { getTool } from '@/lib/tools';
import { TOOL_SCREENS } from '@/tools';

export default function ToolScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tool = getTool(id);
  if (!tool) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Tidak ditemukan' }} />
        <Body>Alat tidak ditemukan.</Body>
      </Screen>
    );
  }
  const Tool = TOOL_SCREENS[tool.id];
  return (
    <>
      <Stack.Screen options={{ title: tool.title }} />
      <Tool />
    </>
  );
}
