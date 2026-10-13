import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pill, SymbolIcon } from '@/components/ui';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/lib/i18n';
import { renderPage } from '@/lib/render';

const MAX_SCALE = 5;

/**
 * Full-screen view of one page: pinch to zoom, drag to pan, double-tap to
 * toggle zoom. Shows the viewer's render at once and swaps in a sharper one.
 */
export function PageZoom({
  uri,
  page,
  pageCount,
  aspect,
  preview,
  onClose,
}: {
  uri: string;
  /** 0-based page, or null when closed. */
  page: number | null;
  pageCount: number;
  /** height / width of the page. */
  aspect: number;
  preview?: string;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [sharp, setSharp] = useState<{ page: number; uri: string } | null>(null);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  useEffect(() => {
    if (page === null) return;
    scale.set(1);
    savedScale.set(1);
    tx.set(0);
    ty.set(0);
    savedTx.set(0);
    savedTy.set(0);
    let active = true;
    renderPage(uri, page, { maxWidth: 2200, maxHeight: 3200, quality: 90 })
      .then((r) => active && setSharp({ page, uri: r.uri }))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [uri, page, scale, savedScale, tx, ty, savedTx, savedTy]);

  const recenter = () => {
    'worklet';
    tx.set(withTiming(0));
    ty.set(withTiming(0));
    savedTx.set(0);
    savedTy.set(0);
  };
  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.set(Math.min(MAX_SCALE, Math.max(1, savedScale.get() * e.scale)));
    })
    .onEnd(() => {
      savedScale.set(scale.get());
      if (scale.get() === 1) recenter();
    });
  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((e) => {
      if (scale.get() <= 1) return;
      tx.set(savedTx.get() + e.translationX);
      ty.set(savedTy.get() + e.translationY);
    })
    .onEnd(() => {
      savedTx.set(tx.get());
      savedTy.set(ty.get());
    });
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const next = scale.get() > 1 ? 1 : 2.5;
      scale.set(withTiming(next));
      savedScale.set(next);
      recenter();
    });
  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: scale.get() }],
  }));

  // Fit the page inside the screen, leaving room for the top bar.
  const boxW = Math.min(width - 24, (height - insets.top - 120) / aspect);
  const boxH = boxW * aspect;
  const source = sharp && sharp.page === page ? sharp.uri : preview;

  return (
    <Modal visible={page !== null} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={[styles.root, { backgroundColor: '#05080F' }]}>
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <Pill tone="neutral" label={`${(page ?? 0) + 1} / ${pageCount}`} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Tutup')}
            onPress={onClose}
            hitSlop={12}
            style={[styles.close, { backgroundColor: theme.surfaceHigh }]}>
            <SymbolIcon icon={{ ios: 'xmark', android: 'close' }} size={18} color={theme.text} />
          </Pressable>
        </View>
        <GestureDetector gesture={gesture}>
          <View style={styles.stage}>
            <Animated.View style={[{ width: boxW, height: boxH }, styles.paper, animated]}>
              {source ? (
                <Image source={{ uri: source }} style={StyleSheet.absoluteFill} contentFit="contain" />
              ) : (
                <ActivityIndicator color={theme.accent} style={StyleSheet.absoluteFill} />
              )}
            </Animated.View>
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 2,
  },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  paper: { backgroundColor: '#ffffff', borderRadius: Radius.sm },
});
