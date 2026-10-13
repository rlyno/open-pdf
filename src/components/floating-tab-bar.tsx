import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SymbolIcon, type Icon } from '@/components/ui';
import { MaxContentWidth, Radius, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TabMeta = { label: string; icon: Icon; activeIcon: Icon };

/**
 * The design's floating capsule navigation: a translucent pill hovering above
 * the home indicator, the active tab tinted indigo.
 */
export function FloatingTabBar({ state, navigation, tabs }: BottomTabBarProps & { tabs: Record<string, TabMeta> }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 10 }]}>
      <View style={[styles.bar, { backgroundColor: theme.chrome, borderColor: theme.border }]}>
        {state.routes.map((route, index) => {
          const meta = tabs[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          const color = focused ? theme.accentOnSurface : theme.textMuted;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={meta.label}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
              }}
              style={[styles.item, focused && { backgroundColor: theme.accentSoft }]}>
              <SymbolIcon icon={focused ? meta.activeIcon : meta.icon} size={22} color={color} />
              <Text style={[Type.labelSm, { color }]}>{meta.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: MaxContentWidth - 32,
    borderRadius: Radius.xl + 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 6,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  item: { flex: 1, height: 52, borderRadius: Radius.xl + 2, alignItems: 'center', justifyContent: 'center', gap: 2 },
});
