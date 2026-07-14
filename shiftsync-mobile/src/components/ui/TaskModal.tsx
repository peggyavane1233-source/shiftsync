import React, { useState } from 'react';
import { View, StyleSheet, Modal, Pressable, TextInput, Alert, ScrollView } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { spacing, useTheme } from '../../theme';
import { apiClient } from '../../api/client';

interface TaskModalProps {
  visible: boolean;
  workerId: string;
  workerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const PREDEFINED_TASKS = [
  "REPORT TO ROLL CALL POINT",
  "CONTACT SUPERVISOR IMMEDIATELY",
  "SHELTER IN PLACE",
  "CHECK LEVEL 3 COMMUNICATIONS"
];

export function TaskModal({ visible, workerId, workerName, onClose, onSuccess }: TaskModalProps) {
  const theme = useTheme();
  const [customTask, setCustomTask] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (title: string) => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      await apiClient.tasks.create({
        assignedUserId: workerId,
        title: title.trim()
      });
      onSuccess();
      setCustomTask('');
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to assign task");
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.modalBg}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        
        <View style={[styles.bottomSheet, { backgroundColor: theme.anthracite, borderTopColor: theme.rule }]}>
          <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
            <View style={{ width: 40, height: 4, backgroundColor: theme.rule, borderRadius: 2 }} />
          </View>

          <Text variant="display" weight="bold" style={{ color: theme.advisory }}>ASSIGN CRITICAL TASK</Text>
          <Text variant="dataLg" style={{ color: theme.headlamp, marginBottom: spacing.xl, marginTop: spacing.xs }}>
            TARGET: {workerName}
          </Text>

          <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ gap: spacing.md }}>
            {PREDEFINED_TASKS.map(task => (
              <Button 
                key={task}
                title={task}
                variant="secondary"
                disabled={loading}
                style={{ justifyContent: 'flex-start', paddingHorizontal: spacing.md }}
                onPress={() => handleSubmit(task)}
              />
            ))}
          </ScrollView>

          <View style={[styles.customRow, { borderTopColor: theme.rule }]}>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: '#101426', borderColor: theme.rule }]}
              placeholder="Or type custom task..."
              placeholderTextColor={theme.shadow}
              value={customTask}
              onChangeText={setCustomTask}
            />
            <Button 
              title="SEND" 
              variant="primary" 
              disabled={loading || !customTask.trim()}
              style={{ width: 100 }}
              onPress={() => handleSubmit(customTask)}
            />
          </View>
          
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end'
  },
  bottomSheet: {
    padding: spacing.xl,
    paddingBottom: 40,
    borderTopWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  customRow: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.md
  },
  input: {
    flex: 1,
    height: 56,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    fontFamily: 'Inter-Regular',
    fontSize: 16
  }
});
