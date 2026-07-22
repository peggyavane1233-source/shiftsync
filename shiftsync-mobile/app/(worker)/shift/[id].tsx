import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen, Text, Card, Button, StatusPill } from '../../../src/components/ui';
import { spacing, useTheme } from '../../../src/theme';
import { fetchRoster } from '../../../src/features/roster/api';
import { ShiftWithAssignment } from '../../../src/api/types';
import { apiClient } from '../../../src/api/client';
import { format, parseISO } from 'date-fns';

export default function ShiftDetailScreen() {
  const { id } = useLocalSearchParams();
  const theme = useTheme();
  
  const [shift, setShift] = useState<ShiftWithAssignment | null>(null);
  const [fatigue, setFatigue] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await fetchRoster();
      const target = res.shifts.find(s => s.id === id);
      setShift(target || null);

      if (target) {
        const fat = await apiClient.fatigue.me();
        setFatigue(fat);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleConfirm = async () => {
    if (!shift) return;
    try {
      await apiClient.shifts.confirm(shift.assignmentId);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <Screen style={styles.center}><Text>Loading Shift...</Text></Screen>;
  if (!shift) return <Screen style={styles.center}><Text>Shift not found.</Text><Button title="Back" onPress={() => router.back()} /></Screen>;

  const startStr = format(parseISO(shift.startTime), 'EEEE, MMM do • HH:mm');
  const endStr = format(parseISO(shift.endTime), 'HH:mm');

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text variant="xl" weight="bold">Shift Details</Text>
          <StatusPill variant="neutral" label={shift.assignmentStatus} />
        </View>

        {fatigue?.riskLevel === 'CRITICAL' && (
          <View style={[styles.banner, { backgroundColor: theme.critical }]}>
             <Text weight="bold" color="bg">FATIGUE CRITICAL: {fatigue.score}</Text>
             <Text variant="sm" color="bg">You will need supervisor approval to start this shift.</Text>
          </View>
        )}
        {fatigue?.riskLevel === 'ADVISORY' && (
          <View style={[styles.banner, { backgroundColor: theme.advisory }]}>
             <Text weight="bold" color="bg">FATIGUE ADVISORY: {fatigue.score}</Text>
             <Text variant="sm" color="bg">Please monitor your alertness.</Text>
          </View>
        )}

        <Card style={styles.card}>
          <Text variant="sm" color="textMuted">Date & Time</Text>
          <Text variant="md" weight="semibold" style={styles.val}>{startStr} to {endStr}</Text>

          <Text variant="sm" color="textMuted">Type</Text>
          <Text variant="md" weight="semibold" style={styles.val}>{shift.shiftType}</Text>

          <Text variant="sm" color="textMuted">Zone</Text>
          <Text variant="md" weight="semibold" style={styles.val}>Zone A</Text>
        </Card>

        {shift.assignmentStatus === 'ASSIGNED' && (
          <Button 
            title="Confirm Assignment" 
            size="lg" 
            onPress={handleConfirm} 
            style={styles.actionBtn} 
          />
        )}
        
        {shift.assignmentStatus === 'PRESENT' && (
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
            <Button 
              title="Check Out (QR)" 
              variant="primary" 
              style={{ flex: 1 }}
              onPress={() => router.push({ pathname: '/scanner', params: { shiftId: shift.id, type: 'checkout' }})} 
            />
            <Button 
              title="Check Out (GPS)" 
              variant="secondary" 
              style={{ flex: 1 }}
              onPress={() => router.push({ pathname: '/checkin', params: { shiftId: shift.id, type: 'checkout' }})} 
            />
          </View>
        )}

        {shift.assignmentStatus !== 'SWAP_PENDING' && shift.assignmentStatus !== 'SWAPPED' && shift.assignmentStatus !== 'COMPLETED' && (
          <Button 
            title="REQUEST SWAP / ABSENCE" 
            variant="secondary" 
            onPress={() => router.push(`/(worker)/shift/swap/${shift.assignmentId}`)} 
            style={styles.actionBtn} 
          />
        )}

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: spacing.md, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  banner: { padding: spacing.md, borderRadius: 8, marginBottom: spacing.md },
  card: { padding: spacing.lg, marginBottom: spacing.lg },
  val: { marginBottom: spacing.md, marginTop: 4 },
  actionBtn: { marginBottom: spacing.md }
});
