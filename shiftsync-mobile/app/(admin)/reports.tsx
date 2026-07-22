/**
 * Admin reports portal — mock-backed attendance / overtime / fatigue summaries.
 */
import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Share, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen, Text, Card, Button, Spinner } from '../../src/components/ui';
import { spacing, useTheme } from '../../src/theme';
import { apiClient } from '../../src/api/client';
import { format, parseISO } from 'date-fns';

export default function AdminReportsScreen() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);

  const load = async () => {
    try {
      const data = await apiClient.admin.reports();
      setReport(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const buildCsv = () => {
    if (!report) return '';
    const lines = [
      'Worker,Employee No,Shifts,Fatigue Score,Risk Level',
      ...report.byWorker.map(
        (r: any) =>
          `"${r.workerName}",${r.employeeNo},${r.shifts},${r.fatigueScore},${r.riskLevel}`
      ),
    ];
    return lines.join('\n');
  };

  const handleExport = async (kind: 'CSV' | 'SUMMARY') => {
    if (!report) return;
    const body =
      kind === 'CSV'
        ? buildCsv()
        : [
            `ShiftSync Report — ${format(parseISO(report.generatedAt), 'yyyy-MM-dd HH:mm')}`,
            `Attendance records: ${report.summary.attendance}`,
            `Overtime (>10h): ${report.summary.overtime}`,
            `Critical fatigue: ${report.summary.critical}`,
            `Warning fatigue: ${report.summary.warning}`,
          ].join('\n');

    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).clipboard) {
        await (navigator as any).clipboard.writeText(body);
        Alert.alert('Copied', `${kind} report copied to clipboard.`);
      } else {
        await Share.share({ message: body, title: `ShiftSync ${kind} Report` });
      }
    } catch (e: any) {
      Alert.alert('Export', body.slice(0, 500));
    }
  };

  if (loading) return <Screen style={styles.center}><Spinner /></Screen>;
  if (!report) {
    return (
      <Screen style={styles.center}>
        <Text>No report data.</Text>
        <Button title="Retry" onPress={load} style={{ marginTop: spacing.md }} />
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: theme.seam }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="display" weight="bold" style={{ color: theme.headlamp, marginBottom: spacing.sm }}>
          REPORTS PORTAL
        </Text>
        <Text variant="data" style={{ color: theme.dust, marginBottom: spacing.xl }}>
          Generated {format(parseISO(report.generatedAt), 'EEE MMM d • HH:mm')}
        </Text>

        <View style={styles.summaryRow}>
          <Card style={styles.statCard}>
            <Text variant="hero" style={{ color: theme.headlamp }}>{report.summary.attendance}</Text>
            <Text variant="label" style={{ color: theme.dust }}>ATTENDANCE</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text variant="hero" style={{ color: theme.warning }}>{report.summary.overtime}</Text>
            <Text variant="label" style={{ color: theme.dust }}>OVERTIME</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text variant="hero" style={{ color: theme.danger }}>{report.summary.critical}</Text>
            <Text variant="label" style={{ color: theme.dust }}>CRITICAL</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text variant="hero" style={{ color: theme.advisory }}>{report.summary.warning}</Text>
            <Text variant="label" style={{ color: theme.dust }}>WARNING</Text>
          </Card>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl }}>
          <Button title="EXPORT CSV" variant="secondary" style={{ flex: 1 }} onPress={() => handleExport('CSV')} />
          <Button title="EXPORT SUMMARY" variant="primary" style={{ flex: 1 }} onPress={() => handleExport('SUMMARY')} />
        </View>

        <Text variant="title" style={{ color: theme.headlamp, marginBottom: spacing.md }}>
          BY WORKER
        </Text>
        {report.byWorker.map((row: any) => (
          <Card key={row.employeeNo} style={[styles.rowCard, { backgroundColor: theme.anthracite, borderColor: theme.rule }]}>
            <View style={{ flex: 1 }}>
              <Text variant="label" style={{ color: theme.headlamp }}>{row.workerName}</Text>
              <Text variant="data" style={{ color: theme.dust }}>{row.employeeNo} · {row.shifts} shifts</Text>
            </View>
            <Text
              variant="dataLg"
              style={{
                color:
                  row.riskLevel === 'CRITICAL'
                    ? theme.danger
                    : row.riskLevel === 'WARNING'
                      ? theme.warning
                      : theme.safe,
              }}
            >
              {row.fatigueScore}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: spacing.md, paddingBottom: spacing.xxl },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xl },
  statCard: { flex: 1, minWidth: 120, alignItems: 'center', padding: spacing.md },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
});
