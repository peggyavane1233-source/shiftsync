import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Screen, Text, Card, Spinner } from '../../src/components/ui';
import { spacing, useTheme } from '../../src/theme';
import { apiClient } from '../../src/api/client';

// Mock data representing the 3 main operational zones of the mine
const ZONES_MOCK = [
  { id: 'Z1', name: 'ZONE 1 (UPPER)', unaccounted: 0, criticalFatigue: 0, musterActive: false, total: 42, present: 42 },
  { id: 'Z2', name: 'ZONE 2 (DEEP)', unaccounted: 2, criticalFatigue: 1, musterActive: true, total: 52, present: 50 },
  { id: 'Z3', name: 'SURFACE MILL', unaccounted: 0, criticalFatigue: 0, musterActive: false, total: 18, present: 18 },
];

export default function AdminDashboard() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState(ZONES_MOCK);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // In a real app, we would fetch aggregation from apiClient.supervisor.listShifts() 
    // mapped to each zone. For the mimic panel demo, we just use the mock data.
    setTimeout(() => setLoading(false), 500);

    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) return <Screen style={styles.center}><Spinner /></Screen>;

  // SORTING LOGIC: Trouble comes first
  const sortedZones = [...zones].sort((a, b) => {
    const aTrouble = (a.unaccounted > 0 || a.criticalFatigue > 0 || a.musterActive) ? 1 : 0;
    const bTrouble = (b.unaccounted > 0 || b.criticalFatigue > 0 || b.musterActive) ? 1 : 0;
    return bTrouble - aTrouble; // Descending (trouble first)
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text variant="display" weight="bold" style={{ textTransform: 'uppercase', letterSpacing: 2, color: theme.headlamp }}>
          SITE MIMIC PANEL
        </Text>
        <Text variant="dataLg" style={{ color: theme.lamp, fontVariant: ['tabular-nums'] }}>
          {now.toLocaleTimeString('en-GB')}
        </Text>
      </View>
      
      <View style={styles.grid}>
        {sortedZones.map((zone) => {
          const hasTrouble = zone.unaccounted > 0 || zone.criticalFatigue > 0 || zone.musterActive;

          return (
            <Card 
              key={zone.id} 
              style={[
                styles.zoneCard, 
                hasTrouble && { borderColor: theme.danger, borderWidth: 1 }
              ]}
            >
              <View style={[styles.zoneHeader, { borderBottomColor: theme.rule }]}>
                <Text variant="title" weight="bold" style={{ color: hasTrouble ? theme.danger : theme.headlamp }}>
                  {zone.name}
                </Text>
                {zone.musterActive && (
                  <View style={[styles.pill, { backgroundColor: theme.danger }]}>
                    <Text variant="label" style={{ color: '#fff' }}>ROLL CALL</Text>
                  </View>
                )}
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metric}>
                  <Text variant="hero" style={{ fontSize: 64, color: theme.headlamp, fontVariant: ['tabular-nums'] }}>
                    {zone.present}
                  </Text>
                  <Text variant="label" style={{ color: theme.safe, marginTop: spacing.xs }}>● ON-SITE</Text>
                </View>

                <View style={styles.metric}>
                  <Text variant="hero" style={{ fontSize: 64, color: zone.unaccounted > 0 ? theme.danger : theme.dust, fontVariant: ['tabular-nums'] }}>
                    {zone.unaccounted}
                  </Text>
                  <Text variant="label" style={{ color: zone.unaccounted > 0 ? theme.danger : theme.shadow, marginTop: spacing.xs }}>
                    {zone.unaccounted > 0 ? '● MISSING' : '● ACCOUNTED'}
                  </Text>
                </View>
              </View>

              <View style={[styles.fatigueRow, { borderTopColor: theme.rule }]}>
                <Text variant="label" style={{ color: theme.dust }}>CRITICAL FATIGUE BLOCKS</Text>
                <Text variant="display" weight="bold" style={{ color: zone.criticalFatigue > 0 ? theme.danger : theme.safe, fontVariant: ['tabular-nums'] }}>
                  {zone.criticalFatigue}
                </Text>
              </View>
            </Card>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  grid: { 
    flexDirection: 'row', 
    gap: spacing.xl,
    flexWrap: 'wrap',
  },
  zoneCard: { 
    flex: 1, 
    minWidth: 320,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  zoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    marginBottom: spacing.xl,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  metric: {
    flex: 1,
  },
  fatigueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
  }
});
