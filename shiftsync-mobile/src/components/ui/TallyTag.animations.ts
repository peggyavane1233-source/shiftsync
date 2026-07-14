/**
 * src/components/ui/TallyTag.animations.ts
 * PURPOSE: The physical motion definitions for the Tally Tag component.
 * WHY: The tag is the signature physical artifact. Its motion must feel 
 * like brass coming off/on a steel hook.
 */

import { Animated } from 'react-native';

export function createLiftAnimation(animValue: Animated.Value, reducedMotion: boolean) {
  if (reducedMotion) {
    return Animated.timing(animValue, {
      toValue: 1, // 1 = off hook
      duration: 150,
      useNativeDriver: true,
    });
  }

  return Animated.spring(animValue, {
    toValue: 1,
    speed: 12,
    bounciness: 2, // Heavy brass doesn't bounce much on the way up
    useNativeDriver: true,
  });
}

export function createHangAnimation(animValue: Animated.Value, reducedMotion: boolean) {
  if (reducedMotion) {
    return Animated.timing(animValue, {
      toValue: 0, // 0 = on hook
      duration: 150,
      useNativeDriver: true,
    });
  }

  return Animated.spring(animValue, {
    toValue: 0,
    speed: 14,
    bounciness: 6, // Small clink/bounce when hitting the bottom of the hook
    useNativeDriver: true,
  });
}

/**
 * Returns the transform array to map the 0..1 animValue to physical movement.
 */
export function getTagTransforms(animValue: Animated.Value) {
  return [
    {
      translateY: animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -24], // Rise 24px when lifted off hook
      }),
    },
    {
      scale: animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.06], // Scale up slightly to indicate active focus
      }),
    },
  ];
}
