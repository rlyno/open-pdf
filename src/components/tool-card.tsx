import { Pressable, StyleSheet, View } from 'react-native';

import { Pill, SymbolIcon, Txt, IconBadge } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/lib/i18n';
import { categoryColor, type ToolDef } from '@/lib/tools';

const ARROW = { ios: 'arrow.right', android: 'arrow_forward' } as const;

/** Toolbox card: icon, name + badge, description, feature line, arrow. */
export function ToolCard({ tool, onPress }: { tool: ToolDef; onPress: () => void }) {
  const theme = useTheme();
  const color = categoryColor(tool.category);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t(tool.title)}. ${t(tool.description)}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}>
      <View style={styles.cardTop}>
        <IconBadge icon={tool.icon} color={color} size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.titleRow}>
            <Txt variant="titleSm" numberOfLines={1} style={{ flexShrink: 1 }}>
              {t(tool.title)}
            </Txt>
            <Pill label={t(tool.badge)} tone={tool.badgeTone ?? 'accent'} />
          </View>
          <Txt variant="bodyMd" color="textSecondary" numberOfLines={1}>
            {t(tool.description)}
          </Txt>
        </View>
      </View>
      <View style={[styles.cardFoot, { borderTopColor: theme.border }]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Txt variant="labelMd" color="textSecondary" numberOfLines={1} style={{ flex: 1 }}>
          {t(tool.feature)}
        </Txt>
        <SymbolIcon icon={ARROW} size={16} color={theme.textSecondary} />
      </View>
    </Pressable>
  );
}

/** Compact two-up tile used for quick tools on the File hub. */
export function ToolTile({ tool, onPress }: { tool: ToolDef; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t(tool.title)}. ${t(tool.feature)}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: theme.surfaceLowest, transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}>
      <IconBadge icon={tool.icon} color={theme.accent} size={40} solid />
      <View style={{ flex: 1 }}>
        <Txt variant="labelLg" numberOfLines={1}>
          {t(tool.title)}
        </Txt>
        <Txt variant="bodySm" color="textMuted" numberOfLines={1}>
          {t(tool.badge)}
        </Txt>
      </View>
    </Pressable>
  );
}

/** Dense list row, used where a file has just been handed to the app. */
export function ToolRow({ tool, onPress }: { tool: ToolDef; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t(tool.title)}. ${t(tool.description)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? theme.surfaceHigh : 'transparent' }]}>
      <IconBadge icon={tool.icon} color={categoryColor(tool.category)} size={36} />
      <View style={{ flex: 1 }}>
        <Txt variant="titleSm">{t(tool.title)}</Txt>
        <Txt variant="bodySm" color="textSecondary">
          {t(tool.description)}
        </Txt>
      </View>
      <SymbolIcon icon={ARROW} size={16} color={theme.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.xl, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three, gap: 12 },
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  tile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: Radius.lg, padding: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: Radius.lg },
});
