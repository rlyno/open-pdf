import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Icon = { ios: SFSymbol; android: AndroidSymbol };

export function SymbolIcon({ icon, size = 22, color }: { icon: Icon; size?: number; color: string }) {
  return <SymbolView name={icon} size={size} tintColor={color} />;
}

/** Scrollable page. `topInset` is for screens without a navigation header. */
export function Screen({ children, topInset }: { children: ReactNode; topInset?: boolean }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.screen,
        { paddingBottom: insets.bottom + Spacing.five },
        topInset && { paddingTop: insets.top + Spacing.three },
      ]}>
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.backgroundElement }, style]}>{children}</View>;
}

export function Label({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <Text style={[styles.label, { color: theme.textSecondary }]}>{children}</Text>;
}

export function Body({ children, secondary }: { children: ReactNode; secondary?: boolean }) {
  const theme = useTheme();
  return <Text style={[styles.body, { color: secondary ? theme.textSecondary : theme.text }]}>{children}</Text>;
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: Icon;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
};

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, compact }: ButtonProps) {
  const theme = useTheme();
  const bg =
    variant === 'primary' ? theme.accent : variant === 'danger' ? 'transparent' : theme.backgroundSelected;
  const fg = variant === 'primary' ? theme.accentText : variant === 'danger' ? theme.danger : theme.text;
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: bg, opacity: inactive ? 0.5 : pressed ? 0.8 : 1 },
        variant === 'danger' && { borderWidth: 1, borderColor: theme.danger },
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        icon && <SymbolIcon icon={icon} size={compact ? 16 : 18} color={fg} />
      )}
      <Text style={[styles.buttonText, compact && styles.buttonTextCompact, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Label>{label}</Label>
      <TextInput
        placeholderTextColor={theme.textSecondary}
        {...props}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.background, borderColor: theme.border },
          props.multiline && { minHeight: 80, textAlignVertical: 'top' },
        ]}
      />
    </View>
  );
}

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      {label && <Label>{label}</Label>}
      <View style={[styles.segmented, { backgroundColor: theme.backgroundSelected }]}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(o.value)}
              style={[styles.segment, active && { backgroundColor: theme.background }]}>
              <Text
                numberOfLines={1}
                style={[styles.segmentText, { color: active ? theme.text : theme.textSecondary }]}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function SwitchRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.body, { color: theme.text, flex: 1 }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
        thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
      />
    </View>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format = String,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
}) {
  const theme = useTheme();
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  const btn = (delta: number, text: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${delta > 0 ? 'tambah' : 'kurang'}`}
      onPress={() => onChange(clamp(value + delta))}
      disabled={delta > 0 ? value >= max : value <= min}
      style={({ pressed }) => [
        styles.stepBtn,
        { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.7 : 1 },
      ]}>
      <Text style={[styles.stepBtnText, { color: theme.text }]}>{text}</Text>
    </Pressable>
  );
  return (
    <View style={styles.row}>
      <Text style={[styles.body, { color: theme.text, flex: 1 }]}>{label}</Text>
      {btn(-step, '−')}
      <Text style={[styles.stepValue, { color: theme.text }]}>{format(value)}</Text>
      {btn(step, '+')}
    </View>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  const theme = useTheme();
  return (
    <View accessibilityRole="alert" style={[styles.banner, { borderColor: theme.danger }]}>
      <Text style={[styles.body, { color: theme.danger }]}>{message}</Text>
    </View>
  );
}

export function IconBadge({ icon, color, size = 44 }: { icon: Icon; color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: color + '1F',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <SymbolIcon icon={icon} size={size * 0.5} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  card: { borderRadius: 16, padding: Spacing.three, gap: Spacing.three },
  label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' },
  body: { fontSize: 16, lineHeight: 22 },
  button: {
    minHeight: 50,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  buttonCompact: { minHeight: 38, borderRadius: 10, paddingHorizontal: 12 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  buttonTextCompact: { fontSize: 14 },
  field: { gap: Spacing.two },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  segmented: { flexDirection: 'row', borderRadius: 12, padding: 3, gap: 3 },
  segment: { flex: 1, minHeight: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  segmentText: { fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 44 },
  stepBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 22, fontWeight: '500' },
  stepValue: { minWidth: 56, textAlign: 'center', fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  banner: { borderWidth: 1, borderRadius: 12, padding: Spacing.three },
});
