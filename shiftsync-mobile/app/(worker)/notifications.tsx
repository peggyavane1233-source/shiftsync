import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Screen, Text, Card, Button } from '../../src/components/ui';
import { spacing, useTheme } from '../../src/theme';
import { apiClient } from '../../src/api/client';
import { AppNotification } from '../../src/types';
import { format, parseISO } from 'date-fns';

export default function NotificationsScreen() {
  const theme = useTheme();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await apiClient.notifications.me();
      setNotifications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleConfirm = async (id: string) => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, acknowledgedAt: new Date().toISOString() } : n));
      await apiClient.notifications.confirm(id);
    } catch (e) {
      console.error(e);
      await loadData(); // rollback
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const isUnread = !item.acknowledgedAt;
    const isShiftChange = item.type === 'SHIFT_CHANGE';
    const requiresAction = isUnread && isShiftChange;

    return (
      <Card style={[styles.card, requiresAction && { borderColor: theme.warning, borderWidth: 2 }]}>
        <View style={styles.cardHeader}>
          <Text variant="sm" weight="bold" color="textMuted">
            {item.sentAt ? format(parseISO(item.sentAt), 'MMM do • HH:mm') : 'Just now'}
          </Text>
          {isUnread && <View style={[styles.dot, { backgroundColor: theme.primary }]} />}
        </View>

        <Text variant="lg" weight="bold" style={{ marginBottom: spacing.xs }}>{item.title}</Text>
        <Text variant="md" style={{ marginBottom: spacing.md, lineHeight: 22 }}>{item.message}</Text>

        {requiresAction && (
          <Button 
            title="CONFIRM RECEIVED" 
            size="lg" 
            style={{ backgroundColor: theme.warning }} 
            onPress={() => handleConfirm(item.id)} 
          />
        )}
      </Card>
    );
  };

  if (loading) return <Screen style={styles.center}><Text>Loading Notifications...</Text></Screen>;

  // Pinned item at the top if requires action
  const pinned = notifications.filter(n => n.type === 'SHIFT_CHANGE' && !n.acknowledgedAt);
  const unpinned = notifications.filter(n => !(n.type === 'SHIFT_CHANGE' && !n.acknowledgedAt));

  const sortedData = [...pinned, ...unpinned];

  return (
    <Screen>
      <Text variant="xl" weight="bold" style={styles.header}>Notifications</Text>
      <FlatList
        data={sortedData}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={renderItem}
        ListEmptyComponent={<View style={styles.center}><Text>No notifications.</Text></View>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: { padding: spacing.lg, marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  dot: { width: 12, height: 12, borderRadius: 6 }
});
