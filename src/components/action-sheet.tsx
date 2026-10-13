import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SymbolIcon, Txt, type Icon } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/lib/i18n';

export type SheetAction = { label: string; icon: Icon; onPress: () => void; destructive?: boolean };

/** Bottom sheet over a dark scrim, with the design's grab handle. */
export function ActionSheet({
  visible,
  title,
  actions,
  onClose,
}: {
  visible: boolean;
  title?: string;
  actions: SheetAction[];
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityLabel={t('Tutup')} style={styles.scrim} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.surface, borderColor: theme.border, paddingBottom: insets.bottom + Spacing.three },
        ]}>
        <View style={[styles.handle, { backgroundColor: theme.textMuted }]} />
        {title && (
          <Txt variant="labelLg" color="textSecondary" numberOfLines={1} style={styles.title}>
            {title}
          </Txt>
        )}
        {actions.map((a) => {
          const color = a.destructive ? theme.dangerText : theme.text;
          return (
            <Pressable
              key={a.label}
              accessibilityRole="button"
              onPress={() => {
                onClose();
                a.onPress();
              }}
              style={({ pressed }) => [styles.action, pressed && { backgroundColor: theme.surfaceHigh }]}>
              <SymbolIcon icon={a.icon} size={20} color={a.destructive ? theme.dangerText : theme.textSecondary} />
              <Txt variant="bodyLg" style={{ color }}>
                {a.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    borderTopLeftRadius: Radius.xl + 8,
    borderTopRightRadius: Radius.xl + 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.two,
    paddingTop: 10,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.two, opacity: 0.6 },
  title: { paddingHorizontal: 12, paddingBottom: Spacing.two },
  action: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 12, minHeight: 52, borderRadius: Radius.lg },
});
