import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal, Pressable } from 'react-native';
import { RefreshCcw } from 'lucide-react-native';
import { format, differenceInSeconds } from 'date-fns';
import { Screen, Text, Button, Spinner, TallyTag, TaskModal } from '../../src/components/ui';
import { spacing, useTheme } from '../../src/theme';
import { apiClient } from '../../src/api/client';

export default function HeadcountScreen() {
  const theme = useTheme();
  const [shift, setShift] = useState<any>(null);
  const [headcount, setHeadcount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT'>('ALL');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [now, setNow] = useState(new Date());

  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [assigningTaskWorker, setAssigningTaskWorker] = useState<{ id: string, name: string } | null>(null);

  const loadData = async () => {
    try {
      if (!shift) {
        const shifts = await apiClient.supervisor.listShifts();
        if (shifts.length > 0) {
          setShift(shifts[0]);
          await fetchStats(shifts[0].id);
        }
      } else {
        await fetchStats(shift.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (shiftId: string) => {
    const stats = await apiClient.supervisor.headcount(shiftId);
    setHeadcount(stats);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // 10s refresh (attendance service REST only)
    return () => clearInterval(interval);
  }, [shift]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleMarkPresent = async () => {
    if (!selectedWorker) return;
    Alert.alert(
      "MANUAL OVERRIDE",
      `This will manually mark ${selectedWorker.name} as present on the board. This action is permanently audited.`,
      [
        { text: "CANCEL", style: "cancel" },
        { 
          text: "MARK PRESENT", 
          style: "destructive",
          onPress: async () => {
            try {
              await apiClient.supervisor.markManual(shift.id, selectedWorker.id);
              setSelectedWorker(null);
              fetchStats(shift.id);
            } catch (e: any) {
              Alert.alert("Error", e.message || "Failed to mark present");
            }
          }
        }
      ]
    );
  };

  const handleAssignTask = () => {
    if (selectedWorker) {
      setAssigningTaskWorker({ id: selectedWorker.id, name: selectedWorker.name });
      setSelectedWorker(null);
    }
  };

  if (loading || !headcount) {
    return <Screen style={styles.center}><Spinner /></Screen>;
  }

  // Generate 52 hooks. Fill them with assignments.
  const ROSTER_SIZE = 52;
  const presentIds = headcount.records.map((r: any) => r.userId);
  const assignments = headcount.assignments || [];
  
  // Create padded array of 52 slots
  const boardSlots = Array.from({ length: ROSTER_SIZE }).map((_, i) => {
    const assignment = assignments[i];
    if (!assignment) return { isEmptySlot: true, id: `empty-${i}` };

    const isPresent = presentIds.includes(assignment.userId);
    const time = headcount.records.find((r: any) => r.userId === assignment.userId)?.checkInTime;
    
    return {
      isEmptySlot: false,
      id: assignment.userId,
      name: `Worker ${assignment.userId.slice(-4)}`,
      empNo: assignment.userId.slice(0, 5).toUpperCase(),
      isPresent,
      isLate: !isPresent && i % 4 === 0, // Mock: some absent workers are flagged as Late
      time
    };
  });

  const ageSeconds = differenceInSeconds(now, lastUpdated);
  const presentCount = headcount.present || 0;
  const expectedCount = headcount.expected || ROSTER_SIZE;
  const missingCount = headcount.missing || 0;

  return (
    <Screen style={{ backgroundColor: theme.seam }}>
      
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.rule }]}>
        <View style={styles.headerTop}>
          <Text variant="title" weight="bold" style={{ color: theme.headlamp, textTransform: 'uppercase' }}>
            ZONE 2
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <RefreshCcw size={16} color={theme.dust} />
            <Text variant="data" style={{ color: theme.dust, marginLeft: spacing.xs }}>{ageSeconds}s ago</Text>
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text variant="hero" style={{ color: theme.headlamp }}>{presentCount}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
              <View style={[styles.colorBar, { backgroundColor: theme.safe }]} />
              <Text variant="label" style={{ color: theme.safe, marginLeft: spacing.xs }}>UNDERGROUND</Text>
            </View>
          </View>
          
          <View style={styles.statBox}>
            <Text variant="hero" style={{ color: theme.headlamp }}>{Math.floor(missingCount / 3)}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
              <View style={[styles.colorBar, { backgroundColor: theme.advisory }]} />
              <Text variant="label" style={{ color: theme.advisory, marginLeft: spacing.xs }}>LATE</Text>
            </View>
          </View>

          <View style={styles.statBox}>
            <Text variant="hero" style={{ color: theme.headlamp }}>{missingCount - Math.floor(missingCount / 3)}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
              <View style={[styles.colorBar, { backgroundColor: theme.danger }]} />
              <Text variant="label" style={{ color: theme.danger, marginLeft: spacing.xs }}>ABSENT</Text>
            </View>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          {['ALL', 'PRESENT', 'ABSENT'].map(f => (
            <TouchableOpacity 
              key={f}
              onPress={() => setFilter(f as any)}
              style={{
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.sm,
                borderBottomWidth: 2,
                borderBottomColor: filter === f ? theme.lamp : 'transparent'
              }}
            >
              <Text variant="label" style={{ color: filter === f ? theme.lamp : theme.dust }}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* THE BOARD */}
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.boardContainer}>
          {boardSlots.map((slot) => {
            if (slot.isEmptySlot) return null; // We can hide empty slots in this detailed list view

            // Filter logic
            if (filter === 'PRESENT' && !slot.isPresent) return null;
            if (filter === 'ABSENT' && slot.isPresent) return null;

            return (
              <TouchableOpacity 
                key={slot.id} 
                activeOpacity={0.7}
                onPress={() => setSelectedWorker(slot)}
                style={[styles.workerRow, { backgroundColor: theme.anthracite, borderColor: theme.rule }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.statusIndicator, { backgroundColor: slot.isPresent ? theme.safe : (slot.isLate ? theme.advisory : theme.danger) }]} />
                  <View style={{ marginLeft: spacing.md }}>
                    <Text variant="md" weight="bold" style={{ color: theme.headlamp }}>{slot.name}</Text>
                    <Text variant="label" style={{ color: theme.dust, marginTop: 4 }}>ID: {slot.empNo}</Text>
                  </View>
                </View>
                
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="label" style={{ color: slot.isPresent ? theme.safe : (slot.isLate ? theme.advisory : theme.danger) }}>
                    {slot.isPresent ? 'PRESENT' : (slot.isLate ? 'LATE' : 'ABSENT')}
                  </Text>
                  <Text variant="data" style={{ color: theme.shadow, marginTop: 4 }}>
                    {slot.time ? format(new Date(slot.time), 'HH:mm') : '--:--'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* BOTTOM SHEET MODAL */}
      <Modal visible={!!selectedWorker} transparent animationType="slide">
        <View style={styles.modalBg}>
          <Pressable style={{ flex: 1 }} onPress={() => setSelectedWorker(null)} />
          {selectedWorker && (
            <View style={[styles.bottomSheet, { backgroundColor: theme.anthracite, borderTopColor: theme.rule }]}>
              <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
                <View style={{ width: 40, height: 4, backgroundColor: theme.rule, borderRadius: 2 }} />
              </View>
              
              <Text variant="display" weight="bold" style={{ color: theme.headlamp }}>{selectedWorker.name}</Text>
              <Text variant="dataLg" style={{ color: theme.dust, marginBottom: spacing.lg }}>{selectedWorker.empNo}</Text>
              
              <View style={[styles.modalDataRow, { borderBottomColor: theme.rule }]}>
                <Text variant="label" style={{ color: theme.shadow }}>LAST CHECK-IN</Text>
                <Text variant="data" style={{ color: theme.headlamp }}>
                  {selectedWorker.isPresent && selectedWorker.time ? format(new Date(selectedWorker.time), 'HH:mm:ss') : '--:--:--'}
                </Text>
              </View>

              <View style={[styles.modalDataRow, { borderBottomColor: theme.rule, marginBottom: spacing.xl }]}>
                <Text variant="label" style={{ color: theme.shadow }}>FATIGUE RISK</Text>
                <Text variant="status" style={{ color: selectedWorker.isLate ? theme.warning : theme.safe }}>
                  {selectedWorker.isLate ? 'WARNING' : 'SAFE'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
                <Button title="CALL" variant="secondary" style={[styles.actionBtn, { flex: 1 }]} onPress={() => {}} />
                <Button title="SMS" variant="secondary" style={[styles.actionBtn, { flex: 1 }]} onPress={() => {}} />
              </View>

              {!selectedWorker.isPresent && (
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  <Button 
                    title="ASSIGN TASK" 
                    variant="secondary" 
                    style={[styles.actionBtn, { flex: 1, borderColor: theme.advisory }]} 
                    textStyle={{ color: theme.advisory }}
                    onPress={handleAssignTask} 
                  />
                  <Button 
                    title="MARK PRESENT" 
                    variant="primary" 
                    style={[styles.actionBtn, { flex: 1 }]} 
                    onPress={handleMarkPresent} 
                  />
                </View>
              )}
            </View>
          )}
        </View>
      </Modal>

      <TaskModal 
        visible={!!assigningTaskWorker} 
        workerId={assigningTaskWorker?.id || ''} 
        workerName={assigningTaskWorker?.name || ''} 
        onClose={() => setAssigningTaskWorker(null)}
        onSuccess={() => setAssigningTaskWorker(null)}
      />

    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#0A0C10',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  statBox: { alignItems: 'flex-start' },
  colorBar: { width: 16, height: 4, borderRadius: 2 },
  filterRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  
  boardContainer: {
    padding: spacing.md,
    paddingBottom: 100
  },
  workerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderRadius: 4
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  emptyHook: {
    width: 60,
    height: 80,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 8,
  },
  hookPin: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagSlot: {
    width: 60,
    height: 80,
    alignItems: 'center',
  },
  lateGlow: {
    position: 'absolute',
    top: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFB000',
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
  },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bottomSheet: {
    borderTopWidth: 1,
    padding: spacing.xl,
    paddingBottom: 60,
  },
  modalDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  actionBtn: { height: 56, marginBottom: spacing.md }
});
