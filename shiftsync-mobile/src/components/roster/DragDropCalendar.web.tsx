import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, Pressable } from 'react-native';
import { Text, Button } from '../ui';
import { useTheme, spacing } from '../../theme';

// Mock Data
const WORKERS = [
  { id: 'w1', name: 'K. Mensah', role: 'Blaster', certs: ['BLAST'] },
  { id: 'w2', name: 'J. Doe', role: 'Operator', certs: [] },
  { id: 'w3', name: 'S. Smith', role: 'Supervisor', certs: ['BLAST', 'SUP'] },
  { id: 'w4', name: 'A. Becker', role: 'Operator', certs: [] },
];

const DAYS = ['MON 12', 'TUE 13', 'WED 14', 'THU 15', 'FRI 16'];

// Mock existing schedule
type Shift = {
  id: string;
  type: 'DAY' | 'NIGHT' | 'SWING';
  status: 'PUBLISHED' | 'DRAFT';
  workerId: string;
  dayIdx: number;
};

const INITIAL_SHIFTS: Shift[] = [
  { id: 's1', type: 'DAY', status: 'PUBLISHED', workerId: 'w1', dayIdx: 0 },
  { id: 's2', type: 'NIGHT', status: 'DRAFT', workerId: 'w2', dayIdx: 0 },
  { id: 's3', type: 'SWING', status: 'DRAFT', workerId: 'w1', dayIdx: 1 },
];

