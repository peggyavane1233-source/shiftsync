/**
 * src/components/ui/Screen.tsx
 * PURPOSE: A standard screen wrapper that applies SafeAreaView and background color.
 */
import React from 'react';
import { SafeAreaView, StyleSheet, ViewProps, View } from 'react-native';
import { useTheme } from '../../theme';

interface ScreenProps extends ViewProps {
  noSafeArea?: boolean;
}

export function Screen({ style, children, noSafeArea = false, ...props }: ScreenProps) {
  const theme = useTheme();

  const content = (
    <View style={[styles.container, { backgroundColor: theme.bg }, style]} {...props}>
      {children}
    </View>
  );

  if (noSafeArea) {
    return content;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});
