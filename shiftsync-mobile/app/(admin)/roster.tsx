/**
 * Master scheduling screen — interactive roster for admin (web drag or mobile tap).
 */
import React, { useState } from 'react';
import { View, StyleSheet, Alert, Platform, Share } from 'react-native';
import { Screen, Text, Button } from '../../src/components/ui';
import { spacing, useTheme } from '../../src/theme';
import { DragDropCalendar } from '../../src/components/roster/DragDropCalendar';
import { apiClient } from '../../src/api/client';

export default function AdminRosterScreen() {
  const theme = useTheme();
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await apiClient.admin.publishRoster();
      Alert.alert('Published', `${res.published ?? 0} draft shifts published.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to publish.');
    } finally {
      setPublishing(false);
    }
  };

  const handleExport = async (kind: 'CSV' | 'PDF') => {
    try {
      const shifts = await apiClient.admin.listRosterShifts();
      const lines = [
        'Shift ID,Type,Start,End,Status,Assigned',
        ...shifts.map((s: any) =>
          [
            s.id,
            s.shiftType,
            s.startTime,
            s.endTime,
            s.status,
            (s.assignments || []).length,
          ].join(',')
        ),
      ];
      const body = lines.join('\n');
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).clipboard) {
        await (navigator as any).clipboard.writeText(body);
        Alert.alert('Exported', `${kind} roster data copied to clipboard.`);
      } else {
        await Share.share({ message: body, title: `Roster ${kind}` });
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Export failed.');
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="xxl" weight="bold">Master Roster</Text>
          <Text variant="md" color="textMuted">
            {Platform.OS === 'web'
              ? 'Drag and drop or use publish/export tools.'
              : 'Tap cells to add, move, or cancel shifts.'}
          </Text>
        </View>
        <View style={styles.actions}>
          <Button title="Export CSV" variant="secondary" size="md" onPress={() => handleExport('CSV')} />
          <Button
            title="Export PDF"
            variant="secondary"
            size="md"
            style={{ marginLeft: spacing.sm }}
            onPress={() => handleExport('PDF')}
          />
          <Button
            title="PUBLISH ROSTER"
            variant="primary"
            size="md"
            style={{ marginLeft: spacing.md }}
            loading={publishing}
            onPress={handlePublish}
          />
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
    marginBottom: spacing.xl,
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap' },
  content: { flex: 1 },
});
