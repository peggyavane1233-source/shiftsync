import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, LayoutAnimation, UIManager, Platform, Alert } from 'react-native';
import { Screen, Text, Card, Button, Spinner, TallyTag, TaskModal } from '../../src/components/ui';
import { spacing, useTheme } from '../../src/theme';
import { apiClient, USE_MOCK_API } from '../../src/api/client';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useStompWebSocket } from '../../src/hooks/useStompWebSocket';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function MusterScreen() {
  useKeepAwake();
  const theme = useTheme();
  
  const [musterId, setMusterId] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [elapsed, setElapsed] = useState(0);
  const [connectionError, setConnectionError] = useState(false);
  const [selectedTaskWorker, setSelectedTaskWorker] = useState<{ id: string, name: string } | null>(null);

  const fetchStatus = useCallback(async (id: string) => {
    const data = await apiClient.muster.status(id);
    setStatus(data);
    setConnectionError(false);
  }, []);

  const handleMusterUpdate = useCallback((data: any) => {
    setStatus((prev: any) => {
      if (prev && prev.unaccounted?.length !== data.unaccounted?.length) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      return data;
    });
    setConnectionError(false);
  }, []);

  const { isConnected: wsConnected } = useStompWebSocket({
    service: 'emergency',
    topic: musterId ? `/topic/musters/${musterId}` : '',
    onMessage: handleMusterUpdate,
    onReconnect: () => musterId && fetchStatus(musterId),
    enabled: !USE_MOCK_API && !!musterId,
  });

  useEffect(() => {
    if (!USE_MOCK_API && musterId && status) setConnectionError(!wsConnected);
  }, [wsConnected, musterId, status]);

  useEffect(() => {
    const initMuster = async () => {
      try {
        const shifts = await apiClient.supervisor.listShifts();
        const zone = shifts[0]?.departmentId || 'ZONE 2';
        const newMuster = await apiClient.muster.initiate(zone);
        setMusterId(newMuster.id);
        await fetchStatus(newMuster.id);
      } catch (e) {
        console.error(e);
      }
    };
    initMuster();
  }, [fetchStatus]);

  // Mock: poll status. Real: WebSocket.
  useEffect(() => {
    if (!USE_MOCK_API || !musterId) return;
    const interval = setInterval(() => fetchStatus(musterId), 2000);
    return () => clearInterval(interval);
  }, [musterId, fetchStatus]);

  // Elapsed timer (UI only — not polling)
  useEffect(() => {
    const timer = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleMarkPresent = async (workerId: string) => {
    if (!musterId) return;
    try {
      await apiClient.muster.markPresent(musterId, workerId);
      await fetchStatus(musterId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClose = async () => {
    if (musterId) {
      await apiClient.muster.close(musterId);
      router.back();
    }
  };

  const handleForceClose = () => {
    Alert.alert(
      "END ACTIVE ROLL CALL?",
      "There are still unaccounted workers. Ending the roll call now will flag them for investigation.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "END ROLL CALL", style: "destructive", onPress: handleClose }
      ]
    );
  };

  if (!status) return <Screen style={{ backgroundColor: theme.surface, justifyContent: 'center', alignItems: 'center' }}><Spinner /></Screen>;

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
      
      {/* 1. STARK HEADER */}
      <View style={styles.header}>
        <Text variant="title" weight="bold" style={{ color: theme.danger }}>ROLL CALL ACTIVE</Text>
        <Text variant="title" style={{ color: theme.headlamp }}>ZONE 2</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text variant="title" style={{ color: theme.dust, marginRight: spacing.xs }}>⏱</Text>
          <Text variant="display" weight="bold" style={{ color: isDangerTime ? theme.danger : theme.headlamp }}>
            {formatTimer(elapsed)}
          </Text>
        </View>
      </View>

      {/* Connection Resiliency Bar */}
      {connectionError && (
        <View style={[styles.errorBar, { backgroundColor: theme.anthracite }]}>
          <Text variant="label" style={{ color: theme.dust }}>⚡ Live feed reconnecting — showing last known state.</Text>
        </View>
      )}

      {/* 2. MASSIVE COUNTER */}
      <View style={styles.heroWrap}>
        <Text variant="hero" style={{ fontSize: 72, color: theme.headlamp }}>
          {accountedCount} / {expectedCount}
        </Text>
        <Text variant="display" style={{ color: theme.dust, letterSpacing: 4 }}>
          ACCOUNTED
        </Text>
      </View>

      {/* 3. SOLID PROGRESS BAR */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: isAllClear ? theme.safe : theme.headlamp }]} />
      </View>

      {/* 4. THE UNACCOUNTED LIST */}
      {isAllClear ? (
        <View style={styles.allClearWrap}>
          <Text variant="hero" style={{ color: theme.safe, textAlign: 'center', marginBottom: spacing.md }}>
            ALL {expectedCount} WORKERS
          </Text>
          <Text variant="hero" style={{ color: theme.safe, textAlign: 'center' }}>
            ACCOUNTED FOR.
          </Text>
          <Button 
            title="END ROLL CALL" 
            variant="secondary" 
            style={{ marginTop: 60, width: 240 }} 
            onPress={handleClose} 
          />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.listHeader}>
            <Text variant="title" weight="bold" style={{ color: theme.danger }}>
              UNACCOUNTED — {unaccounted.length}
            </Text>
          </View>
          
          <FlatList
            data={unaccounted}
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={{ padding: spacing.md }}
            renderItem={({ item }) => (
              <Card style={[styles.card, { borderColor: theme.danger }]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  {/* RED TALLY TAG */}
                  <View style={{ marginRight: spacing.md }}>
                    <TallyTag 
                      employeeNo={item.employeeNo?.substring(0, 5) || 'U-000'} 
                      name={item.displayName} 
                      state="off-hook" 
                    />
                  </View>
                  
                  <View style={{ flex: 1, paddingTop: spacing.xs }}>
                    <Text variant="display" weight="bold" style={{ color: theme.headlamp, flexWrap: 'wrap' }}>
                      {item.displayName}
                    </Text>
                    <Text variant="dataLg" style={{ color: theme.danger, marginBottom: spacing.sm }}>
                      {item.employeeNo}
                    </Text>
                    
                    <Text variant="body" style={{ color: theme.shadow }}>
                      Last seen: Zone 2 Level 3
                    </Text>
                    <Text variant="body" style={{ color: theme.shadow, marginBottom: spacing.lg }}>
                      Checked in: 05:58:12
                    </Text>
                    
                    <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
                      <Button 
                        title="ASSIGN TASK" 
                        variant="secondary" 
                        style={{ flex: 1, minWidth: 120, borderColor: theme.advisory }} 
                        textStyle={{ color: theme.advisory }}
                        onPress={() => setSelectedTaskWorker({ id: item.id, name: item.displayName })} 
                      />
                      <Button 
                        title="MARK PRESENT" 
                        variant="secondary" 
                        style={{ flex: 1, minWidth: 120, borderColor: theme.danger }} 
                        onPress={() => handleMarkPresent(item.id)} 
                      />
                    </View>
                  </View>
                </View>
              </Card>
            )}
          />
          <View style={{ padding: spacing.xl, borderTopWidth: 1, borderTopColor: '#2E0000' }}>
            <Button 
              title="FORCE END ROLL CALL" 
              variant="secondary" 
              style={{ borderColor: theme.danger }}
              textStyle={{ color: theme.danger }}
              onPress={handleForceClose} 
            />
          </View>
        </View>
      )}

      <TaskModal 
        visible={!!selectedTaskWorker} 
        workerId={selectedTaskWorker?.id || ''} 
        workerName={selectedTaskWorker?.name || ''} 
        onClose={() => setSelectedTaskWorker(null)}
        onSuccess={() => {
          setSelectedTaskWorker(null);
          // Optional toast or feedback could go here
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    paddingTop: 60, // accommodate notch if full screen
    backgroundColor: '#0A0C10',
    borderBottomWidth: 1,
    borderBottomColor: '#1A0B10' // Slight red tint
  },
  errorBar: {
    width: '100%',
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroWrap: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  progressBarBg: {
    width: '100%',
    height: 12,
    backgroundColor: '#2E3A59'
  },
  progressBarFill: {
    height: '100%',
  },
  listHeader: {
    backgroundColor: '#1A0B10', // Danger tint bg
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#2E0000',
    alignItems: 'center'
  },
  card: {
    padding: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: '#100508', // Extreme dark red
    borderWidth: 2,
  },
  allClearWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl
  }
});
