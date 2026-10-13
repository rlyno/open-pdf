import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { useEffect, useRef, useState, type ReactNode } from 'react';
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
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing, TabBarClearance, Type, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/lib/i18n';

export type Icon = { ios: SFSymbol; android: AndroidSymbol };

export function SymbolIcon({ icon, size = 22, color }: { icon: Icon; size?: number; color: string }) {
  return <SymbolView name={icon} size={size} tintColor={color} />;
}

/** Text in the design's type scale. */
export function Txt({
  variant = 'bodyMd',
  color = 'text',
  style,
  ...rest
}: TextProps & { variant?: keyof typeof Type; color?: ThemeColor; style?: StyleProp<TextStyle> }) {
  const theme = useTheme();
  return <Text {...rest} style={[Type[variant], { color: theme[color] }, style]} />;
}

/**
 * Scrollable page. `tabBar` adds room for the header-less tab screens (status
 * bar on top, floating tab bar below). `footer` stays pinned below the scroll
 * area (e.g. a long page grid's main action); the page scrolls back to the
 * top whenever `scrollToTopKey` changes to a truthy value, so freshly
 * produced results come into view.
 */
export function Screen({
  children,
  tabBar,
  footer,
  scrollToTopKey,
}: {
  children: ReactNode;
  tabBar?: boolean;
  footer?: ReactNode;
  scrollToTopKey?: unknown;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    if (scrollToTopKey) ref.current?.scrollTo({ y: 0, animated: true });
  }, [scrollToTopKey]);

  const bottom = tabBar ? insets.bottom + TabBarClearance : footer ? Spacing.three : insets.bottom + Spacing.five;
  const scroll = (
    <ScrollView
      ref={ref}
      style={{ flex: 1, backgroundColor: theme.background }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.screen,
        { paddingBottom: bottom },
        tabBar && { paddingTop: insets.top + Spacing.two },
      ]}>
      {children}
    </ScrollView>
  );
  if (!footer) return scroll;
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {scroll}
      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + Spacing.two, borderTopColor: theme.border, backgroundColor: theme.background },
        ]}>
        {footer}
      </View>
    </View>
  );
}

/** Title block for tab screens: small brand eyebrow above the page name. */
export function PageHeader({ title, right }: { title: string; right?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.pageHeader}>
      <View style={[styles.brandMark, { backgroundColor: theme.accent }]}>
        <SymbolIcon icon={{ ios: 'doc.text.fill', android: 'picture_as_pdf' }} size={18} color={theme.accentText} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt variant="labelSm" color="textSecondary" style={styles.eyebrow}>
          Open PDF
        </Txt>
        <Txt variant="headlineXl">{title}</Txt>
      </View>
      {right}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>{children}</View>
  );
}

/** Small uppercase field/section caption. */
export function Label({ children }: { children: ReactNode }) {
  return (
    <Txt variant="labelSm" color="textMuted" style={styles.eyebrow}>
      {children}
    </Txt>
  );
}

/** Section title with the design's coloured leading bar and an item count. */
export function SectionHeader({ title, count, color }: { title: string; count?: string; color?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionBar, { backgroundColor: color ?? theme.accent }]} />
      <Txt variant="titleSm" style={{ flex: 1 }}>
        {title}
      </Txt>
      {count && (
        <Txt variant="labelMd" color="textMuted">
          {count}
        </Txt>
      )}
    </View>
  );
}

export function Body({ children, secondary }: { children: ReactNode; secondary?: boolean }) {
  return (
    <Txt variant="bodyMd" color={secondary ? 'textSecondary' : 'text'}>
      {children}
    </Txt>
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: Icon;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
};

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, compact }: ButtonProps) {
  const theme = useTheme();
  const bg = {
    primary: theme.accent,
    secondary: theme.surfaceHigh,
    danger: theme.dangerSoft,
    ghost: 'transparent',
  }[variant];
  const fg = {
    primary: theme.accentText,
    secondary: theme.text,
    danger: theme.dangerText,
    ghost: theme.accentOnSurface,
  }[variant];
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
        // Design: pressed controls scale to 96%.
        { backgroundColor: bg, opacity: inactive ? 0.45 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        icon && <SymbolIcon icon={icon} size={compact ? 16 : 18} color={fg} />
      )}
      <Text numberOfLines={1} style={[compact ? Type.labelLg : Type.titleSm, { color: fg }]}>
        {title}
      </Text>
    </Pressable>
  );
}

