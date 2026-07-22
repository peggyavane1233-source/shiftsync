import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Screen, Text, Card, Button, Spinner } from '../../../src/components/ui';
import { spacing, useTheme } from '../../../src/theme';
import { apiClient } from '../../../src/api/client';
import { format, parseISO } from 'date-fns';

export default function ShiftDetailsScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [shift, setShift] = useState<any>(null);
  const [usersById, setUsersById] = useState<Record<string, any>>({});
  const [available, setAvailable] = useState<any[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadData = async () => {
    try {
      const [data, users] = await Promise.all([
        apiClient.supervisor.listShifts(),
        apiClient.users.list(),
      ]);
      const match = data.find((s: any) => s.id === id);
      setShift(match);
      const map: Record<string, any> = {};
      users.forEach((u: any) => { map[u.id] = u; });
      setUsersById(map);
      if (match) {
        const avail = await apiClient.shifts.availableWorkers(match.id);
        setAvailable(avail);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [id]));

  const handleApproveSwap = async (assignmentId: string) => {
    try {
      if (!shift) return;
      const assignment = shift.assignments.find((a: any) => a.id === assignmentId);
      if (!assignment) return;
      const replacement = available.find((w: any) => w.id !== assignment.userId);
      if (!replacement) {
        Alert.alert('No replacement', 'No available workers to take this shift.');
        return;
      }
      setBusy(true);
      await apiClient.shifts.approveSwap(assignmentId, replacement.id);
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to approve swap.');
    } finally {
      setBusy(false);
    }
  };

  const handleRejectSwap = async (assignmentId: string) => {
    try {
      setBusy(true);
      await apiClient.shifts.rejectSwap(assignmentId);
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to reject swap.');
    } finally {
      setBusy(false);
    }
  };

  const handleUnassign = async (assignmentId: string, name: string) => {
    Alert.alert('Remove worker?', `Unassign ${name} from this shift?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unassign',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            await apiClient.shifts.unassign(assignmentId);
            await loadData();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to unassign.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleAssign = async (userId: string) => {
    try {
      setBusy(true);
      await apiClient.shifts.assign(id, [userId]);
      setShowAssign(false);
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to assign worker.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancelShift = async () => {
    Alert.alert(
      'CANCEL SHIFT?',
      'Are you sure you want to cancel this shift? This will notify all assigned workers.',
      [
        { text: 'NO', style: 'cancel' },
        {
          text: 'CANCEL SHIFT',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.shifts.cancel(id);
              router.back();
            } catch (e) {
              Alert.alert('Error', 'Failed to cancel shift.');
            }
          },
        },
      ]
    );
  };

  if (loading) return <Screen style={styles.center}><Spinner /></Screen>;
  if (!shift) return <Screen style={styles.center}><Text>Shift not found</Text></Screen>;

  const start = parseISO(shift.startTime);
  const short = shift.assignments.length < shift.requiredWorkers;

  return (
    <Screen style={{ backgroundColor: theme.surface }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <Text variant="display" weight="bold" style={{ color: theme.headlamp, textTransform: 'uppercase', marginBottom: spacing.sm }}>
          {format(start, 'EEE, MMM do')} • {shift.shiftType}
        </Text>
        <Text variant="dataLg" style={{ color: theme.dust, marginBottom: spacing.xl }}>
          {format(start, 'HH:mm')} — {format(parseISO(shift.endTime), 'HH:mm')}
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
          <Text variant="title" style={{ color: theme.headlamp }}>
            ASSIGNMENTS ({shift.assignments.length}/{shift.requiredWorkers})
          </Text>
          {short && (
            <Text variant="label" style={{ color: theme.warning }}>UNDERSTAFFED</Text>
          )}
        </View>

        {shift.assignments.map((assignment: any) => {
          const isSwapPending = assignment.status === 'SWAP_PENDING';
          const user = usersById[assignment.userId];
          const name = user?.displayName || `Worker ${assignment.userId.slice(-4)}`;
          return (
            <Card
              key={assignment.id}
              style={{
                marginBottom: spacing.sm,
                backgroundColor: theme.anthracite,
                borderColor: isSwapPending ? theme.primary : theme.rule,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text variant="label" style={{ color: theme.text }}>{name}</Text>
                  <Text variant="data" style={{ color: theme.dust, marginTop: 4 }}>
                    Status: {assignment.status}
                  </Text>
                </View>
                {!isSwapPending && (
                  <Button
                    title="REMOVE"
                    variant="secondary"
                    size="md"
                    disabled={busy}
                    onPress={() => handleUnassign(assignment.id, name)}
                  />
                )}
              </View>
              {isSwapPending && (
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                  <Button
                    title="APPROVE SWAP"
                    variant="primary"
                    size="md"
                    style={{ flex: 1 }}
                    disabled={busy}
                    onPress={() => handleApproveSwap(assignment.id)}
                  />
                  <Button
                    title="REJECT"
                    variant="secondary"
                    size="md"
                    style={{ flex: 1 }}
                    disabled={busy}
                    onPress={() => handleRejectSwap(assignment.id)}
                  />
                </View>
              )}
            </Card>
          );
        })}

        <Button
          title={showAssign ? 'HIDE AVAILABLE WORKERS' : 'ASSIGN WORKER'}
          variant="secondary"
          style={{ marginTop: spacing.lg }}
          onPress={() => setShowAssign(!showAssign)}
        />

        {showAssign && (
          <View style={{ marginTop: spacing.md }}>
            {available.length === 0 ? (
              <Text color="textMuted">No available workers (no conflicts).</Text>
            ) : (
              available.map((w: any) => (
                <TouchableOpacity
                  key={w.id}
                  onPress={() => handleAssign(w.id)}
                  disabled={busy}
                  style={[styles.availRow, { borderColor: theme.rule, backgroundColor: theme.anthracite }]}
                >
                  <Text variant="label" style={{ color: theme.headlamp }}>{w.displayName}</Text>
                  <Text variant="data" style={{ color: theme.lamp }}>ASSIGN</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        <View style={{ marginTop: spacing.xxl }}>
          <Button title="CANCEL SHIFT" variant="danger" size="lg" onPress={handleCancelShift} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  availRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
});
