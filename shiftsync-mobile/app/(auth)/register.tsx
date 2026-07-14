import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen, Text, Card } from '../../src/components/ui';
import { spacing } from '../../src/theme';

export default function RegisterScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <Card>
          <Text variant="lg" weight="semibold" style={{ marginBottom: spacing.sm }}>New Account</Text>
          <Text variant="sm" color="textMuted">
            Registration is handled by your Safety Officer or Site Admin. 
            Please contact them to receive your Employee Number and temporary password.
          </Text>
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