export function DragDropCalendar() {
  const theme = useTheme();
  const [shifts, setShifts] = useState<Shift[]>(INITIAL_SHIFTS);
  const [draggedShift, setDraggedShift] = useState<Shift | null>(null);
  const [publishModal, setPublishModal] = useState(false);

  const getShiftTypeColor = (type: string) => {
    if (type === 'DAY') return theme.lamp;
    if (type === 'NIGHT') return theme.gangue;
    return theme.dust;
  };

  const getConflict = (workerId: string, dayIdx: number, draggedType?: string) => {
    const existing = shifts.filter(s => s.workerId === workerId && s.dayIdx === dayIdx && s.id !== draggedShift?.id);
    const firstExisting = existing[0];
    if (firstExisting) {
      return `Overlaps ${firstExisting.type} shift`;
    }
    const worker = WORKERS.find(w => w.id === workerId);
    if (draggedType === 'NIGHT' && !worker?.certs?.includes('BLAST')) {
       // Mock arbitrary business rule
       return "Fatigue CRITICAL — needs override";
    }
    return null;
  };

  const draftCount = shifts.filter(s => s.status === 'DRAFT').length;
  const workersToNotify = new Set(shifts.filter(s => s.status === 'DRAFT').map(s => s.workerId)).size;

  const publishAll = () => {
    setShifts(shifts.map(s => ({ ...s, status: 'PUBLISHED' })));
    setPublishModal(false);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.toolbar}>
        <View style={styles.legend}>
          <View style={[styles.legendBox, { backgroundColor: theme.lamp }]} />
          <Text variant="label" style={{ color: theme.shadow, marginRight: spacing.lg }}>DAY</Text>
          <View style={[styles.legendBox, { backgroundColor: theme.gangue }]} />
          <Text variant="label" style={{ color: theme.shadow, marginRight: spacing.lg }}>NIGHT</Text>
          <View style={[styles.legendBox, { backgroundColor: theme.dust }]} />
          <Text variant="label" style={{ color: theme.shadow, marginRight: spacing.lg }}>SWING</Text>
        </View>
        <Button 
          title={`PUBLISH (${draftCount} DRAFTS)`} 
          variant={draftCount > 0 ? "primary" : "secondary"} 
          disabled={draftCount === 0}
          onPress={() => setPublishModal(true)} 
        />
      </View>

      <ScrollView horizontal contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={styles.grid}>
          {/* HEADER ROW */}
          <View style={[styles.row, { borderBottomColor: theme.rule }]}>
            <View style={[styles.headerCell, { width: 200, borderRightColor: theme.rule }]}>
              <Text variant="label" style={{ color: theme.shadow }}>WORKER</Text>
            </View>
            {DAYS.map((day, dIdx) => (
              <View key={day} style={[styles.headerCell, { width: 140, borderRightColor: theme.rule }]}>
                <Text variant="title" weight="bold" style={{ color: theme.headlamp }}>{day}</Text>
                {/* Mock understaffing on Wednesday */}
                {dIdx === 2 && (
                  <View style={[styles.understaffed, { borderColor: theme.advisory }]}>
                     <Text variant="label" style={{ color: theme.advisory, fontVariant: ['tabular-nums'] }}>3 / 5</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* WORKER ROWS */}
          {WORKERS.map(worker => (
            <View key={worker.id} style={[styles.row, { borderBottomColor: theme.rule }]}>
              <View style={[styles.cell, { width: 200, borderRightColor: theme.rule }]}>
                <Text variant="title" weight="bold" style={{ color: theme.headlamp }}>{worker.name}</Text>
                <Text variant="label" style={{ color: theme.shadow }}>{worker.role}</Text>
              </View>

              {DAYS.map((_, dIdx) => {
                const shift = shifts.find(s => s.workerId === worker.id && s.dayIdx === dIdx);
                const conflict = draggedShift ? getConflict(worker.id, dIdx, draggedShift.type) : null;
                const isDragTarget = draggedShift && conflict;

                return (
                  <View 
                    key={dIdx} 
                    style={[
                      styles.cell, 
                      { width: 140, borderRightColor: theme.rule },
                      isDragTarget && { backgroundColor: '#2C1111' } // Dark red tint
                    ]}
                  >
                    {shift && (
                      <View 
                        style={[
                          styles.shiftBlock, 
                          { backgroundColor: getShiftTypeColor(shift.type) },
                          shift.status === 'DRAFT' && styles.hatched,
                        ]}
                      >
                        <Text variant="label" style={{ color: '#000', fontWeight: 'bold' }}>{shift.type}</Text>
                        {shift.status === 'DRAFT' && <Text variant="xs" style={{ color: '#000' }}>DRAFT</Text>}
                      </View>
                    )}
                    
                    {isDragTarget && (
                       <View style={[styles.conflictTooltip, { borderColor: theme.danger }]}>
                          <Text variant="xs" style={{ color: theme.danger }}>{conflict}</Text>
                       </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* PUBLISH MODAL */}
      <Modal visible={publishModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <Pressable style={{ flex: 1 }} onPress={() => setPublishModal(false)} />
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.rule }]}>
            <Text variant="display" weight="bold" style={{ color: theme.headlamp, marginBottom: spacing.md }}>
              CONFIRM PUBLISH
            </Text>
            <Text variant="lg" style={{ color: theme.dust, marginBottom: spacing.xl }}>
              You are about to publish {draftCount} new shifts.
            </Text>
            
            <View style={{ padding: spacing.md, backgroundColor: theme.gangue, borderRadius: 4, marginBottom: spacing.xl }}>
              <Text variant="title" style={{ color: theme.headlamp, textAlign: 'center' }}>
                Publish and notify {workersToNotify} workers.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md }}>
              <Button title="CANCEL" variant="secondary" onPress={() => setPublishModal(false)} />
              <Button title="PUBLISH NOW" variant="primary" onPress={publishAll} />
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  legend: { flexDirection: 'row', alignItems: 'center' },
  legendBox: { width: 16, height: 16, borderRadius: 2, marginRight: spacing.xs },
  grid: { 
    borderWidth: 1, 
    borderColor: '#2C343D',
    borderRadius: 4,
    backgroundColor: '#14181D'
  },
  row: { flexDirection: 'row', borderBottomWidth: 1 },
  headerCell: { padding: spacing.md, borderRightWidth: 1, flexDirection: 'row', justifyContent: 'space-between' },
  cell: { padding: spacing.sm, borderRightWidth: 1, justifyContent: 'center' },
  understaffed: {
    borderWidth: 1,
    paddingHorizontal: 4,
    borderRadius: 2
  },
  shiftBlock: {
    padding: spacing.sm,
    borderRadius: 4,
    minHeight: 48,
    justifyContent: 'center',
  },
  hatched: {
    // In React Native Web we can't easily do SVG patterns inline without standard DOM
    // For now we simulate hatch via border and opacity
    opacity: 0.8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#000'
  },
  conflictTooltip: {
    position: 'absolute',
    top: 2, left: 2, right: 2,
    borderWidth: 1,
    backgroundColor: '#1E1111',
    padding: 2,
    zIndex: 10
  },
  modalBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center', alignItems: 'center'
  },
  modalCard: {
    width: 480,
    borderWidth: 1,
    padding: spacing.xl,
    borderRadius: 8,
  }
});
