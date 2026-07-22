/**
 * app/(supervisor)/fatigue-alerts.tsx
 * PURPOSE: A queue of workers who are blocked from checking in due to high fatigue scores.
 * PLACE: Accessed from the Supervisor Dashboard.
 * 
 * WHY: Fatigue blocks are absolute. A supervisor MUST explicitly override them.
 * Friction is introduced here as a feature: the supervisor must type a >= 20 char reason,
 * knowing it is permanently logged and audited. This prevents rubber-stamping.
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import Svg, { Line, Polyline, Circle as SvgCircle } from 'react-native-svg';
import { Screen, Text, Card, Button, Spinner } from '../../src/components/ui';
import { spacing, useTheme } from '../../src/theme';
import { apiClient } from '../../src/api/client';

export default function FatigueAlertsScreen() {
  const theme = useTheme();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Override state
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const data = await apiClient.supervisor.listFatigueAlerts();
      setAlerts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOverride = async () => {
    if (!selectedAlert) return;
    if (reason.length < 20) {
      Alert.alert("Validation", "Reason must be at least 20 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.supervisor.overrideFatigue(selectedAlert.userId, reason);
      Alert.alert("Override Successful", "The worker may now check in.");
      setSelectedAlert(null);
      setReason('');
      await loadData();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to submit override.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Screen style={styles.center}><Spinner /></Screen>;
  }

  // ---------------------------------------------------------------------------
  // OVERRIDE MODAL / INLINE FORM
  // ---------------------------------------------------------------------------

  if (selectedAlert) {
    return (
      <KeyboardAvoidingView 
        style={{ flex: 1, backgroundColor: theme.bg }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Screen style={{ padding: spacing.xl }}>
          <Text variant="xl" weight="bold" style={{ marginBottom: spacing.md }}>
            Override Fatigue Block
          </Text>
          <Text variant="md" style={{ marginBottom: spacing.lg }}>
            {selectedAlert.workerName || `Worker ${selectedAlert.userId.slice(-4)}`} has a fatigue score of {selectedAlert.score} ({selectedAlert.riskLevel}).
          </Text>

          {/* SAFETY: Explicit warning to the supervisor about auditability */}
          <Text variant="sm" weight="bold" color="critical" style={{ marginBottom: spacing.sm }}>
            WARNING: This override will be permanently logged and is auditable by the Safety department.
          </Text>

          <View style={{ marginBottom: spacing.lg }}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="Why is it safe for this worker to proceed? (min 20 chars)"
              placeholderTextColor={theme.textMuted}
              multiline
              value={reason}
              onChangeText={setReason}
            />
            <Text 
              variant="xs" 
              weight="bold" 
              style={{ alignSelf: 'flex-end', marginTop: spacing.xs, color: reason.length >= 20 ? theme.safe : theme.warning }}
            >
              {reason.length} / 20 characters
            </Text>
          </View>

          <Button 
            title="SUBMIT OVERRIDE" 
            size="lg" 
            style={{ backgroundColor: theme.critical }}
            onPress={handleOverride}
            disabled={reason.length < 20 || submitting}
            loading={submitting}
          />
          <Button 
            title="Cancel" 
            variant="ghost" 
            style={{ marginTop: spacing.md }}
            onPress={() => { setSelectedAlert(null); setReason(''); }}
            disabled={submitting}
          />
        </Screen>
      </KeyboardAvoidingView>
    );
  }

  // ---------------------------------------------------------------------------
  // ALERT QUEUE
  // ---------------------------------------------------------------------------

  if (alerts.length === 0) {
    return (
      <Screen style={styles.center}>
        <Text variant="lg" weight="bold" style={{ color: theme.safe }}>✅ No open fatigue alerts.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={alerts}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: spacing.md }}
        renderItem={({ item }) => {
          const sparklineData = item.history && item.history.length > 0 
            ? item.history.map((h: any) => h.score)
            : [item.score];
          const count = Math.max(1, sparklineData.length - 1);
          const sparkPts = sparklineData.map((d: number, i: number) => `${(i / count) * 300},${100 - d}`).join(' ');

          return (
            <Card style={[styles.card, item.riskLevel === 'CRITICAL' && { borderColor: theme.critical, borderWidth: 2 }]}>
              <View style={{ flex: 1, marginBottom: spacing.md }}>
                <Text variant="lg" weight="bold">{item.workerName || `Worker ${item.userId.slice(-4)}`}</Text>
                <Text variant="md" color="textMuted">
                  Score: <Text weight="bold" style={{ color: item.riskLevel === 'CRITICAL' ? theme.critical : theme.warning }}>{item.score}</Text> ({item.riskLevel})
                </Text>
              </View>
              
              <View style={{ height: 60, width: '100%', marginBottom: spacing.md }}>
                <Svg width="100%" height="100%" viewBox="0 0 300 100" preserveAspectRatio="none">
                  {/* Hairlines at 40, 60, 80 */}
                  <Line x1="0" y1={100 - 40} x2="300" y2={100 - 40} stroke={theme.border} strokeWidth="1" strokeDasharray="4,4" />
                  <Line x1="0" y1={100 - 60} x2="300" y2={100 - 60} stroke={theme.border} strokeWidth="1" strokeDasharray="4,4" />
                  <Line x1="0" y1={100 - 80} x2="300" y2={100 - 80} stroke={theme.border} strokeWidth="1" strokeDasharray="4,4" />
                  
                  {/* The Sparkline */}
                  <Polyline points={sparkPts} fill="none" stroke={theme.text} strokeWidth="2" />
                  
                  {/* Mark warnings */}
                  {sparklineData.map((d: number, i: number) => {
                    if (d >= 60) {
                      const cx = (i / count) * 300;
                      const cy = 100 - d;
                      return <SvgCircle key={i} cx={cx} cy={cy} r="4" fill={d >= 80 ? theme.critical : theme.warning} />;
                    }
                    return null;
                  })}
                </Svg>
              </View>

              <Button 
                title="OVERRIDE" 
                size="md" 
                variant="secondary"
                style={{ borderColor: item.riskLevel === 'CRITICAL' ? theme.critical : theme.warning }}
                onPress={() => setSelectedAlert(item)}
              />
            </Card>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    flexDirection: 'column',
    padding: spacing.lg,
    marginBottom: spacing.md
  },
  input: {
    height: 120,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlignVertical: 'top'
  }
});
