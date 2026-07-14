import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen, Text, Card, Spinner } from '../../src/components/ui';
import { spacing, useTheme } from '../../src/theme';
import { apiClient } from '../../src/api/client';
import { format, parseISO } from 'date-fns';

export default function SupervisorRosterScreen() {
  const theme = useTheme();
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await apiClient.supervisor.listShifts();
      // Sort upcoming first
      const sorted = data.sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      // Filter out ancient history for clarity
      const recentAndUpcoming = sorted.filter((s: any) => new Date(s.endTime).getTime() > Date.now() - 86400000);
      setShifts(recentAndUpcoming);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  if (loading) return <Screen style={styles.center}><Spinner /></Screen>;

  return (
    <Screen style={{ backgroundColor: theme.seam }}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="xl" weight="bold">Upcoming Roster</Text>
          <Text variant="md" color="textMuted">Tap a shift to manage assignments</Text>
        </View>
        <TouchableOpacity 
          style={styles.createBtn}
          onPress={() => router.push('/(supervisor)/shift/create')}
        >
          <Text variant="label" style={{ color: '#000' }}>+ CREATE</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={shifts}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl }}
        renderItem={({ item }) => {
          const start = parseISO(item.startTime);
          const assignedCount = item.assignments.length;
          const isShort = assignedCount < item.requiredWorkers;
          const hasSwaps = item.assignments.some((a: any) => a.status === 'SWAP_PENDING');

          return (
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => router.push(`/(supervisor)/shift/${item.id}`)}
            >
              <Card style={[styles.card, { backgroundColor: theme.anthracite, borderColor: theme.rule }]}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text variant="lg" weight="bold" style={{ color: theme.headlamp }}>
                      {format(start, 'EEE, MMM do')} • {item.shiftType}
                    </Text>
                    <Text variant="md" style={{ color: theme.dust, marginTop: spacing.xs }}>
                      {format(start, 'HH:mm')} — {format(parseISO(item.endTime), 'HH:mm')}
                    </Text>
                  </View>
                  
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text variant="label" style={{ color: isShort ? theme.warning : theme.safe }}>
                      {assignedCount} / {item.requiredWorkers} Assigned
                    </Text>
                    {hasSwaps && (
                      <View style={[styles.badge, { backgroundColor: theme.primary, marginTop: spacing.xs }]}>
                        <Text variant="xs" style={{ color: '#000', fontWeight: 'bold' }}>SWAP REQ</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.xl, borderBottomWidth: 1, borderBottomColor: '#2C343D' },
  createBtn: { backgroundColor: '#FFB000', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 4 },
  card: { padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }
});
