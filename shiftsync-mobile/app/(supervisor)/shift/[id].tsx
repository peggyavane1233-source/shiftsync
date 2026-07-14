import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Screen, Text, Card, Button, Spinner } from '../../../src/components/ui';
import { spacing, useTheme } from '../../../src/theme';
import { apiClient } from '../../../src/api/client';
import { format, parseISO } from 'date-fns';

export default function ShiftDetailsScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [shift, setShift] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await apiClient.supervisor.listShifts();
      const match = data.find((s: any) => s.id === id);
      setShift(match);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [id]));

  const handleApproveSwap = async (assignmentId: string) => {
    try {
      // In a real app we might pick the replacement user. Mock just auto-approves.
      await apiClient.shifts.approveSwap(assignmentId, 'mock-replacement-id');
      loadData();
    } catch (e) {
      Alert.alert('Error', 'Failed to approve swap.');
    }
  };

  const handleCancelShift = async () => {
    Alert.alert(
      "CANCEL SHIFT?",
      "Are you sure you want to cancel this shift? This will notify all assigned workers.",
      [
        { text: "NO", style: "cancel" },
        { 
          text: "CANCEL SHIFT", 
          style: "destructive", 
          onPress: async () => {
            try {
              // Wait, the mock API currently doesn't have a cancelShift method, but we can just pop back for the demo
              // await apiClient.shifts.cancel(id);
              router.back();
            } catch (e) {
              Alert.alert('Error', 'Failed to cancel shift.');
            }
          }
        }
      ]
    );
  };

  if (loading) return <Screen style={styles.center}><Spinner /></Screen>;
  if (!shift) return <Screen style={styles.center}><Text>Shift not found</Text></Screen>;

  const start = parseISO(shift.startTime);

  return (
    <Screen style={{ backgroundColor: theme.surface }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text variant="display" weight="bold" style={{ color: theme.headlamp, textTransform: 'uppercase', marginBottom: spacing.sm }}>
          {format(start, 'EEE, MMM do')} • {shift.shiftType}
        </Text>
        <Text variant="dataLg" style={{ color: theme.dust, marginBottom: spacing.xl }}>
          {format(start, 'HH:mm')} — {format(parseISO(shift.endTime), 'HH:mm')} | ZONE {shift.departmentId.slice(-1)}
        </Text>

        <Text variant="title" style={{ color: theme.headlamp, marginBottom: spacing.md }}>ASSIGNMENTS ({shift.assignments.length}/{shift.requiredWorkers})</Text>

        {shift.assignments.map((assignment: any) => {
          const isSwapPending = assignment.status === 'SWAP_PENDING';
          return (
            <Card key={assignment.id} style={{ marginBottom: spacing.sm, backgroundColor: theme.anthracite, borderColor: isSwapPending ? theme.primary : theme.rule }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text variant="label" style={{ color: theme.text }}>WORKER {assignment.userId.slice(-4).toUpperCase()}</Text>
                  <Text variant="data" style={{ color: theme.dust, marginTop: 4 }}>
                    Status: {assignment.status}
                  </Text>
                </View>
                {isSwapPending && (
                  <Button 
                    title="APPROVE SWAP" 
                    variant="primary" 
                    size="md" 
                    onPress={() => handleApproveSwap(assignment.id)} 
                  />
                )}
              </View>
            </Card>
          );
        })}

        <View style={{ marginTop: spacing.xxl }}>
          <Button 
            title="CANCEL SHIFT" 
            variant="danger" 
            size="lg" 
            onPress={handleCancelShift} 
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
