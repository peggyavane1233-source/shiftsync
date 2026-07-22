import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, Pressable, Alert } from 'react-native';
import { addDays, format, startOfDay, parseISO, isSameDay } from 'date-fns';
import { Text, Button, Spinner } from '../ui';
import { useTheme, spacing } from '../../theme';
import { apiClient } from '../../api/client';

type CellShift = {
  id: string;
  assignmentId?: string;
  type: 'DAY' | 'NIGHT';
  status: string;
  workerId: string;
  dayIdx: number;
};

export function DragDropCalendar() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState<any[]>([]);
  const [cells, setCells] = useState<CellShift[]>([]);
  const [selected, setSelected] = useState<{ workerId: string; dayIdx: number } | null>(null);
  const [publishModal, setPublishModal] = useState(false);
  const [busy, setBusy] = useState(false);

  const days = useMemo(
    () => Array.from({ length: 5 }, (_, i) => startOfDay(addDays(new Date(), i))),
    []
  );

  const load = useCallback(async () => {
    try {
      const [users, shifts] = await Promise.all([
        apiClient.users.list(),
        apiClient.admin.listRosterShifts(),
      ]);
      const workerRows = users.filter((u: any) => u.role === 'WORKER').slice(0, 10);
      setWorkers(workerRows);

      const mapped: CellShift[] = [];
      for (const shift of shifts) {
        const dayIdx = days.findIndex((d) => isSameDay(parseISO(shift.startTime), d));
        if (dayIdx < 0) continue;
        for (const a of shift.assignments || []) {
          mapped.push({
            id: shift.id,
            assignmentId: a.id,
            type: shift.shiftType === 'NIGHT' ? 'NIGHT' : 'DAY',
            status: shift.status || 'PUBLISHED',
            workerId: a.userId,
            dayIdx,
          });
        }
      }
      setCells(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const getCell = (workerId: string, dayIdx: number) =>
    cells.find((c) => c.workerId === workerId && c.dayIdx === dayIdx);

  const draftCount = cells.filter((c) => c.status === 'DRAFT').length;

  const handleCreate = async (type: 'DAY' | 'NIGHT') => {
    if (!selected) return;
    const worker = workers.find((w) => w.id === selected.workerId);
    if (!worker) return;
    setBusy(true);
    try {
      const day = days[selected.dayIdx]!;
      const start = new Date(day.getTime() + (type === 'DAY' ? 6 : 18) * 3600000);
      const end = new Date(start.getTime() + 12 * 3600000);
      const shift = await apiClient.shifts.create({
        departmentId: worker.departmentId || 'dept-0000-0000-0000-000000000001',
        shiftType: type,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        requiredWorkers: 1,
        status: 'DRAFT',
      });
      await apiClient.shifts.assign(shift.id, [worker.id]);
      setSelected(null);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!selected) return;
    const cell = getCell(selected.workerId, selected.dayIdx);
    if (!cell) return;
    setBusy(true);
    try {
      if (cell.assignmentId) await apiClient.shifts.unassign(cell.assignmentId);
      const remaining = cells.filter((c) => c.id === cell.id && c.assignmentId !== cell.assignmentId);
      if (remaining.length === 0) await apiClient.shifts.cancel(cell.id);
      setSelected(null);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to cancel');
    } finally {
      setBusy(false);
    }
  };

  const publishAll = async () => {
    try {
      const res = await apiClient.admin.publishRoster();
      setPublishModal(false);
      Alert.alert('Published', `${res.published ?? 0} drafts published.`);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Publish failed');
    }
  };

  const getShiftTypeColor = (type: string) => {
    if (type === 'DAY') return theme.lamp;
    if (type === 'NIGHT') return theme.gangue;
    return theme.dust;
  };

  if (loading) {
    return <View style={styles.center}><Spinner /></View>;
  }

  const selectedCell = selected ? getCell(selected.workerId, selected.dayIdx) : null;
  const selectedWorker = selected ? workers.find((w) => w.id === selected.workerId) : null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.toolbar}>
        <View style={styles.legend}>
          <View style={[styles.legendBox, { backgroundColor: theme.lamp }]} />
          <Text variant="label" style={{ color: theme.shadow, marginRight: spacing.lg }}>DAY</Text>
          <View style={[styles.legendBox, { backgroundColor: theme.gangue }]} />
          <Text variant="label" style={{ color: theme.shadow, marginRight: spacing.lg }}>NIGHT</Text>
        </View>
        <Button
          title={`PUBLISH (${draftCount} DRAFTS)`}
          variant={draftCount > 0 ? 'primary' : 'secondary'}
          disabled={draftCount === 0}
          onPress={() => setPublishModal(true)}
        />
      </View>

      <ScrollView horizontal contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={styles.grid}>
          <View style={[styles.row, { borderBottomColor: theme.rule }]}>
            <View style={[styles.headerCell, { width: 200, borderRightColor: theme.rule }]}>
              <Text variant="label" style={{ color: theme.shadow }}>WORKER</Text>
            </View>
            {days.map((day, dIdx) => (
              <View key={dIdx} style={[styles.headerCell, { width: 140, borderRightColor: theme.rule }]}>
                <Text variant="title" weight="bold" style={{ color: theme.headlamp }}>
                  {format(day, 'EEE dd').toUpperCase()}
                </Text>
              </View>
            ))}
          </View>

          {workers.map((worker) => (
            <View key={worker.id} style={[styles.row, { borderBottomColor: theme.rule }]}>
              <View style={[styles.cell, { width: 200, borderRightColor: theme.rule }]}>
                <Text variant="title" weight="bold" style={{ color: theme.headlamp }}>{worker.displayName}</Text>
                <Text variant="label" style={{ color: theme.shadow }}>{worker.employeeNo}</Text>
              </View>
              {days.map((_, dIdx) => {
                const shift = getCell(worker.id, dIdx);
                return (
                  <TouchableOpacity
                    key={dIdx}
                    onPress={() => setSelected({ workerId: worker.id, dayIdx: dIdx })}
                    style={[styles.cell, { width: 140, borderRightColor: theme.rule }]}
                  >
                    {shift ? (
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
                    ) : (
                      <Text variant="label" style={{ color: theme.shadow, textAlign: 'center' }}>+</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="fade">
        <View style={styles.modalBg}>
          <Pressable style={{ flex: 1 }} onPress={() => setSelected(null)} />
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.rule }]}>
            <Text variant="display" weight="bold" style={{ color: theme.headlamp, marginBottom: spacing.sm }}>
              {selectedWorker?.displayName}
            </Text>
            <Text variant="data" style={{ color: theme.dust, marginBottom: spacing.lg }}>
              {selected ? format(days[selected.dayIdx]!, 'EEEE, MMM d') : ''}
            </Text>
            {selectedCell ? (
              <Button title="CANCEL SHIFT" variant="danger" loading={busy} onPress={handleCancel} />
            ) : (
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <Button title="ADD DAY" variant="primary" style={{ flex: 1 }} loading={busy} onPress={() => handleCreate('DAY')} />
                <Button title="ADD NIGHT" variant="secondary" style={{ flex: 1 }} loading={busy} onPress={() => handleCreate('NIGHT')} />
              </View>
            )}
            <Button title="CLOSE" variant="ghost" style={{ marginTop: spacing.md }} onPress={() => setSelected(null)} />
          </View>
        </View>
      </Modal>

      <Modal visible={publishModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <Pressable style={{ flex: 1 }} onPress={() => setPublishModal(false)} />
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.rule }]}>
            <Text variant="display" weight="bold" style={{ color: theme.headlamp, marginBottom: spacing.md }}>
              CONFIRM PUBLISH
            </Text>
            <Text variant="lg" style={{ color: theme.dust, marginBottom: spacing.xl }}>
              Publish {draftCount} draft shifts and notify workers.
            </Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  legend: { flexDirection: 'row', alignItems: 'center' },
  legendBox: { width: 16, height: 16, borderRadius: 2, marginRight: spacing.xs },
  grid: {
    borderWidth: 1,
    borderColor: '#2C343D',
    borderRadius: 4,
    backgroundColor: '#14181D',
  },
  row: { flexDirection: 'row', borderBottomWidth: 1 },
  headerCell: { padding: spacing.md, borderRightWidth: 1, flexDirection: 'row', justifyContent: 'space-between' },
  cell: { padding: spacing.sm, borderRightWidth: 1, justifyContent: 'center', minHeight: 56 },
  shiftBlock: {
    padding: spacing.sm,
    borderRadius: 4,
    minHeight: 48,
    justifyContent: 'center',
  },
  hatched: {
    opacity: 0.8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#000',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: 480,
    maxWidth: '92%',
    borderWidth: 1,
    padding: spacing.xl,
    borderRadius: 8,
  },
});
