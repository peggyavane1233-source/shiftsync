/**
 * Tap-to-schedule roster for mobile / Expo Go.
 * Workers × days grid with add / move / cancel actions backed by mock API.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
  RefreshControl,
} from 'react-native';
import { addDays, format, startOfDay, parseISO, isSameDay } from 'date-fns';
import { Text, Button, Spinner } from '../ui';
import { useTheme, spacing } from '../../theme';
import { apiClient } from '../../api/client';

type CellShift = {
  id: string;
  assignmentId?: string;
  type: 'DAY' | 'NIGHT';
  status: string;
  startTime: string;
  endTime: string;
  workerId: string;
  dayIdx: number;
};

type WorkerRow = {
  id: string;
  name: string;
  employeeNo?: string;
  departmentId?: string;
};

export function DragDropCalendar() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [cells, setCells] = useState<CellShift[]>([]);
  const [selected, setSelected] = useState<{ workerId: string; dayIdx: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => startOfDay(addDays(new Date(), i))),
    []
  );

  const load = useCallback(async () => {
    try {
      const [users, shifts] = await Promise.all([
        apiClient.users.list(),
        apiClient.admin.listRosterShifts(),
      ]);
      const workerRows = users
        .filter((u: any) => u.role === 'WORKER')
        .slice(0, 12)
        .map((u: any) => ({
          id: u.id,
          name: u.displayName,
          employeeNo: u.employeeNo,
          departmentId: u.departmentId,
        }));
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
            startTime: shift.startTime,
            endTime: shift.endTime,
            workerId: a.userId,
            dayIdx,
          });
        }
      }
      setCells(mapped);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to load roster.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const getCell = (workerId: string, dayIdx: number) =>
    cells.find((c) => c.workerId === workerId && c.dayIdx === dayIdx);

  const selectedCell = selected ? getCell(selected.workerId, selected.dayIdx) : null;
  const selectedWorker = selected ? workers.find((w) => w.id === selected.workerId) : null;

  const handleCreate = async (type: 'DAY' | 'NIGHT') => {
    if (!selected || !selectedWorker) return;
    setBusy(true);
    try {
      const day = days[selected.dayIdx]!;
      const startHour = type === 'DAY' ? 6 : 18;
      const start = new Date(day.getTime() + startHour * 3600000);
      const end = new Date(start.getTime() + 12 * 3600000);
      const deptId = selectedWorker.departmentId || 'dept-0000-0000-0000-000000000001';
      const shift = await apiClient.shifts.create({
        departmentId: deptId,
        shiftType: type,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        requiredWorkers: 1,
        status: 'DRAFT',
      });
      await apiClient.shifts.assign(shift.id, [selected.workerId]);
      setSelected(null);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create shift.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedCell) return;
    setBusy(true);
    try {
      if (selectedCell.assignmentId) {
        await apiClient.shifts.unassign(selectedCell.assignmentId);
      }
      // If no remaining assignments on that shift, cancel the shift itself
      const remaining = cells.filter(
        (c) => c.id === selectedCell.id && c.assignmentId !== selectedCell.assignmentId
      );
      if (remaining.length === 0) {
        await apiClient.shifts.cancel(selectedCell.id);
      }
      setSelected(null);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to cancel.');
    } finally {
      setBusy(false);
    }
  };

  const handleMove = async (targetDayIdx: number) => {
    if (!selectedCell || !selectedWorker) return;
    if (getCell(selectedWorker.id, targetDayIdx)) {
      Alert.alert('Conflict', 'Worker already has a shift that day.');
      return;
    }
    setBusy(true);
    try {
      const type = selectedCell.type;
      await handleCancelQuiet(selectedCell);
      const day = days[targetDayIdx]!;
      const startHour = type === 'DAY' ? 6 : 18;
      const start = new Date(day.getTime() + startHour * 3600000);
      const end = new Date(start.getTime() + 12 * 3600000);
      const deptId = selectedWorker.departmentId || 'dept-0000-0000-0000-000000000001';
      const shift = await apiClient.shifts.create({
        departmentId: deptId,
        shiftType: type,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        requiredWorkers: 1,
        status: 'DRAFT',
      });
      await apiClient.shifts.assign(shift.id, [selectedWorker.id]);
      setSelected(null);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to move shift.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancelQuiet = async (cell: CellShift) => {
    if (cell.assignmentId) await apiClient.shifts.unassign(cell.assignmentId);
    const remaining = cells.filter((c) => c.id === cell.id && c.assignmentId !== cell.assignmentId);
    if (remaining.length === 0) await apiClient.shifts.cancel(cell.id);
  };

  const typeColor = (type: string) => (type === 'NIGHT' ? theme.gangue : theme.lamp);

  if (loading) {
    return (
      <View style={styles.center}>
        <Spinner />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Text variant="label" style={{ color: theme.shadow, marginBottom: spacing.sm }}>
        TAP A CELL TO ADD, MOVE, OR CANCEL
      </Text>

      <ScrollView
        horizontal
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      >
        <View>
          <View style={[styles.row, { borderBottomColor: theme.rule }]}>
            <View style={[styles.workerCol, { borderRightColor: theme.rule }]}>
              <Text variant="label" style={{ color: theme.shadow }}>
                WORKER
              </Text>
            </View>
            {days.map((d, i) => (
              <View key={i} style={[styles.dayCol, { borderRightColor: theme.rule }]}>
                <Text variant="label" weight="bold" style={{ color: theme.headlamp }}>
                  {format(d, 'EEE dd').toUpperCase()}
                </Text>
              </View>
            ))}
          </View>

          <ScrollView style={{ maxHeight: 480 }}>
            {workers.map((w) => (
              <View key={w.id} style={[styles.row, { borderBottomColor: theme.rule }]}>
                <View style={[styles.workerCol, { borderRightColor: theme.rule }]}>
                  <Text variant="title" weight="bold" style={{ color: theme.headlamp, fontSize: 16 }}>
                    {w.name}
                  </Text>
                  <Text variant="label" style={{ color: theme.dust }}>
                    {w.employeeNo}
                  </Text>
                </View>
                {days.map((_, dayIdx) => {
                  const cell = getCell(w.id, dayIdx);
                  return (
                    <TouchableOpacity
                      key={dayIdx}
                      activeOpacity={0.7}
                      onPress={() => setSelected({ workerId: w.id, dayIdx })}
                      style={[styles.dayCol, { borderRightColor: theme.rule }]}
                    >
                      {cell ? (
                        <View style={[styles.shiftBlock, { backgroundColor: typeColor(cell.type) }]}>
                          <Text variant="label" style={{ color: '#000', fontWeight: 'bold' }}>
                            {cell.type}
                          </Text>
                        </View>
                      ) : (
                        <View style={[styles.emptyCell, { borderColor: theme.rule }]}>
                          <Text variant="label" style={{ color: theme.shadow }}>
                            +
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="fade">
        <View style={styles.modalBg}>
          <Pressable style={{ flex: 1 }} onPress={() => setSelected(null)} />
          <View style={[styles.sheet, { backgroundColor: theme.anthracite, borderTopColor: theme.rule }]}>
            <Text variant="display" weight="bold" style={{ color: theme.headlamp, marginBottom: spacing.xs }}>
              {selectedWorker?.name}
            </Text>
            <Text variant="data" style={{ color: theme.dust, marginBottom: spacing.lg }}>
              {selected ? format(days[selected.dayIdx]!, 'EEEE, MMM d') : ''}
            </Text>

            {selectedCell ? (
              <>
                <Text variant="label" style={{ color: theme.shadow, marginBottom: spacing.sm }}>
                  CURRENT: {selectedCell.type} SHIFT
                </Text>
                <Button
                  title="CANCEL THIS SHIFT"
                  variant="danger"
                  loading={busy}
                  onPress={handleCancel}
                  style={{ marginBottom: spacing.md }}
                />
                <Text variant="label" style={{ color: theme.shadow, marginBottom: spacing.sm }}>
                  MOVE TO DAY
                </Text>
                <ScrollView horizontal style={{ marginBottom: spacing.md }}>
                  {days.map((d, i) => (
                    <TouchableOpacity
                      key={i}
                      disabled={busy || i === selected?.dayIdx}
                      onPress={() => handleMove(i)}
                      style={[
                        styles.moveChip,
                        {
                          backgroundColor: i === selected?.dayIdx ? theme.lamp : theme.gangue,
                          borderColor: theme.rule,
                          opacity: i === selected?.dayIdx ? 0.5 : 1,
                        },
                      ]}
                    >
                      <Text variant="label" style={{ color: i === selected?.dayIdx ? '#000' : theme.headlamp }}>
                        {format(d, 'EEE dd').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            ) : (
              <>
                <Text variant="label" style={{ color: theme.shadow, marginBottom: spacing.sm }}>
                  ADD SHIFT
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  <Button
                    title="DAY"
                    variant="primary"
                    loading={busy}
                    style={{ flex: 1 }}
                    onPress={() => handleCreate('DAY')}
                  />
                  <Button
                    title="NIGHT"
                    variant="secondary"
                    loading={busy}
                    style={{ flex: 1 }}
                    onPress={() => handleCreate('NIGHT')}
                  />
                </View>
              </>
            )}

            <Button
              title="CLOSE"
              variant="ghost"
              style={{ marginTop: spacing.lg }}
              onPress={() => setSelected(null)}
              disabled={busy}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', borderBottomWidth: 1 },
  workerCol: { width: 140, padding: spacing.sm, borderRightWidth: 1, justifyContent: 'center' },
  dayCol: {
    width: 88,
    minHeight: 56,
    padding: 4,
    borderRightWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shiftBlock: {
    width: '100%',
    minHeight: 44,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  emptyCell: {
    width: '100%',
    minHeight: 44,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { padding: spacing.xl, paddingBottom: 40, borderTopWidth: 2 },
  moveChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
});
