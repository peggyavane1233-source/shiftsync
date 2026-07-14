/**
 * src/components/ui/Spinner.tsx
 * PURPOSE: A precise, instrument-grade rotating hairline arc. Not a bouncy blob.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ViewStyle } from 'react-native';
import { Loader2 } from 'lucide-react-native';
import { useTheme } from '../../theme';

interface SpinnerProps {
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export function Spinner({ size = 24, color, style }: SpinnerProps) {
  const theme = useTheme();
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[{ transform: [{ rotate: spin }] }, style]}>
      {/* Loader2 from Lucide is a clean, hairline arc */}
      <Loader2 size={size} color={color || theme.lamp} strokeWidth={2} />
    </Animated.View>
  );
}
