/**
 * app/(admin)/roster.tsx
 * PURPOSE: The master scheduling screen.
 * PLACE: Admin dashboard.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen, Text, Button } from '../../src/components/ui';
import { spacing, useTheme } from '../../src/theme';
import { DragDropCalendar } from '../../src/components/roster/DragDropCalendar';

export default function AdminRosterScreen() {
  const theme = useTheme();

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text variant="xxl" weight="bold">Master Roster</Text>
          <Text variant="md" color="textMuted">Drag and drop shifts to schedule.</Text>
        </View>
        <View style={styles.actions}>
          <Button title="Export CSV" variant="secondary" size="md" />
          <Button title="Export PDF" variant="secondary" size="md" style={{ marginLeft: spacing.sm }} />
          <Button title="PUBLISH ROSTER" variant="primary" size="md" style={{ marginLeft: spacing.md }} />
        </View>
      </View>

      <View style={styles.content}>
        <DragDropCalendar />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    marginBottom: spacing.xl 
  },
  actions: { flexDirection: 'row' },
  content: { flex: 1 }
});
