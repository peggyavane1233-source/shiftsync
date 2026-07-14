/**
 * src/components/ui/Feedback.tsx
 * PURPOSE: Standardized feedback components: Spinner, EmptyState, ErrorState.
 */
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme, spacing } from '../../theme';
import { Text } from './Text';


interface FeedbackProps {
  title: string;
  message?: string;
  icon?: string; // We'll keep it as string for now, could be an icon component later
}

export function EmptyState({ title, message, icon = '📂' }: FeedbackProps) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <Text variant="xxl" style={{ marginBottom: spacing.md }}>{icon}</Text>
      <Text variant="lg" weight="semibold" align="center" style={{ marginBottom: spacing.sm }}>
        {title}
      </Text>
      {message && (
        <Text color="textMuted" align="center">
          {message}
        </Text>
      )}
    </View>
  );
}

export function ErrorState({ title, message, icon = '⚠' }: FeedbackProps) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <Text variant="xxl" style={{ marginBottom: spacing.md }}>{icon}</Text>
      <Text variant="lg" weight="semibold" color="critical" align="center" style={{ marginBottom: spacing.sm }}>
        {title}
      </Text>
      {message && (
        <Text color="textMuted" align="center">
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
});
