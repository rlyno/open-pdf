import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { AnnotTool } from '@/components/annotation-layer';
import { Button, SymbolIcon, Txt, type Icon } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/lib/i18n';

export const INK = ['#111827', '#2563EB', '#DC2626', '#16A34A'];
export const MARKER = ['#FDE047', '#86EFAC', '#F9A8D4', '#93C5FD'];

/** Thin / medium / thick, as fractions of the page width. */
export const WEIGHTS: Record<'pen' | 'marker' | 'text', [number, number, number]> = {
  pen: [0.003, 0.006, 0.011],
  marker: [0.015, 0.025, 0.04],
  text: [0.025, 0.035, 0.05],
};

const TOOLS: { id: AnnotTool; label: () => string; icon: Icon }[] = [
  { id: 'pan', label: () => t('Geser'), icon: { ios: 'hand.raised', android: 'pan_tool' } },
  { id: 'pen', label: () => t('Pena'), icon: { ios: 'pencil.tip', android: 'edit' } },
  { id: 'marker', label: () => t('Stabilo'), icon: { ios: 'highlighter', android: 'ink_highlighter' } },
  { id: 'text', label: () => t('Teks'), icon: { ios: 'textformat', android: 'title' } },
  { id: 'eraser', label: () => t('Penghapus'), icon: { ios: 'eraser', android: 'ink_eraser' } },
];

/** Floating annotation toolbar: tools, palette, stroke weight, undo/redo. */
export function AnnotationToolbar({
  tool,
  onTool,
  color,
  onColor,
  weight,
  onWeight,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  tool: AnnotTool;
  onTool: (t: AnnotTool) => void;
  color: string;
  onColor: (c: string) => void;
  weight: 0 | 1 | 2;
  onWeight: (w: 0 | 1 | 2) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  const theme = useTheme();
  const palette = tool === 'marker' ? MARKER : INK;
  const styled = tool === 'pen' || tool === 'marker' || tool === 'text';
  return (
    <View style={[styles.card, { backgroundColor: theme.chrome, borderColor: theme.border }]}>
      <View style={styles.tools}>
        {TOOLS.map((item) => {
          const active = item.id === tool;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={item.label()}
              accessibilityState={{ selected: active }}
              onPress={() => onTool(item.id)}
              style={({ pressed }) => [
                styles.tool,
                { backgroundColor: active ? theme.accent : theme.surfaceHigh, transform: [{ scale: pressed ? 0.94 : 1 }] },
              ]}>
              <SymbolIcon icon={item.icon} size={20} color={active ? theme.accentText : theme.text} />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.row}>
        {styled ? (
          <>
            <Txt variant="labelSm" color="textMuted" style={styles.caption}>
              {t('Palet')}
            </Txt>
            {palette.map((c) => (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityLabel={t('Warna {color}', { color: c })}
                accessibilityState={{ selected: c === color }}
                onPress={() => onColor(c)}
                style={[styles.swatch, { backgroundColor: c, borderColor: c === color ? theme.accentOnSurface : 'transparent' }]}
              />
            ))}
            <View style={[styles.weights, { backgroundColor: theme.surfaceLowest }]}>
              {([0, 1, 2] as const).map((w) => (
                <Pressable
                  key={w}
                  accessibilityRole="button"
                  accessibilityLabel={[t('Tipis'), t('Sedang'), t('Tebal')][w]}
                  accessibilityState={{ selected: w === weight }}
                  onPress={() => onWeight(w)}
                  style={[styles.weight, w === weight && { backgroundColor: theme.surfaceHigh }]}>
                  <View style={{ width: 4 + w * 4, height: 4 + w * 4, borderRadius: 8, backgroundColor: theme.text }} />
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <Txt variant="bodySm" color="textSecondary" style={{ flex: 1 }}>
            {tool === 'pan' ? t('Geser untuk menggulir halaman.') : t('Ketuk anotasi untuk menghapusnya.')}
          </Txt>
        )}
        <View style={{ flex: styled ? 0 : undefined, flexDirection: 'row', gap: 4, marginLeft: 'auto' }}>
          <IconButton icon={{ ios: 'arrow.uturn.backward', android: 'undo' }} label={t('Urungkan')} onPress={onUndo} disabled={!canUndo} />
          <IconButton icon={{ ios: 'arrow.uturn.forward', android: 'redo' }} label={t('Ulangi')} onPress={onRedo} disabled={!canRedo} />
        </View>
      </View>
    </View>
  );
}

function IconButton({ icon, label, onPress, disabled }: { icon: Icon; label: string; onPress: () => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.iconBtn, { opacity: disabled ? 0.35 : pressed ? 0.6 : 1 }]}>
      <SymbolIcon icon={icon} size={20} color={theme.text} />
    </Pressable>
  );
}

/** Asks for the text of a new text annotation. */
export function TextPrompt({
  visible,
  onCancel,
  onSubmit,
}: {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (text: string) => void;
}) {
  const theme = useTheme();
  const [text, setText] = useState('');
  const close = (submit: boolean) => {
    if (submit && text.trim()) onSubmit(text);
    else onCancel();
    setText('');
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => close(false)} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.scrim}>
        <View style={[styles.prompt, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Txt variant="titleSm">{t('Tambah teks')}</Txt>
          <TextInput
            autoFocus
            multiline
            value={text}
            onChangeText={setText}
            placeholder={t('Tulis catatan…')}
            placeholderTextColor={theme.textMuted}
            style={[
              Type.bodyLg,
              styles.input,
              { color: theme.text, backgroundColor: theme.surfaceLowest, borderColor: theme.accent },
            ]}
          />
          <View style={styles.promptActions}>
            <View style={{ flex: 1 }}>
              <Button title={t('Batal')} variant="secondary" onPress={() => close(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title={t('Tambah')} disabled={!text.trim()} onPress={() => close(true)} />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: MaxContentWidth - 32,
    borderRadius: Radius.xl + 4,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  tools: { flexDirection: 'row', gap: 6 },
  tool: { flex: 1, height: 46, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 36 },
  caption: { textTransform: 'uppercase' },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 3 },
  weights: { flexDirection: 'row', borderRadius: Radius.md, padding: 2, marginLeft: 4 },
  weight: { width: 32, height: 30, borderRadius: Radius.md - 2, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: Spacing.three },
  prompt: { borderRadius: Radius.xl, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three, gap: 12 },
  input: { minHeight: 96, borderRadius: Radius.lg, borderWidth: 1.5, padding: 12, textAlignVertical: 'top' },
  promptActions: { flexDirection: 'row', gap: Spacing.two },
});
