import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Screen, Text, Card, SyncBadge } from '../../src/components/ui';
import { spacing } from '../../src/theme';
import { apiClient } from '../../src/api/client';
import { AttendanceRecord } from '../../src/types';
import { format, parseISO } from 'date-fns';

export default function AttendanceHistoryScreen() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecords = async () => {
    try {
      const data = await apiClient.attendance.mine();
      setRecords(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
  };

  if (loading) {
    return <Screen style={styles.center}><Text>Loading History...</Text></Screen>;
  }

  const renderItem = ({ item }: { item: AttendanceRecord }) => {
    // Determine sync status. If it's loaded from the mock API, it's SYNCED.
    // In a fully integrated flow, we'd also check the local SQLite outbox for pending items for this shift.
    // For now, if syncedAt is null, we show PENDING.
    const isSynced = !!item.syncedAt;

    const inTime = item.checkInTime ? format(parseISO(item.checkInTime), 'HH:mm') : '--:--';
    const outTime = item.checkOutTime ? format(parseISO(item.checkOutTime), 'HH:mm') : '--:--';
    const dateStr = item.checkInTime ? format(parseISO(item.checkInTime), 'MMM do, yyyy') : 'Unknown Date';

    return (
      <Card style={styles.card}>
        <View style={styles.row}>
          <Text variant="md" weight="bold">{dateStr}</Text>
          <SyncBadge state={isSynced ? 'synced' : 'pending'} />
        </View>
        <View style={styles.detailsRow}>
          <View>
            <Text variant="sm" color="textMuted">Check In</Text>
            <Text variant="lg" weight="semibold">{inTime}</Text>
          </View>
          <View>
            <Text variant="sm" color="textMuted">Check Out</Text>
            <Text variant="lg" weight="semibold">{outTime}</Text>
          </View>
          <View>
            <Text variant="sm" color="textMuted">Method</Text>
            <Text variant="md" weight="semibold">{item.method}</Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <Screen>
      <Text variant="xl" weight="bold" style={styles.header}>My Attendance</Text>
      <FlatList
        data={records}
        keyExtractor={item => item.id || item.clientUuid}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={renderItem}
        ListEmptyComponent={<View style={styles.center}><Text>No records found.</Text></View>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: { padding: spacing.md, marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }
});