/** Filter/tool chip: 32pt tall, filled indigo when selected. */
export function Chip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon?: Icon;
  selected?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const fg = selected ? theme.accentText : theme.textSecondary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? theme.accent : theme.surfaceHigh, transform: [{ scale: pressed ? 0.96 : 1 }] },
      ]}>
      {icon && <SymbolIcon icon={icon} size={15} color={fg} />}
      <Text style={[Type.labelMd, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/** Small status pill, e.g. "Offline" or "AES-256". */
export function Pill({ label, tone = 'accent' }: { label: string; tone?: 'accent' | 'neutral' | 'danger' | 'success' }) {
  const theme = useTheme();
  const colors = {
    accent: [theme.accentSoft, theme.accentOnSurface],
    neutral: [theme.surfaceHigh, theme.textSecondary],
    danger: [theme.dangerSoft, theme.dangerText],
    success: [theme.successSoft, theme.success],
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: colors[0] }]}>
      <Text numberOfLines={1} style={[Type.labelSm, { color: colors[1] }]}>
        {label}
      </Text>
    </View>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Label>{label}</Label>
      <TextInput
        placeholderTextColor={theme.textMuted}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          styles.input,
          Type.bodyLg,
          {
            color: theme.text,
            backgroundColor: theme.surfaceLowest,
            borderColor: focused ? theme.accent : theme.border,
            borderWidth: focused ? 1.5 : 1,
          },
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
      <View style={[styles.segmented, { backgroundColor: theme.surfaceLowest, borderColor: theme.border }]}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(o.value)}
              style={[styles.segment, active && { backgroundColor: theme.surfaceHigh }]}>
              <Text numberOfLines={1} style={[Type.labelLg, { color: active ? theme.text : theme.textMuted }]}>
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
      <Txt variant="bodyLg" style={{ flex: 1 }}>
        {label}
      </Txt>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.accent, false: theme.surfaceHigh }}
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
  const btn = (delta: number, text: string) => {
    const off = delta > 0 ? value >= max : value <= min;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} ${delta > 0 ? t('tambah') : t('kurang')}`}
        onPress={() => onChange(clamp(value + delta))}
        disabled={off}
        style={({ pressed }) => [
          styles.stepBtn,
          { backgroundColor: theme.surfaceHigh, opacity: off ? 0.4 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] },
        ]}>
        <Text style={[Type.headlineMd, { color: theme.text }]}>{text}</Text>
      </Pressable>
    );
  };
  return (
    <View style={styles.row}>
      <Txt variant="bodyLg" style={{ flex: 1 }}>
        {label}
      </Txt>
      {btn(-step, '−')}
      <Text style={[Type.titleSm, styles.stepValue, { color: theme.text }]}>{format(value)}</Text>
      {btn(step, '+')}
    </View>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  const theme = useTheme();
  return (
    <View accessibilityRole="alert" style={[styles.banner, { backgroundColor: theme.dangerSoft }]}>
      <SymbolIcon icon={{ ios: 'exclamationmark.triangle.fill', android: 'error' }} size={18} color={theme.dangerText} />
      <Txt variant="bodyMd" style={{ flex: 1, color: theme.dangerText }}>
        {message}
      </Txt>
    </View>
  );
}

/** Icon tile. `solid` gives the design's filled indigo tile for primary tools. */
export function IconBadge({
  icon,
  color,
  size = 44,
  solid,
}: {
  icon: Icon;
  color: string;
  size?: number;
  solid?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: solid ? color : color + '29',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <SymbolIcon icon={icon} size={size * 0.5} color={solid ? theme.accentText : color} />
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
  footer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  pageHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 4, minHeight: 56 },
  brandMark: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { textTransform: 'uppercase' },
  card: { borderRadius: Radius.xl, padding: Spacing.three, gap: Spacing.three, borderWidth: StyleSheet.hairlineWidth },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.two },
  sectionBar: { width: 4, height: 18, borderRadius: 2 },
  button: {
    minHeight: 50,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  buttonCompact: { minHeight: 36, borderRadius: Radius.md + 2, paddingHorizontal: 12, gap: 6 },
  chip: {
    height: 32,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pill: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  field: { gap: Spacing.two },
  input: { minHeight: 44, borderRadius: Radius.lg, paddingHorizontal: 12, paddingVertical: 10 },
  segmented: { flexDirection: 'row', borderRadius: Radius.lg, padding: 3, gap: 3, borderWidth: StyleSheet.hairlineWidth },
  segment: {
    flex: 1,
    minHeight: 38,
    borderRadius: Radius.md + 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 44 },
  stepBtn: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 56, textAlign: 'center', fontVariant: ['tabular-nums'] },
  banner: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start', borderRadius: Radius.lg, padding: 12 },
});
