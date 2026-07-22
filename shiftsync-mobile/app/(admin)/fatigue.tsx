import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Screen, Text, Spinner } from '../../src/components/ui';
import { spacing, useTheme } from '../../src/theme';
import { apiClient } from '../../src/api/client';

export default function AdminFatigueScreen() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<string[]>([]);
  const [workers, setWorkers] = useState<Array<{
    id: string;
    name: string;
    employeeNo?: string;
    scores: number[];
    riskLevel: string;
  }>>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiClient.fatigue.heatmap();
        setDays(data?.days || []);
        setWorkers(data?.workers || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getRiskBand = (score: number) => {
    if (score >= 80) return { color: theme.danger, glyph: '●', label: 'CRITICAL' };
    if (score >= 60) return { color: theme.warning, glyph: '◑', label: 'WARNING' };
    if (score >= 40) return { color: theme.advisory, glyph: '◐', label: 'ADVISORY' };
    return { color: theme.safe, glyph: '○', label: 'LOW' };
  };

  const riskSummary = useMemo(() => {
    let low = 0;
    let advisory = 0;
    let warning = 0;
    let critical = 0;
    workers.forEach(w => {
      if (w.riskLevel === 'CRITICAL') critical += 1;
      else if (w.riskLevel === 'WARNING') warning += 1;
      else if (w.riskLevel === 'ADVISORY') advisory += 1;
      else low += 1;
    });
    return { low, advisory, warning, critical };
  }, [workers]);

  if (loading) {
    return <Screen style={styles.center}><Spinner /></Screen>;
  }

  return (
    <Screen style={{ backgroundColor: theme.seam }}>
      <View style={styles.header}>
        <Text variant="display" weight="bold" style={{ textTransform: 'uppercase', letterSpacing: 2, color: theme.headlamp }}>
          Fatigue Matrix Heatmap
        </Text>
        <View style={styles.legend}>
          <Text variant="label" style={{ color: theme.shadow, marginRight: spacing.md }}>○ LOW</Text>
          <Text variant="label" style={{ color: theme.shadow, marginRight: spacing.md }}>◐ ADVISORY</Text>
          <Text variant="label" style={{ color: theme.shadow, marginRight: spacing.md }}>◑ WARNING</Text>
          <Text variant="label" style={{ color: theme.shadow }}>● CRITICAL</Text>
        </View>
      </View>

      <View style={[styles.summaryRow, { borderColor: theme.rule }]}>
        <Text variant="label" style={{ color: theme.safe }}>LOW {riskSummary.low}</Text>
        <Text variant="label" style={{ color: theme.advisory }}>ADVISORY {riskSummary.advisory}</Text>
        <Text variant="label" style={{ color: theme.warning }}>WARNING {riskSummary.warning}</Text>
        <Text variant="label" style={{ color: theme.critical }}>CRITICAL {riskSummary.critical}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={[styles.matrixWrap, { borderColor: theme.rule, backgroundColor: theme.anthracite }]}>
          <View style={[styles.row, { borderBottomColor: theme.rule }]}>
            <View style={[styles.workerCol, { borderRightColor: theme.rule }]} />
            {days.map(d => (
              <View key={d} style={[styles.dayCol, { borderRightColor: theme.rule }]}>
                <Text variant="label" weight="bold" style={{ color: theme.shadow }}>{d}</Text>
              </View>
            ))}
          </View>

          {workers.map(w => (
            <View key={w.id} style={[styles.row, { borderBottomColor: theme.rule }]}>
              <View style={[styles.workerCol, { borderRightColor: theme.rule }]}>
                <Text variant="title" weight="bold" style={{ color: theme.headlamp }}>{w.name}</Text>
                <Text variant="label" style={{ color: theme.dust }}>{w.employeeNo || w.id}</Text>
              </View>
              {days.map((d, idx) => {
                const score = w.scores[idx] ?? w.scores[w.scores.length - 1] ?? 0;
                const band = getRiskBand(score);
                
                return (
                  <View key={d} style={[styles.cell, { borderRightColor: theme.rule }]}>
                    <View style={[styles.cellInner, { backgroundColor: band.color }]}>
                      <Text style={{ color: '#000', fontSize: 16, marginRight: 4 }}>{band.glyph}</Text>
                      <Text variant="title" style={{ color: '#000', fontVariant: ['tabular-nums'], fontWeight: 'bold' }}>
                        {score}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  legend: { flexDirection: 'row', alignItems: 'center' },
  matrixWrap: { flex: 1, borderWidth: 1, borderRadius: 4, overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1 },
  workerCol: { width: 180, padding: spacing.md, justifyContent: 'center', borderRightWidth: 1 },
  dayCol: { flex: 1, padding: spacing.md, alignItems: 'center', borderRightWidth: 1 },
  cell: { flex: 1, borderRightWidth: 1, padding: 4 },
  cellInner: { 
    flex: 1, 
    minHeight: 48,
    borderRadius: 2, 
    flexDirection: 'row',
    justifyContent: 'center', 
    alignItems: 'center' 
  }
});
