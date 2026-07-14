/**
 * src/components/ui/OutcomeOverlay.tsx
 * PURPOSE: Full-screen takeover for high-stakes outcomes (Scanner/GPS).
 * WHY: Must be readable from 3 meters away in under 1 second.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { CheckCircle2, AlertTriangle, AlertCircle, XCircle } from 'lucide-react-native';
import { useTheme, spacing } from '../../theme';
import { Text } from './Text';
import { Button } from './Button';
import { TallyTag } from './TallyTag';
import { useAuth } from '../../features/auth';
import { router } from 'expo-router';

export type OutcomeState = 'SUCCESS' | 'QUEUED' | 'EXPIRED' | 'BLOCKED' | 'NOT_ROSTERED' | 'NONE';

interface OutcomeOverlayProps {
  outcome: OutcomeState;
  onDismiss: () => void;
}

export function OutcomeOverlay({ outcome, onDismiss }: OutcomeOverlayProps) {
  const theme = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    if (outcome === 'SUCCESS') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    } else if (outcome === 'QUEUED') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    } else if (outcome === 'EXPIRED') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else if (outcome === 'BLOCKED' || outcome === 'NOT_ROSTERED') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [outcome, onDismiss]);

  if (outcome === 'NONE') return null;

  const empNo = user?.id?.substring(0, 5).toUpperCase() || 'A-000';
  const empName = user?.displayName || 'UNKNOWN';

  const config = {
    SUCCESS: {
      color: theme.safe,
      Icon: CheckCircle2,
      word: 'CLEARED',
      renderExtra: () => (
        <View style={styles.tagContainer}>
          <TallyTag employeeNo={empNo} name={empName} state="off-hook" size="lg" />
        </View>
      )
    },
    QUEUED: {
      color: theme.advisory,
      Icon: AlertCircle,
      word: 'QUEUED',
      renderExtra: () => (
        <View style={styles.tagContainer}>
          <TallyTag employeeNo={empNo} name={empName} state="off-hook" size="lg" style={{ opacity: 0.6 }} />
          <Text variant="md" weight="bold" style={{ color: '#000000', textAlign: 'center', marginTop: spacing.xl }}>
            Will sync when you surface.
          </Text>
        </View>
      )
    },
    EXPIRED: {
      color: theme.warning,
      Icon: AlertTriangle,
      word: 'CODE EXPIRED',
      renderExtra: () => (
        <View style={styles.actionContainer}>
          <Text variant="bodyLg" style={{ color: '#000000', textAlign: 'center', marginBottom: spacing.xxl }}>
            Ask your supervisor to refresh the code.
          </Text>
          <Button title="SCAN AGAIN" variant="secondary" size="lg" onPress={onDismiss} />
        </View>
      )
    },
    BLOCKED: {
      color: theme.danger,
      Icon: XCircle,
      word: 'BLOCKED',
      renderExtra: () => (
        <View style={styles.actionContainer}>
          <Text variant="bodyLg" style={{ color: '#000000', textAlign: 'center', marginBottom: spacing.xxl }}>
            Fatigue risk CRITICAL. You cannot start this shift without supervisor approval.
          </Text>
          <Button title="REQUEST APPROVAL" variant="secondary" size="lg" onPress={() => router.back()} />
        </View>
      )
    },
    NOT_ROSTERED: {
      color: theme.danger,
      Icon: XCircle,
      word: 'NOT ON THIS SHIFT',
      renderExtra: () => (
        <View style={styles.actionContainer}>
          <Text variant="bodyLg" style={{ color: '#000000', textAlign: 'center', marginBottom: spacing.xxl }}>
            You are not rostered here today. See your supervisor.
          </Text>
          <Button title="GO BACK" variant="secondary" size="lg" onPress={() => router.back()} />
        </View>
      )
    }
  };

  const current = config[outcome];
  const Icon = current.Icon;

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.container, { backgroundColor: current.color }]}>
      <Icon size={120} color="#000000" strokeWidth={2} />
      <Text variant="hero" style={{ color: '#000000', textAlign: 'center', marginTop: spacing.md, fontSize: 72 }}>
        {current.word}
      </Text>

      <View style={styles.extraContainer}>
        {current.renderExtra()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  extraContainer: {
    marginTop: spacing.xxxl,
    alignItems: 'center',
    width: '100%',
  },
  tagContainer: {
    alignItems: 'center',
  },
  actionContainer: {
    width: '100%',
    paddingHorizontal: spacing.xl,
  }
});
