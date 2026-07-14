/**
 * src/components/ui/Button.tsx
 * PURPOSE: Instrument-grade button component. High contrast, minimum 56x56dp target,
 * explicitly avoiding soft gradients or rounded pills.
 */
import React from 'react';
import { TouchableOpacityProps, StyleSheet, ActivityIndicator, Pressable, View } from 'react-native';
import { useTheme, TAP_MIN, spacing } from '../../theme';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  title: string;
  loading?: boolean;
  textStyle?: any;
}

export function Button({
  variant = 'primary',
  size = 'md',
  title,
  loading = false,
  disabled,
  style,
  textStyle,
  onPress,
  ...props
}: ButtonProps) {
  const theme = useTheme();

  const getBackgroundColor = (pressed: boolean) => {
    if (disabled) return theme.gangue;
    switch (variant) {
      case 'primary': return pressed ? theme.lampDim : theme.lamp;
      case 'danger': return pressed ? '#A31C1C' : theme.danger;
      case 'secondary': return pressed ? theme.gangue : theme.anthracite;
      case 'ghost': return pressed ? theme.gangue : 'transparent';
      default: return theme.lamp;
    }
  };

  const getTextColor = () => {
    if (disabled) return theme.shadow;
    if (variant === 'primary' || variant === 'danger') return '#000000'; // Pure black for max contrast on lit backgrounds
    if (variant === 'ghost') return theme.lamp;
    return theme.headlamp;
  };

  const getBorderColor = () => {
    if (variant === 'secondary') return theme.rule;
    return 'transparent';
  };

  const minHeight = size === 'lg' ? TAP_MIN + 8 : TAP_MIN;

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress as any}
      style={({ pressed }) => [
        styles.button,
        {
          minHeight,
          backgroundColor: getBackgroundColor(pressed),
          borderColor: getBorderColor(),
          borderWidth: variant === 'secondary' ? 1 : 0,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
      {...(props as any)}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text
          weight="bold"
          variant={size === 'lg' ? 'lg' : 'md'}
          style={[{ color: getTextColor(), textTransform: 'uppercase', letterSpacing: 1 }, textStyle]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 2, // Hard, industrial corner (not 8 or 12)
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
});
