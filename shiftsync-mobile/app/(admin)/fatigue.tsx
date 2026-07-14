import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Screen, Text, Card } from '../../src/components/ui';
import { spacing, useTheme } from '../../src/theme';

export default function AdminFatigueScreen() {
  const theme = useTheme();

  const days = ['MON 12', 'TUE 13', 'WED 14', 'THU 15', 'FRI 16', 'SAT 17', 'SUN 18'];
  const workers = [
    { id: 'W-0001', name: 'K. Mensah' },
    { id: 'W-0002', name: 'J. Doe' },
    { id: 'W-0003', name: 'S. Smith' },
    { id: 'W-0004', name: 'A. Becker' },
    { id: 'W-0005', name: 'M. Rossi' },
  ];

  const getRiskBand = (score: number) => {
    if (score >= 80) return { color: theme.danger, glyph: '●', label: 'CRITICAL' };
    if (score >= 60) return { color: theme.warning, glyph: '◑', label: 'WARNING' };
    if (score >= 40) return { color: theme.advisory, glyph: '◐', label: 'ADVISORY' };
    return { color: theme.safe, glyph: '○', label: 'LOW' };
  };

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
                <Text variant="label" style={{ color: theme.dust }}>{w.id}</Text>
              </View>
              {days.map(d => {
                // Mock random score
                const score = Math.floor(Math.random() * 100);
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxl,
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
