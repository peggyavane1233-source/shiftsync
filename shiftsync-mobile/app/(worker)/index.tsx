import React, { useState, useCallback } from 'react';
import { View, StyleSheet, SectionList, RefreshControl, TouchableOpacity, Alert, Platform } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen, Text, Button } from '../../src/components/ui';
import { spacing, useTheme } from '../../src/theme';
import { fetchRoster, RosterResponse } from '../../src/features/roster/api';
import { apiClient } from '../../src/api/client';
import { ShiftWithAssignment, Task } from '../../src/api/types';
import { format, parseISO, addDays, startOfDay, isSameDay } from 'date-fns';
import { useCountdown } from '../../src/hooks/useCountdown';

export default function WorkerDashboard() {
  const theme = useTheme();
  const [data, setData] = useState<RosterResponse | null>(null);
  const [fatigue, setFatigue] = useState<any>(null);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [rosterRes, fatigueRes, tasksRes] = await Promise.all([
        fetchRoster(),
        apiClient.fatigue.me(),
        apiClient.tasks.mine()
      ]);
      rosterRes.shifts.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      setData(rosterRes);
      setFatigue(fatigueRes);
      setPendingTasks(tasksRes.filter((t: Task) => t.status === 'PENDING'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleConfirm = async (assignmentId: string) => {
    try {
      await apiClient.shifts.confirm(assignmentId);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <Screen style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: theme.seam }}><Text variant="display" style={{ color: theme.dust }}>SYNCING...</Text></Screen>;
  }

  const activeTask = pendingTasks[0];
  if (activeTask) {
    return (
      <Screen style={{ backgroundColor: theme.advisory, padding: spacing.xl, justifyContent: 'center' }}>
        <Text variant="display" weight="bold" style={{ color: '#000000', textAlign: 'center', marginBottom: spacing.xl }}>
          ⚠️ CRITICAL DIRECTIVE
        </Text>
        <Text variant="hero" style={{ color: '#000000', textAlign: 'center', marginBottom: spacing.xxl, fontSize: 60, lineHeight: 64 }}>
          {activeTask.title}
        </Text>
        <Button 
          title="ACKNOWLEDGE" 
          variant="primary" 
          style={{ height: 80, backgroundColor: '#000000', borderWidth: 0 }} 
          textStyle={{ color: theme.advisory, fontSize: 24 }}
          onPress={async () => {
            try {
               await apiClient.tasks.acknowledge(activeTask.id);
               await loadData();
            } catch(e) { }
          }} 
        />
      </Screen>
    );
  }

  const shifts = data?.shifts || [];
  const now = new Date();
  const activeOrNextShift = shifts.find(s => new Date(s.endTime) > now) || null;
  const remainingShifts = shifts.filter(s => s !== activeOrNextShift);

  // BUILD 14 DAY LOOKAHEAD
  const sections: { title: string, data: (ShiftWithAssignment | 'REST')[] }[] = [{ title: 'NEXT 14 DAYS', data: [] }];
  for (let i = 0; i < 14; i++) {
    const targetDate = addDays(startOfDay(now), i);
    const dayShifts = remainingShifts.filter(s => isSameDay(parseISO(s.startTime), targetDate));
    if (dayShifts.length > 0) {
      sections[0]!.data.push(...dayShifts);
    } else {
      sections[0]!.data.push('REST');
    }
  }

  return (
    <Screen style={{ backgroundColor: theme.seam }}>
      <SectionList
        contentContainerStyle={styles.list}
        sections={sections}
        keyExtractor={(item, index) => typeof item === 'string' ? `rest-${index}` : item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.lamp} />}
        ListHeaderComponent={
          <>
            {/* OFFLINE BAND */}
            {data?.isFromCache && (
              <View style={[styles.offlineBanner, { backgroundColor: theme.warning }]}>
                <Text variant="caption" style={{ color: '#000000' }}>
                  OFFLINE · LAST UPDATED {data.cachedAt ? format(parseISO(data.cachedAt), 'HH:mm') : 'UNKNOWN'}
                </Text>
              </View>
            )}

            {/* ZONE 2: HERO ACTION */}
            {activeOrNextShift && <HeroZone shift={activeOrNextShift} fatigue={fatigue} theme={theme} />}
          </>
        }
        renderSectionHeader={({ section: { title } }) => (
          <View style={[styles.sectionHeader, { borderBottomColor: theme.rule }]}>
            <Text variant="label" style={{ color: theme.shadow }}>{title}</Text>
          </View>
        )}
        renderItem={({ item, index }) => {
          const targetDate = addDays(startOfDay(now), index); // Simple mapping
          const dayStr = format(targetDate, 'EEE dd').toUpperCase();

          if (item === 'REST') {
            return (
              <View style={[styles.row, { borderBottomColor: theme.rule }]}>
                <Text variant="data" style={{ color: theme.shadow, width: 60 }}>{dayStr}</Text>
                <View style={[styles.typeMarker, { backgroundColor: theme.seam }]} />
                <Text variant="bodyLg" style={{ color: theme.shadow }}>REST</Text>
              </View>
            );
          }

          const isUnconfirmed = item.assignmentStatus === 'ASSIGNED';
          const isConfirmed = item.assignmentStatus === 'CONFIRMED';
          const isSwapPending = item.assignmentStatus === 'SWAP_PENDING';
          const typeColor = item.shiftType.includes('NIGHT') ? '#2B4A6F' : theme.lamp;

          return (
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => router.push(`/shift/${item.id}`)}
              style={[styles.row, { borderBottomColor: theme.rule }]}
            >
              <Text variant="data" style={{ color: theme.dust, width: 60 }}>
                {format(parseISO(item.startTime), 'EEE dd').toUpperCase()}
              </Text>
              <View style={[styles.typeMarker, { backgroundColor: typeColor }]} />
              
              <View style={{ flex: 1, paddingLeft: spacing.sm }}>
                <Text variant="label" style={{ color: theme.headlamp }}>{item.shiftType}</Text>
                <Text variant="data" style={{ color: theme.dust }}>
                  {format(parseISO(item.startTime), 'HH:mm')}—{format(parseISO(item.endTime), 'HH:mm')}
                </Text>
              </View>

              {isUnconfirmed && (
                <Button 
                  title="CONFIRM" 
                  variant="primary" 
                  style={{ height: 56, paddingHorizontal: spacing.md }} 
                  onPress={() => handleConfirm(item.assignmentId)} 
                />
              )}
              {isConfirmed && (
                <Button 
                  title="SWAP/CANCEL" 
                  variant="secondary" 
                  style={{ height: 56, paddingHorizontal: spacing.md }} 
                  onPress={() => router.push({ pathname: '/(worker)/swap-modal', params: { assignmentId: item.assignmentId } })} 
                />
              )}
              {isSwapPending && (
                <Text variant="label" style={{ color: theme.warning }}>⚠ SWAP PENDING</Text>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </Screen>
  );
}

// ==========================================
// HERO ZONE COMPONENT
// ==========================================
function HeroZone({ shift, fatigue, theme }: { shift: ShiftWithAssignment, fatigue: any, theme: any }) {
  const start = parseISO(shift.startTime);
  const end = parseISO(shift.endTime);
  const { formatted, state } = useCountdown(start, end);

  const startStr = format(start, 'HH:mm');
  const endStr = format(end, 'HH:mm');
  
  const isCritical = fatigue?.riskLevel === 'CRITICAL';
  const isWarning = fatigue?.riskLevel === 'WARNING';
  const hasOverride = !!fatigue?.hasOverride;
  const [requesting, setRequesting] = useState(false);

  const handleCheckIn = (method: 'QR' | 'GPS') => {
    if (method === 'GPS') {
      router.push({ pathname: '/checkin', params: { shiftId: shift.id, type: state === 'live' ? 'checkout' : 'checkin' } });
    } else {
      router.push({
        pathname: '/scanner',
        params: { shiftId: shift.id, type: state === 'live' ? 'checkout' : 'checkin' },
      });
    }
  };

  const handleRequestOverride = async () => {
    setRequesting(true);
    try {
      const res = await apiClient.fatigue.requestOverride();
      Alert.alert(
        'Request sent',
        `Notified ${res.notified ?? 0} supervisor(s). You can check in once they override.`
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to request override.');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <View style={styles.heroZone}>
      <Text variant="status" style={{ color: theme.headlamp, marginBottom: 4 }}>{shift.shiftType}</Text>
      <Text variant="bodyLg" style={{ color: theme.dust, marginBottom: spacing.xl }}>Your next assignment</Text>

      <Text variant="hero" style={{ color: theme.headlamp, marginBottom: spacing.lg }}>
        {startStr} — {endStr}
      </Text>

      <View style={[styles.timerBox, { borderColor: theme.rule }]}>
        <Text variant="data" style={{ color: theme.dust, marginRight: spacing.sm }}>
          {state === 'live' ? '⏱ ELAPSED' : '⏱ STARTS IN'}
        </Text>
        <Text variant="dataLg" style={{ color: state === 'advisory' ? theme.warning : theme.headlamp }}>
          {formatted}
        </Text>
      </View>

      {isWarning && !isCritical && (
        <TouchableOpacity
          style={[styles.fatigueBar, { backgroundColor: theme.warning }]}
          onPress={() => router.push('/(worker)/fatigue')}
        >
          <Text variant="label" style={{ color: '#000000' }}>⚠ WARNING — {fatigue.score} SCORE</Text>
          <Text variant="body" style={{ color: '#000000', textDecorationLine: 'underline' }}>See why</Text>
        </TouchableOpacity>
      )}

      {isCritical && !hasOverride ? (
        <View style={[styles.fatigueBar, { backgroundColor: theme.danger, minHeight: 120, justifyContent: 'center', flexDirection: 'column' }]}>
          <Text variant="display" weight="bold" style={{ color: '#000000', textAlign: 'center' }}>⛔ CHECK-IN BLOCKED</Text>
          <Text variant="label" style={{ color: '#000000', textAlign: 'center', marginTop: spacing.xs }}>FATIGUE RISK CRITICAL</Text>
          <Button
            title="REQUEST SUPERVISOR OVERRIDE"
            variant="secondary"
            style={{ marginTop: spacing.md }}
            loading={requesting}
            onPress={handleRequestOverride}
          />
          <Button
            title="SEE FATIGUE DETAILS"
            variant="ghost"
            style={{ marginTop: spacing.sm }}
            onPress={() => router.push('/(worker)/fatigue')}
          />
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {hasOverride && isCritical && (
            <Text variant="label" style={{ color: theme.warning, textAlign: 'center', marginBottom: spacing.xs }}>
              OVERRIDE ACTIVE — CHECK-IN ALLOWED
            </Text>
          )}
          <Button
            title={state === 'live' ? 'END SHIFT (QR)' : 'START SHIFT (QR)'}
            variant={state === 'live' ? 'secondary' : 'primary'}
            style={styles.heroAction}
            disabled={state === 'future'}
            onPress={() => handleCheckIn('QR')}
          />
          {Platform.OS !== 'web' && (
            <Button
              title={state === 'live' ? 'END SHIFT (GPS)' : 'START SHIFT (GPS)'}
              variant="secondary"
              style={styles.heroAction}
              disabled={state === 'future'}
              onPress={() => handleCheckIn('GPS')}
            />
          )}
        </View>
      )}

      {state === 'future' && !(isCritical && !hasOverride) && (
        <Text variant="data" style={{ color: theme.dust, textAlign: 'center', marginTop: spacing.sm }}>
          OPENS AT {format(new Date(start.getTime() - 30 * 60000), 'HH:mm')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingBottom: spacing.xxl },
  offlineBanner: {
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroZone: {
    padding: spacing.xl,
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: 2,
    marginBottom: spacing.lg,
    backgroundColor: '#14181D'
  },
  fatigueBar: {
    padding: spacing.md,
    borderRadius: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  heroAction: {
    height: 72,
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    marginTop: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  typeMarker: {
    width: 4,
    height: 32,
    marginRight: spacing.md,
  }
});
