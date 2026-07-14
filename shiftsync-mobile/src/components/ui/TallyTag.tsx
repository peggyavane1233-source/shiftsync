/**
 * src/components/ui/TallyTag.tsx
 * PURPOSE: The signature component of ShiftSync. 
 * METAPHOR: A physical brass tag hung on a lamp room board.
 * REQUIREMENTS: Rendered via react-native-svg for crispness. 
 * Physics-based lift/hang animations.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Rect, Circle, Defs, Mask } from 'react-native-svg';
import { ArrowDownCircle, ArrowUpCircle, XCircle } from 'lucide-react-native';
import { Text } from './Text';
import { useTheme, spacing } from '../../theme';
import { createLiftAnimation, createHangAnimation, getTagTransforms } from './TallyTag.animations';

export type TallyTagState = 'on-hook' | 'off-hook' | 'unaccounted';
export type TallyTagSize = 'sm' | 'md' | 'lg';

interface TallyTagProps {
  employeeNo: string;
  name: string;
  state: TallyTagState;
  size?: TallyTagSize;
  onPress?: () => void;
  style?: any;
}

export function TallyTag({ employeeNo, name, state, size = 'md', onPress, style }: TallyTagProps) {
  const theme = useTheme();
  
  // Animation state (0 = on hook, 1 = off hook)
  const animValue = useRef(new Animated.Value(state === 'on-hook' ? 0 : 1)).current;
  const [reducedMotion, setReducedMotion] = useState(false);

  // Pulse animation for 'unaccounted' state
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
  }, []);

  useEffect(() => {
    if (state === 'off-hook') {
      createLiftAnimation(animValue, reducedMotion).start();
    } else {
      createHangAnimation(animValue, reducedMotion).start();
    }

    if (state === 'unaccounted') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(0);
      pulseAnim.stopAnimation();
    }
  }, [state, reducedMotion]);

  const getSizing = () => {
    switch (size) {
      case 'sm': return { width: 100, height: 140, holeY: 16, padding: spacing.xs, fontId: 12, fontName: 16, fontStatus: 10 };
      case 'lg': return { width: 180, height: 240, holeY: 24, padding: spacing.md, fontId: 20, fontName: 32, fontStatus: 16 };
      case 'md':
      default: return { width: 140, height: 190, holeY: 20, padding: spacing.sm, fontId: 16, fontName: 24, fontStatus: 14 };
    }
  };

  const dims = getSizing();

  const isSurface = state === 'on-hook';
  const isDanger = state === 'unaccounted';

  // State styling maps
  const getColors = () => {
    if (isSurface) return { fill: 'transparent', stroke: theme.dust, text: theme.dust, strokeDasharray: '6, 6' };
    if (isDanger) return { fill: theme.danger, stroke: theme.danger, text: '#000000', strokeDasharray: 'none' };
    return { fill: theme.lamp, stroke: theme.lamp, text: '#000000', strokeDasharray: 'none' };
  };

  const colors = getColors();

  // Status mapping
  const getStatusMap = () => {
    if (isSurface) return { word: 'ON SURFACE', Icon: ArrowUpCircle };
    if (isDanger) return { word: 'UNACCOUNTED', Icon: XCircle };
    return { word: 'UNDERGROUND', Icon: ArrowDownCircle };
  };

  const statusMap = getStatusMap();
  const StatusIcon = statusMap.Icon;

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <Animated.View
        style={[
          styles.container,
          {
            width: dims.width,
            height: dims.height,
            transform: getTagTransforms(animValue),
          },
          isDanger && {
            opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] }),
          },
          style,
        ]}
      >
        {/* The SVG Tag Body */}
        <View style={StyleSheet.absoluteFill}>
          <Svg width="100%" height="100%">
            <Defs>
              <Mask id={`holeMask_${employeeNo}`}>
                {/* White rectangle covers the whole area (visible) */}
                <Rect x="0" y="0" width="100%" height="100%" fill="white" />
                {/* Black circle punches the hole (invisible) */}
                <Circle cx="50%" cy={dims.holeY} r={8} fill="black" />
              </Mask>
            </Defs>
            <Rect
              x="2"
              y="2"
              width={dims.width - 4}
              height={dims.height - 4}
              rx={4}
              ry={4}
              fill={colors.fill}
              stroke={colors.stroke}
              strokeWidth={2}
              strokeDasharray={colors.strokeDasharray}
              mask={`url(#holeMask_${employeeNo})`}
            />
          </Svg>
        </View>

        {/* Content Overlay */}
        <View style={[styles.content, { paddingTop: dims.holeY + 16, paddingHorizontal: dims.padding }]}>
          <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: dims.fontId, color: colors.text, marginBottom: spacing.xs }}>
            {employeeNo}
          </Text>
          
          <Text 
            style={{ fontFamily: 'BarlowCondensed_700Bold', fontSize: dims.fontName, color: colors.text, textTransform: 'uppercase', textAlign: 'center' }} 
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {name.substring(0, 14)}
          </Text>
        </View>

        {/* Status Strip (Icon + Color + Word) */}
        <View style={[styles.statusStrip, { borderTopColor: isSurface ? theme.dust : 'rgba(0,0,0,0.1)' }]}>
          <StatusIcon size={dims.fontStatus} color={colors.text} strokeWidth={3} />
          <Text style={{ fontFamily: 'BarlowCondensed_700Bold', fontSize: dims.fontStatus, color: colors.text, marginLeft: 4, letterSpacing: 1 }}>
            {statusMap.word}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    // Shadows removed in favor of pure flat drawing
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  statusStrip: {
    flexDirection: 'row',
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 2, // Hard border separation for status zone
  }
});
