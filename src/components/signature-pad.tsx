import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/lib/i18n';
import { strokesToPath, type DrawnPath, type Point } from '@/lib/pdf/ops';

export const INK_COLORS = ['#111111', '#1A3399'];
export const INK_WIDTH = 3;

/** Uncropped live path for the strokes being drawn. */
function livePath(strokes: Point[][]) {
  return strokes
    .filter((s) => s.length)
    .map((s) => `M${s[0].x} ${s[0].y} ` + s.slice(1).map((p) => `L${p.x} ${p.y}`).join(' '))
    .join(' ');
}

/**
 * Full-screen drawing pad. It lives in a modal so finger strokes never
 * compete with a scroll view for the touch.
 */
export function SignaturePad({
  visible,
  color,
  onColor,
  onDone,
  onCancel,
}: {
  visible: boolean;
  color: string;
  onColor: (c: string) => void;
  onDone: (path: DrawnPath) => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const point = (e: { nativeEvent: { locationX: number; locationY: number } }) => ({
    x: Math.round(e.nativeEvent.locationX * 10) / 10,
    y: Math.round(e.nativeEvent.locationY * 10) / 10,
  });

  function finish() {
    const path = strokesToPath(strokes, INK_WIDTH);
    if (path) onDone(path);
    setStrokes([]);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={onCancel} hitSlop={12}>
            <Text style={{ color: theme.textSecondary, fontSize: 16 }}>{t('Batal')}</Text>
          </Pressable>
          <Text style={[styles.title, { color: theme.text }]}>{t('Gambar tanda tangan')}</Text>
          <Pressable accessibilityRole="button" onPress={() => setStrokes([])} hitSlop={12}>
            <Text style={{ color: theme.accent, fontSize: 16 }}>{t('Hapus')}</Text>
          </Pressable>
        </View>
        <View
          accessibilityLabel={t('Area tanda tangan')}
          style={[styles.pad, { borderColor: theme.border }]}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => {
            const p = point(e);
            setStrokes((s) => [...s, [p]]);
          }}
          onResponderMove={(e) => {
            const p = point(e);
            setStrokes((s) => {
              const last = s[s.length - 1];
              const prev = last[last.length - 1];
              // Skip sub-pixel jitter to keep paths small.
              if (Math.abs(prev.x - p.x) + Math.abs(prev.y - p.y) < 1.5) return s;
              return [...s.slice(0, -1), [...last, p]];
            })
          }}>
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            <Path
              d={livePath(strokes)}
              stroke={color}
              strokeWidth={INK_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
          {strokes.length === 0 && (
            <Text pointerEvents="none" style={[styles.hint, { color: '#9a9a9a' }]}>
              {t('Tanda tangan di sini')}
            </Text>
          )}
          <View pointerEvents="none" style={styles.baseline} />
        </View>
        <View style={styles.footer}>
          <View style={styles.swatches}>
            {INK_COLORS.map((c) => (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityLabel={c === INK_COLORS[0] ? t('Tinta hitam') : t('Tinta biru')}
                accessibilityState={{ selected: c === color }}
                onPress={() => onColor(c)}
                style={[styles.swatch, { backgroundColor: c, borderColor: c === color ? theme.accent : 'transparent' }]}
              />
            ))}
          </View>
          <View style={{ flex: 1 }}>
            <Button title={t('Pakai')} onPress={finish} disabled={strokes.length === 0} />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  title: { fontSize: 17, fontWeight: '700' },
  pad: {
    flex: 1,
    marginHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: { fontSize: 18 },
  baseline: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: '30%',
    height: 1,
    backgroundColor: '#d0d0d0',
  },
  footer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  swatches: { flexDirection: 'row', gap: Spacing.two },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 3 },
});
