/**
 * src/components/roster/DragDropCalendar.native.tsx
 * PURPOSE: Fallback tap-to-assign roster for mobile devices.
 * WHY: Drag and drop is a terrible UX on mobile for scheduling. Native falls back to taps.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, spacing } from '../../theme';

export function DragDropCalendar() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={{ color: theme.text, fontSize: 16 }}>
        Mobile scheduling is limited. Please use the Desktop Web application for full drag-and-drop scheduling.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
