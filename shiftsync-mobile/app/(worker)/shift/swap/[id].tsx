import React, { useState } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen, Text, Card, Button } from '../../../../src/components/ui';
import { spacing, useTheme, typography } from '../../../../src/theme';
import { apiClient } from '../../../../src/api/client';

export default function SwapScreen() {
  const { id } = useLocalSearchParams(); // This is the assignmentId
  const theme = useTheme();
  
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (reason.length < 10) return;
    setSubmitting(true);
    try {
      await apiClient.shifts.swap(id as string, reason);
      router.back();
    } catch (e) {
      console.error(e);
      setSubmitting(false);
    }
  };

  return (
    <Screen style={{ backgroundColor: theme.seam }}>
      <View style={styles.container}>
        <Text variant="xl" weight="bold" style={styles.mb}>Request Swap / Absence</Text>
        
        <Card style={[styles.card, { backgroundColor: theme.anthracite, borderColor: theme.rule }]}>
          <Text variant="label" style={{ marginBottom: spacing.sm, color: theme.dust }}>REASON FOR ABSENCE/SWAP</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.gangue, color: theme.headlamp, borderColor: theme.rule }]}
            placeholder="E.g. Feeling unwell, personal emergency..."
            placeholderTextColor={theme.shadow}
            multiline
            numberOfLines={4}
            value={reason}
            onChangeText={setReason}
          />
          <Text variant="sm" color="textMuted" style={{ marginBottom: spacing.lg }}>
            Your request will be sent to the supervisor pool for approval and reassignment.
          </Text>

          <Button 
            title="SUBMIT REQUEST" 
            onPress={handleSubmit} 
            loading={submitting} 
            disabled={reason.length < 10}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, flex: 1 },
  mb: { marginBottom: spacing.lg },
  card: { padding: spacing.lg },
  input: {
    height: 100,
    borderWidth: 1,
    borderRadius: 2,
    padding: spacing.md,
    fontSize: 16,
    textAlignVertical: 'top',
    fontFamily: typography.fonts.body,
  }
});
