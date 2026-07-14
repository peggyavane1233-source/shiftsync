import React, { useRef, useState } from 'react';
import { View, StyleSheet, Animated, PanResponder, Pressable, Dimensions } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Text } from './Text';
import { useTheme, spacing } from '../../theme';
import { AlertTriangle, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SLIDE_HEIGHT = 72;

export function MusterInitiationBar() {
  const theme = useTheme();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const insets = useSafeAreaInsets();
  const safePadding = Math.max(insets.bottom, 16);
  
  // Slide logic
  const pan = useRef(new Animated.ValueXY()).current;
  const { width } = Dimensions.get('window');
  // Thumb width = 72. Total track = width. Max slide = width - 72.
  const MAX_SLIDE = width - SLIDE_HEIGHT;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      if (gesture.dx > 0 && gesture.dx < MAX_SLIDE) {
        pan.setValue({ x: gesture.dx, y: 0 });
      }
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > MAX_SLIDE * 0.8) {
        // Confirmed
        Animated.spring(pan, { toValue: { x: MAX_SLIDE, y: 0 }, useNativeDriver: false }).start();
        setTimeout(() => {
          setExpanded(false);
          pan.setValue({ x: 0, y: 0 });
          router.push('/(supervisor)/muster');
        }, 300);
      } else {
        // Snap back
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      }
    }
  });

  // Do not render if we are already inside the muster screen
  if (pathname === '/muster' || pathname === '/(supervisor)/muster') return null;

  if (!expanded) {
    return (
      <Pressable 
        style={[styles.bar, { backgroundColor: theme.danger, height: SLIDE_HEIGHT + safePadding, paddingBottom: safePadding }]} 
        onPress={() => setExpanded(true)}
      >
        <AlertTriangle color="#000000" size={24} style={{ marginRight: spacing.sm }} />
        <Text variant="title" weight="bold" style={{ color: '#000000' }}>EMERGENCY ROLL CALL</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.track, { backgroundColor: theme.danger, height: SLIDE_HEIGHT + safePadding, paddingBottom: safePadding }]}>
      <Text variant="title" weight="bold" style={{ color: '#000000', position: 'absolute', top: (SLIDE_HEIGHT / 2) - 12 }}>
        SLIDE TO START ROLL CALL →
      </Text>
      <Animated.View
        style={[styles.thumb, { transform: [{ translateX: pan.x }], backgroundColor: '#FFFFFF', top: 0 }]}
        {...panResponder.panHandlers}
      >
        <ChevronRight color={theme.danger} size={32} />
        <ChevronRight color={theme.danger} size={32} style={{ marginLeft: -20 }} />
      </Animated.View>
      <Pressable 
        style={styles.closeHitbox}
        onPress={() => { setExpanded(false); pan.setValue({ x: 0, y: 0 }); }}
      >
        <Text variant="label" style={{ color: '#000000' }}>CANCEL</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  track: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumb: {
    width: SLIDE_HEIGHT,
    height: SLIDE_HEIGHT,
    position: 'absolute',
    left: 0,
    top: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000'
  },
  closeHitbox: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    height: SLIDE_HEIGHT,
    justifyContent: 'center'
  }
});
