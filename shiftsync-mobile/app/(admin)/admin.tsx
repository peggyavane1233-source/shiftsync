import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity } from 'react-native';
import { Screen, Text, Card, Button, Spinner } from '../../src/components/ui';
import { spacing, useTheme } from '../../src/theme';
import { apiClient } from '../../src/api/client';

export default function AdminSettingsScreen() {
  const theme = useTheme();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New user form state
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('WORKER');
  const [employeeNo, setEmployeeNo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      const data = await apiClient.users.list();
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    if (!displayName || !email || !employeeNo) {
      Alert.alert('Validation Error', 'Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.users.create({
        displayName,
        email,
        role,
        employeeNo,
        departmentId: 'dept-0000-0000-0000-000000000001', // Default mock department
      });
      // Reset form
      setDisplayName('');
      setEmail('');
      setEmployeeNo('');
      setRole('WORKER');
      // Refresh list
      fetchUsers();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <Screen style={styles.center}><Spinner /></Screen>;

  const roles = ['WORKER', 'SUPERVISOR', 'SAFETY', 'ADMIN'];

  return (
    <Screen style={{ backgroundColor: theme.surface }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text variant="xl" weight="bold" style={{ color: theme.headlamp }}>User Management</Text>
          <Text color="textMuted">Manage Accounts & Add New Users</Text>
        </View>

        <Card style={styles.formCard}>
          <Text variant="lg" weight="bold" style={{ marginBottom: spacing.lg, color: theme.headlamp }}>Create New User</Text>
          
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.seam }]}
            placeholder="Full Name (e.g. Ama Boateng)"
            placeholderTextColor={theme.dust}
            value={displayName}
            onChangeText={setDisplayName}
          />

          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.seam }]}
            placeholder="Email (e.g. ama@shiftsync.io)"
            placeholderTextColor={theme.dust}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.seam }]}
            placeholder="Employee No (e.g. WRK-2001)"
            placeholderTextColor={theme.dust}
            value={employeeNo}
            onChangeText={setEmployeeNo}
            autoCapitalize="characters"
          />

          <View style={styles.roleContainer}>
            <Text variant="sm" color="dust" style={{ marginBottom: spacing.sm }}>Role:</Text>
            <View style={styles.roleGrid}>
              {roles.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.roleBtn,
                    { borderColor: role === r ? theme.primary : theme.border },
                    role === r && { backgroundColor: theme.primary + '20' }
                  ]}
                  onPress={() => setRole(r)}
                >
                  <Text variant="label" style={{ color: role === r ? theme.primary : theme.dust }}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Button 
            title={isSubmitting ? "CREATING..." : "ADD USER"} 
            onPress={handleCreateUser} 
            disabled={isSubmitting}
            style={{ marginTop: spacing.lg }}
          />
        </Card>

        <Text variant="lg" weight="bold" style={{ marginVertical: spacing.lg, color: theme.headlamp }}>
          Existing Accounts ({users.length})
        </Text>

        {users.map((u) => (
          <View key={u.id} style={[styles.userRow, { borderBottomColor: theme.rule }]}>
            <View style={{ flex: 1 }}>
              <Text variant="title" weight="bold" style={{ color: theme.headlamp }}>{u.displayName}</Text>
              <Text variant="body" style={{ color: theme.dust }}>{u.email} • {u.employeeNo}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: theme.seam }]}>
              <Text variant="label" style={{ color: theme.text }}>{u.role}</Text>
            </View>
          </View>
        ))}

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: spacing.xl, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.xl },
  formCard: {
    padding: spacing.xl,
    backgroundColor: '#1A1D24', // slightly different for focus
    marginBottom: spacing.xl,
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: 16,
  },
  roleContainer: {
    marginBottom: spacing.md,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  roleBtn: {
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 4,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  }
});
