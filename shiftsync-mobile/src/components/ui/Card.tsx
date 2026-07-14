/**
 * src/components/ui/Card.tsx
 * PURPOSE: A standard surface container. Flat, contrasting border, no shadows.
 */
import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme, spacing } from '../../theme';

interface CardProps extends ViewProps {
  padding?: keyof typeof spacing;
}

export function Card({ padding = 'lg', style, children, ...props }: CardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.anthracite,
          borderColor: theme.rule,
          padding: spacing[padding],
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 2, // Industrial hard corners
  },
});
