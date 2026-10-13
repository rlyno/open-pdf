import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ToolCard } from '@/components/tool-card';
import { Card, Chip, PageHeader, Screen, SectionHeader, SymbolIcon, Txt, type Icon } from '@/components/ui';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/lib/i18n';
import { CATEGORIES, TOOLS, type CategoryId, type ToolDef } from '@/lib/tools';

const CATEGORY_ICONS: Record<CategoryId, Icon> = {
  organize: { ios: 'square.grid.2x2', android: 'grid_view' },
  convert: { ios: 'arrow.left.arrow.right', android: 'swap_horiz' },
  edit: { ios: 'pencil.and.outline', android: 'edit_note' },
  security: { ios: 'lock', android: 'lock' },
};

/** All tools, grouped by category, searchable in both languages. */
export default function ToolsScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryId | 'all'>('all');
  const q = query.trim().toLowerCase();
  const matches = (tool: ToolDef) =>
    !q ||
    [tool.title, tool.description, t(tool.title), t(tool.description), tool.keywords ?? '']
      .join(' ')
      .toLowerCase()
      .includes(q);
  const sections = CATEGORIES.filter((c) => category === 'all' || c.id === category)
    .map((c) => ({ ...c, tools: TOOLS.filter((tool) => tool.category === c.id && matches(tool)) }))
    .filter((c) => c.tools.length > 0);

  return (
    <Screen tabBar>
      <PageHeader title={t('Alat')} />
      <View style={[styles.search, { backgroundColor: theme.surfaceLowest, borderColor: theme.border }]}>
        <SymbolIcon icon={{ ios: 'magnifyingglass', android: 'search' }} size={18} color={theme.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('Cari {n} alat (gabung, kompres, password)…', { n: TOOLS.length })}
          placeholderTextColor={theme.textMuted}
          clearButtonMode="while-editing"
          autoCorrect={false}
          style={[Type.bodyMd, styles.searchInput, { color: theme.text }]}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip
          label={t('Semua')}
          icon={{ ios: 'sparkles', android: 'auto_awesome' }}
          selected={category === 'all'}
          onPress={() => setCategory('all')}
        />
        {CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            label={t(c.title)}
            icon={CATEGORY_ICONS[c.id]}
            selected={category === c.id}
            onPress={() => setCategory(c.id)}
          />
        ))}
      </ScrollView>

      {sections.length === 0 && (
        <Txt variant="bodyMd" color="textSecondary">
          {t('Tidak ada alat yang cocok.')}
        </Txt>
      )}
      {sections.map((section) => (
        <View key={section.id} style={{ gap: 12 }}>
          <SectionHeader
            title={t(section.title)}
            count={t('{n} alat', { n: section.tools.length })}
            color={section.color}
          />
          {section.tools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onPress={() => router.push({ pathname: '/tool/[id]', params: { id: tool.id } })}
            />
          ))}
        </View>
      ))}

      <Card style={styles.engine}>
        <View style={[styles.engineIcon, { backgroundColor: theme.surfaceHigh }]}>
          <SymbolIcon icon={{ ios: 'checkmark.shield', android: 'verified_user' }} size={20} color={theme.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="labelLg">{t('Mesin PDF lokal aktif')}</Txt>
          <Txt variant="bodySm" color="textSecondary">
            {t('Semua alat bekerja offline · Tanpa telemetri')}
          </Txt>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 46,
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, height: '100%' },
  chips: { gap: 6 },
  engine: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: Spacing.two },
  engineIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
