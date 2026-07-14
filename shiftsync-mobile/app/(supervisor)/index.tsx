/**
 * app/(supervisor)/index.tsx
 * PURPOSE: The main landing screen for Supervisors. 
 * PLACE: Primary navigation hub. 
 * DESIGN: Strict instrument-grade control panel. No emojis.
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Screen, Text, Card, Button, Spinner } from '../../src/components/ui';
import { spacing, useTheme } from '../../src/theme';
import { apiClient } from '../../src/api/client';
import { useAuth } from '../../src/features/auth';

export default function SupervisorDashboard() {
  const theme = useTheme();
  const { logout, user } = useAuth();
  const [shift, setShift] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const loadData = async () => {
      try {
        const shifts = await apiClient.supervisor.listShifts();
        setShift(shifts[0] || null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return <Screen style={styles.center}><Spinner /></Screen>;
  }

  return (
    <Screen style={{ backgroundColor: theme.seam }}>
      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.header}>
          <Text variant="display" weight="bold" style={{ color: theme.headlamp, textTransform: 'uppercase' }}>SYS.OP: {user?.displayName}</Text>
          <Text variant="data" style={{ color: theme.dust, marginTop: spacing.xs }}>ZONE: {shift?.departmentId || 'UNASSIGNED'}</Text>
        </View>

        {/* PRIMARY ACTION - QR DISPLAY */}
        <TouchableOpacity 
          style={[styles.primaryAction, { backgroundColor: theme.lamp, borderColor: theme.rule, borderWidth: 1 }]}
          onPress={() => router.push('/(supervisor)/qr-display')}
          activeOpacity={0.8}
        >
          <Text variant="display" weight="bold" style={{ color: '#000000' }}>START KIOSK</Text>
          <Text variant="label" style={{ color: '#000000', marginTop: spacing.xs }}>ACTIVATE ROLL CALL SCANNER</Text>
        </TouchableOpacity>

        <View style={styles.grid}>
          {/* HEADCOUNT */}
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: theme.anthracite, borderColor: theme.rule }]}
            onPress={() => router.push('/(supervisor)/headcount')}
            activeOpacity={0.8}
          >
            <Text variant="display" weight="bold" style={{ color: theme.headlamp }}>TALLY</Text>
            <Text variant="label" style={{ color: theme.dust, marginTop: spacing.xs }}>LIVE HEADCOUNT</Text>
          </TouchableOpacity>

          {/* ROSTER */}
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: theme.anthracite, borderColor: theme.rule }]}
            onPress={() => router.push('/(supervisor)/roster')}
            activeOpacity={0.8}
          >
            <Text variant="display" weight="bold" style={{ color: theme.headlamp }}>ROSTER</Text>
            <Text variant="label" style={{ color: theme.dust, marginTop: spacing.xs }}>SCHEDULE & SWAPS</Text>
          </TouchableOpacity>
        </View>

        {/* FATIGUE ALERTS */}
        <TouchableOpacity 
          style={[styles.fatigueCard, { backgroundColor: theme.anthracite, borderColor: theme.warning }]}
          onPress={() => router.push('/(supervisor)/fatigue-alerts')}
          activeOpacity={0.8}
        >
          <View style={styles.row}>
            <View>
              <Text variant="display" weight="bold" style={{ color: theme.warning }}>FATIGUE RISK</Text>
              <Text variant="label" style={{ color: theme.dust, marginTop: spacing.xs }}>CRITICAL BLOCKS PENDING</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: theme.warning }]}>
              <Text variant="body" weight="bold" style={{ color: '#000000' }}>!</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* MUSTER (DANGER ZONE) */}
        <View style={styles.dangerZone}>
          <Text variant="label" style={{ color: theme.danger, marginBottom: spacing.md, textAlign: 'center' }}>
            OVERRIDE PROTOCOLS
          </Text>
          <Button 
            title="INITIATE EMERGENCY ROLL CALL" 
            size="lg" 
            variant="danger"
            onPress={() => router.push('/(supervisor)/muster')}
          />
        </View>

        <Button 
          title="TERMINATE SESSION" 
          variant="secondary" 
          style={{ marginTop: spacing.xxl }}
          onPress={logout}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: spacing.md, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: '#2C343D' },
  primaryAction: {
    padding: spacing.xl,
    borderRadius: 2,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  grid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  card: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: 2,
    borderWidth: 1,
    alignItems: 'center',
  },
  fatigueCard: {
    padding: spacing.lg,
    borderRadius: 2,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerZone: {
    marginTop: spacing.xl,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: '#2C343D'
  }
});
