/**
 * src/components/ui/Text.tsx
 * PURPOSE: A standard Text wrapper applying the design system's typography and color tokens.
 */
import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { useTheme, typeScale, ThemeColors, typography } from '../../theme';

type VariantType = keyof typeof typeScale | keyof typeof typography.sizes;

interface TextProps extends RNTextProps {
  variant?: VariantType;
  weight?: keyof typeof typography.weights; // Only used for legacy variant fallback
  color?: keyof ThemeColors;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export function Text({
  variant = 'body',
  weight = 'regular',
  color = 'text',
  align = 'left',
  style,
  ...props
}: TextProps) {
  const theme = useTheme();

  let fontStyle: any = {};
  if (variant in typeScale) {
    const scale = typeScale[variant as keyof typeof typeScale];
    const isDataFont = scale.fontFamily === typography.fonts.data;
    
    fontStyle = {
      fontFamily: scale.fontFamily,
      fontSize: scale.fontSize,
      lineHeight: scale.lineHeight,
      letterSpacing: (scale as any).letterSpacing,
      textTransform: (scale as any).textTransform,
      fontVariant: isDataFont ? ['tabular-nums'] : undefined,
    };
  } else {
    // Legacy fallback
    fontStyle = {
      fontFamily: typography.fonts.body, // Default body
      fontSize: typography.sizes[variant as keyof typeof typography.sizes],
      fontWeight: typography.weights[weight],
    };
  }

  return (
    <RNText
      style={[
        fontStyle,
        {
          color: theme[color] as string,
          textAlign: align,
        },
        style,
      ]}
      {...props}
    />
  );
}
