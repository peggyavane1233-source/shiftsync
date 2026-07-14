import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen, Text, Card, Button } from '../../src/components/ui';
import { spacing } from '../../src/theme';
import { router } from 'expo-router';

export default function ForgotPasswordScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <Card>
          <Text variant="lg" weight="semibold" style={{ marginBottom: spacing.sm }}>Password Reset</Text>
          <Text variant="sm" color="textMuted" style={{ marginBottom: spacing.lg }}>
            Password resets require supervisor approval in the ShiftSync system. 
            Please speak to your direct supervisor to issue a temporary PIN.
          </Text>
          <Button title="Back to Login" onPress={() => router.back()} />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center'
  }
});
