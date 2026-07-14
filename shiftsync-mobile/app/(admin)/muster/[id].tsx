import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, LayoutAnimation, UIManager, Platform } from 'react-native';
import { Screen, Text, Card, Spinner, TallyTag } from '../../../src/components/ui';
import { spacing, useTheme } from '../../../src/theme';
import { apiClient } from '../../../src/api/client';
import { useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function AdminMusterView() {
  useKeepAwake();
  const theme = useTheme();
  const { id } = useLocalSearchParams();
  
  const [status, setStatus] = useState<any>(null);
  const [elapsed, setElapsed] = useState(0);
  const [connectionError, setConnectionError] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await apiClient.muster.status(id as string);
      
      // Animate out checked-in workers
      if (status && status.unaccounted.length !== data.unaccounted.length) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      
      setStatus(data);
      setConnectionError(false);
    } catch (e) {
      setConnectionError(true);
    }
  };

  useEffect(() => {
    if (!id) return;
    const interval = setInterval(fetchStatus, 2000);
    const timer = setInterval(() => setElapsed(prev => prev + 1), 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, [id, status]);

  if (!status) {
    if (connectionError) {
      return (
        <Screen style={{ backgroundColor: theme.surface, justifyContent: 'center', alignItems: 'center' }}>
          <Text variant="title" style={{ color: theme.danger }}>Muster Not Found</Text>
          <Text variant="body" style={{ color: theme.dust, marginTop: spacing.md }}>No active roll call could be loaded.</Text>
        </Screen>
      );
    }
    return <Screen style={{ backgroundColor: theme.surface, justifyContent: 'center', alignItems: 'center' }}><Spinner /></Screen>;
  }
  const { muster, unaccounted } = status;
  const isDangerTime = elapsed > 180;
  
  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const accountedCount = muster.accountedWorkers;
  const expectedCount = muster.expectedWorkers;
  const progressPercent = expectedCount > 0 ? (accountedCount / expectedCount) * 100 : 0;
  const isAllClear = unaccounted.length === 0;

  return (
    <Screen style={{ backgroundColor: theme.surface }}>
      
      {/* 1. PROJECTOR HEADER */}
      <View style={styles.header}>
        <Text variant="title" weight="bold" style={{ color: theme.danger, fontSize: 40 }}>ROLL CALL ACTIVE</Text>
        <Text variant="title" style={{ color: theme.headlamp, fontSize: 40 }}>ZONE 2</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text variant="title" style={{ color: theme.dust, marginRight: spacing.md, fontSize: 40 }}>⏱</Text>
          <Text variant="display" weight="bold" style={{ color: isDangerTime ? theme.danger : theme.headlamp, fontSize: 60 }}>
            {formatTimer(elapsed)}
          </Text>
        </View>
      </View>

      {connectionError && (
        <View style={[styles.errorBar, { backgroundColor: theme.anthracite }]}>
          <Text variant="label" style={{ color: theme.dust, fontSize: 24 }}>Reconnecting — showing last known state, 4s ago.</Text>
        </View>
      )}

      {/* 2. MASSIVE COUNTER */}
      <View style={styles.heroWrap}>
        <Text variant="hero" style={{ fontSize: 160, color: theme.headlamp }}>
          {accountedCount} / {expectedCount}
        </Text>
        <Text variant="display" style={{ color: theme.dust, letterSpacing: 8, fontSize: 48, marginTop: spacing.xl }}>
          ACCOUNTED
        </Text>
      </View>

      {/* 3. SOLID PROGRESS BAR */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: isAllClear ? theme.safe : theme.headlamp }]} />
      </View>

      {/* 4. THE UNACCOUNTED LIST (READ ONLY) */}
      {isAllClear ? (
        <View style={styles.allClearWrap}>
          <Text variant="hero" style={{ color: theme.safe, textAlign: 'center', marginBottom: spacing.md, fontSize: 120 }}>
            ALL {expectedCount} WORKERS
          </Text>
          <Text variant="hero" style={{ color: theme.safe, textAlign: 'center', fontSize: 120 }}>
            ACCOUNTED FOR.
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', padding: spacing.xxl, gap: spacing.xxl }}>
          <View style={[styles.listHeader, { width: '100%' }]}>
            <Text variant="title" weight="bold" style={{ color: theme.danger, fontSize: 40 }}>
              UNACCOUNTED — {unaccounted.length}
            </Text>
          </View>
          
          {unaccounted.map((item: any) => (
            <Card key={item.id} style={[styles.card, { borderColor: theme.danger, width: '48%' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ marginRight: spacing.xl }}>
                  <TallyTag 
                    employeeNo={item.employeeNo?.substring(0, 5) || 'U-000'} 
                    name={item.displayName} 
                    state="off-hook" 
                    size="lg"
                  />
                </View>
                
                <View style={{ flex: 1 }}>
                  <Text variant="display" weight="bold" style={{ color: theme.headlamp, fontSize: 40 }}>
                    {item.displayName}
                  </Text>
                  <Text variant="dataLg" style={{ color: theme.danger, marginBottom: spacing.md, fontSize: 32 }}>
                    {item.employeeNo}
                  </Text>
                  
                  <Text variant="body" style={{ color: theme.shadow, fontSize: 24 }}>
                    Last seen: Zone 2 Level 3
                  </Text>
                  <Text variant="body" style={{ color: theme.shadow, fontSize: 24 }}>
                    Checked in: 05:58:12
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}

    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xxl,
    backgroundColor: '#0A0C10',
    borderBottomWidth: 2,
    borderBottomColor: '#1A0B10'
  },
  errorBar: {
    width: '100%',
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroWrap: {
    alignItems: 'center',
    paddingVertical: 100,
  },
  progressBarBg: {
    width: '100%',
    height: 24,
    backgroundColor: '#2E3A59'
  },
  progressBarFill: {
    height: '100%',
  },
  listHeader: {
    backgroundColor: '#1A0B10',
    padding: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: '#2E0000',
    alignItems: 'center',
    marginBottom: spacing.lg
  },
  card: {
    padding: spacing.xxl,
    backgroundColor: '#100508',
    borderWidth: 2,
  },
  allClearWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl
  }
});
