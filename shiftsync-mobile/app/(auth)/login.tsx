import React, { useState } from 'react';
import { View, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Button, Text, ErrorState } from '../../src/components/ui';
import { useTheme, spacing, typography } from '../../src/theme';
import { useAuth } from '../../src/features/auth';

export default function LoginScreen() {
  const theme = useTheme();
  const { login, isLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (overrideEmail?: string) => {
    const targetEmail = overrideEmail || email.trim();
    setError(null);
    if (!targetEmail) {
      setError('REQUIRED: ID OR EMAIL.');
      return;
    }

    try {
      await login(targetEmail, password || 'password123');
    } catch (e: any) {
      setError(e.message || 'AUTH FAILED.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: theme.seam }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={[styles.statusBlock, { backgroundColor: theme.lamp }]} />
          <Text variant="display" weight="bold" style={{ color: theme.headlamp, marginTop: spacing.md, textTransform: 'uppercase' }}>ShiftSync</Text>
          <Text variant="label" style={{ color: theme.dust, marginTop: spacing.xs }}>SYS.ACCESS // TALLY BOARD</Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: theme.anthracite, borderColor: theme.rule }]}>
          {error && (
            <View style={{ marginBottom: spacing.md }}>
              <ErrorState title="ACCESS DENIED" message={error} />
            </View>
          )}

          <Text variant="label" style={[styles.label, { color: theme.dust }]}>EMPLOYEE ID</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.gangue, color: theme.headlamp, borderColor: theme.rule }]}
            placeholder="A-047"
            placeholderTextColor={theme.shadow}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            editable={!isLoading}
          />

          <Text variant="label" style={[styles.label, { color: theme.dust }]}>PIN CODE</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.gangue, color: theme.headlamp, borderColor: theme.rule }]}
            placeholder="••••••••"
            placeholderTextColor={theme.shadow}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!isLoading}
          />

          <Button 
            title="AUTHENTICATE" 
            size="lg" 
            onPress={() => handleLogin()} 
            loading={isLoading} 
            style={{ marginTop: spacing.md }}
          />
        </View>

        {/* DEMO SECTION */}
        <View style={styles.demoSection}>
          <Text variant="label" style={{ color: theme.shadow, marginBottom: spacing.md, textAlign: 'center' }}>
            [ OVERRIDE CODES ]
          </Text>
          <View style={styles.demoButtons}>
            <TouchableOpacity 
              style={[styles.demoBtn, { backgroundColor: theme.gangue, borderColor: theme.rule }]}
              onPress={() => handleLogin('ama.boateng@shiftsync.io')}
              disabled={isLoading}
            >
              <Text variant="label" style={{ color: theme.headlamp }}>WORKER</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.demoBtn, { backgroundColor: theme.gangue, borderColor: theme.rule }]}
              onPress={() => handleLogin('kwame@shiftsync.io')}
              disabled={isLoading}
            >
              <Text variant="label" style={{ color: theme.headlamp }}>SUPERVISOR</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.demoBtn, { backgroundColor: theme.gangue, borderColor: theme.rule }]}
              onPress={() => handleLogin('admin@shiftsync.io')}
              disabled={isLoading}
            >
              <Text variant="label" style={{ color: theme.headlamp }}>ADMIN</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  statusBlock: {
    width: 48,
    height: 16, // Industrial block, not a logo
  },
  formCard: {
    padding: spacing.xl,
    borderWidth: 1,
  },
  label: {
    marginBottom: spacing.xs,
  },
  input: {
    height: 56, // TAP_MIN compliance
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontFamily: typography.fonts.data, // Monospace for technical entry
    fontSize: 18,
    marginBottom: spacing.lg,
  },
  demoSection: {
    marginTop: 40,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: '#2C343D',
  },
  demoButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center'
  },
  demoBtn: {
    flex: 1,
    padding: spacing.md,
    borderWidth: 1,
    alignItems: 'center',
  }
});
