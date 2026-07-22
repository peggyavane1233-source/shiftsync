import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Screen, Text, Card, Button } from '../../src/components/ui';
import { spacing, useTheme } from '../../src/theme';
import { useAuth } from '../../src/features/auth';
import { apiClient } from '../../src/api/client';

export default function ProfileScreen() {
  const theme = useTheme();
  const { user, logout } = useAuth();
  
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await apiClient.users.myCerts();
      setCerts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <Screen>
      <ScrollView 
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text variant="xl" weight="bold" color="bg">
              {user?.displayName?.charAt(0) || 'W'}
            </Text>
          </View>
          <Text variant="xl" weight="bold" style={{ marginTop: spacing.md }}>
            {user?.displayName}
          </Text>
          <Text variant="md" color="textMuted">
            {user?.employeeNo} • {user?.role}
          </Text>
        </View>

        <Card style={styles.card}>
          <Text variant="sm" weight="semibold" color="textMuted" style={{ marginBottom: spacing.md }}>
            CERTIFICATIONS
          </Text>
          {loading ? (
            <Text>Loading certifications...</Text>
          ) : certs.length === 0 ? (
            <Text>No active certifications found.</Text>
          ) : certs.map(cert => {
            const isExpiring = cert.expiryDays <= 30 && cert.expiryDays > 0;
            const isExpired = cert.expiryDays <= 0;
            
            let statusColor = theme.safe;
            if (isExpiring) statusColor = theme.warning;
            if (isExpired) statusColor = theme.critical;

            return (
              <View key={cert.id} style={styles.certRow}>
                <Text variant="md" weight="semibold">{cert.name}</Text>
                <Text variant="sm" weight="bold" style={{ color: statusColor }}>
                  {isExpired ? 'EXPIRED' : `${cert.expiryDays} days`}
                </Text>
              </View>
            );
          })}
        </Card>

        <Card style={styles.card}>
          <Text variant="sm" weight="semibold" color="textMuted" style={{ marginBottom: spacing.md }}>
            DEVICE INFO
          </Text>
          <View style={styles.row}>
            <Text>App Version</Text>
            <Text color="textMuted">1.0.0 (Build 42)</Text>
          </View>
          <View style={styles.row}>
            <Text>Sync Status</Text>
            <Text color="safe" weight="semibold">Connected</Text>
          </View>
        </Card>

        <Button 
          title="Attendance History" 
          variant="secondary"
          size="lg"
          onPress={() => router.push('/(worker)/attendance-history')}
          style={{ marginTop: spacing.lg }}
        />

        <Button 
          title="Sign Out" 
          variant="secondary"
          size="lg"
          onPress={logout}
          style={{ marginTop: spacing.md, borderColor: theme.critical }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, paddingBottom: spacing.xxl },
  header: { alignItems: 'center', marginVertical: spacing.xl },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: { padding: spacing.lg, marginBottom: spacing.md },
  certRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#2E3A59'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  }
});
