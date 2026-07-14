import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen, Text, Button } from '../../src/components/ui';
import { spacing, useTheme } from '../../src/theme';
import { apiClient } from '../../src/api/client';

export default function SwapModalScreen() {
  const theme = useTheme();
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (reason.trim().length < 10) {
      Alert.alert('Error', 'Please provide a valid reason (min 10 characters).');
      return;
    }
    
    setSubmitting(true);
    try {
      await apiClient.shifts.swap(assignmentId, reason);
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Failed to request swap.');
      setSubmitting(false);
    }
  };

  return (
    <Screen style={{ padding: spacing.xl, backgroundColor: theme.surface }}>
      <Text variant="display" weight="bold" style={{ color: theme.headlamp, marginBottom: spacing.md }}>
        REQUEST SWAP / CANCEL
      </Text>
      <Text variant="body" style={{ color: theme.dust, marginBottom: spacing.xl }}>
        Please provide a reason for cancelling or swapping this shift. This request will be sent to your supervisor for approval.
      </Text>

      <TextInput
        style={[styles.input, { color: theme.text, borderColor: theme.rule, backgroundColor: theme.anthracite }]}
        placeholder="Reason for request..."
        placeholderTextColor={theme.dust}
        multiline
        numberOfLines={4}
        value={reason}
        onChangeText={setReason}
      />

      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
        <Button 
          title="CANCEL" 
          variant="secondary" 
          style={{ flex: 1 }} 
          onPress={() => router.back()} 
        />
        <Button 
          title="SUBMIT" 
          variant="primary" 
          style={{ flex: 1 }} 
          loading={submitting}
          onPress={handleSubmit} 
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    fontFamily: 'Barlow-Regular',
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top'
  }
});
