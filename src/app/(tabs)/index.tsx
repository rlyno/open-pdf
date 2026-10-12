import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { IconBadge, Label, Screen } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/lib/i18n';
import { CATEGORIES, TOOLS, categoryColor, type ToolDef } from '@/lib/tools';

export default function ToolsScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  // Match both languages, so "merge" and "gabung" both find the tool.
  const matches = (tool: ToolDef) =>
    !q ||
    [tool.title, tool.description, t(tool.title), t(tool.description), tool.keywords ?? '']
      .join(' ')
      .toLowerCase()
      .includes(q);
  const cols = Math.min(width, MaxContentWidth) > 560 ? 3 : 2;
  // Floor so rounding never pushes the last tile onto its own row.
  const tileWidth = Math.floor((Math.min(width, MaxContentWidth) - Spacing.three * 2 - Spacing.two * (cols - 1)) / cols);
  const visible = CATEGORIES.map((c) => ({ ...c, tools: TOOLS.filter((tool) => tool.category === c.id && matches(tool)) })).filter(
    (c) => c.tools.length > 0
  );

  return (
    <Screen topInset>
      <View style={{ gap: 4 }}>
        <Text style={[styles.title, { color: theme.text }]}>Open PDF</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 16 }}>
          {t('Alat PDF lengkap, gratis, dan 100% di perangkat.')}
        </Text>
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t('Cari alat… (gabung, kompres, password)')}
        placeholderTextColor={theme.textSecondary}
        clearButtonMode="while-editing"
        autoCorrect={false}
        style={[styles.search, { backgroundColor: theme.backgroundElement, color: theme.text }]}
      />
      {visible.length === 0 && <Text style={{ color: theme.textSecondary }}>{t('Tidak ada alat yang cocok.')}</Text>}
      {visible.map((cat) => (
        <View key={cat.id} style={{ gap: Spacing.two }}>
          <Label>{t(cat.title)}</Label>
          <View style={styles.grid}>
            {cat.tools.map((tool) => (
              <Pressable
                key={tool.id}
                accessibilityRole="button"
                accessibilityLabel={`${t(tool.title)}. ${t(tool.description)}`}
                onPress={() => router.push({ pathname: '/tool/[id]', params: { id: tool.id } })}
                style={({ pressed }) => [
                  styles.tile,
                  { width: tileWidth, backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
                ]}>
                <IconBadge icon={tool.icon} color={categoryColor(tool.category)} size={40} />
                <Text style={[styles.tileTitle, { color: theme.text }]}>{t(tool.title)}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 18 }} numberOfLines={2}>
                  {t(tool.description)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  search: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: { borderRadius: 16, padding: 14, gap: 8, minHeight: 132 },
  tileTitle: { fontSize: 16, fontWeight: '700' },
});
