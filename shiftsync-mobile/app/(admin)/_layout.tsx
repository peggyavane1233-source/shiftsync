/**
 * app/(admin)/_layout.tsx
 * PURPOSE: Desktop shell layout for the Admin portal.
 * PLACE: Loaded automatically by expo-router when a user accesses the /admin route.
 * 
 * WHY: We use a persistent left sidebar here because admins are on desktop devices
 * with wide screens (>= 1024px). Mobile users and workers are aggressively redirected.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { useAuth } from '../../src/features/auth';
import { Text, Screen, Spinner } from '../../src/components/ui';
import { spacing, useTheme } from '../../src/theme';

export default function AdminLayout() {
  const theme = useTheme();
  const { user, isRestoring } = useAuth();
  const pathname = usePathname();

  // GUARD: Enforce platform and role boundaries
  useEffect(() => {
    if (isRestoring) return;
    
    // Admins must be on web
    if (Platform.OS !== 'web') {
      router.replace('/(supervisor)');
      return;
    }

    // Workers cannot access admin
    if (user?.role === 'WORKER') {
      router.replace('/(worker)');
      return;
    }
    
    // Only ADMIN or SAFETY should be here
    if (user && !['ADMIN', 'SAFETY_OFFICER'].includes(user.role)) {
       router.replace('/(supervisor)');
    }
  }, [user, isRestoring]);

  if (isRestoring || !user) {
    return <Screen style={styles.center}><Spinner /></Screen>;
  }

  const navItems = [
    { label: 'Dashboard', path: '/(admin)/dashboard', icon: '📊' },
    { label: 'Roster', path: '/(admin)/roster', icon: '📅' },
    { label: 'Fatigue', path: '/(admin)/fatigue', icon: '⚠️' },
    { label: 'Roll Call', path: '/(admin)/muster/view', icon: '🚨' },
    { label: 'Reports', path: '/(admin)/reports', icon: '📄' },
    { label: 'Admin', path: '/(admin)/admin', icon: '⚙️' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      
      {/* PERSISTENT SIDEBAR */}
      <View style={[styles.sidebar, { backgroundColor: theme.surface, borderRightColor: theme.border }]}>
        <View style={styles.brand}>
          <Text variant="xl" weight="bold" color="primary">ShiftSync Admin</Text>
        </View>

        <View style={styles.nav}>
          {navItems.map(item => {
            const isActive = pathname.startsWith(item.path);
            return (
              <TouchableOpacity
                key={item.path}
                style={[styles.navItem, isActive && { borderLeftColor: theme.lamp }]}
                onPress={() => router.push(item.path as any)}
              >
                <Text style={{ marginRight: spacing.sm, width: 24 }}>{item.icon}</Text>
                <Text 
                  variant="md" 
                  style={{ 
                    fontFamily: 'BarlowCondensed-SemiBold', 
                    textTransform: 'uppercase', 
                    letterSpacing: 1, 
                    color: isActive ? theme.lamp : theme.dust 
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.footer, { borderTopColor: theme.rule }]}>
          <Text variant="sm" color="textMuted" style={{ fontFamily: 'BarlowCondensed-SemiBold', textTransform: 'uppercase' }}>
            {user.displayName}
          </Text>
          <Text variant="xs" color="textMuted" style={{ textTransform: 'uppercase', color: theme.shadow }}>
            {user.role}
          </Text>
        </View>
      </View>

      {/* MAIN CONTENT AREA */}
      <View style={[styles.content, { backgroundColor: theme.seam }]}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="roster" />
          <Stack.Screen name="fatigue" />
          <Stack.Screen name="muster/[id]" />
          <Stack.Screen name="reports" />
          <Stack.Screen name="admin" />
        </Stack>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: 240,
    borderRightWidth: 1,
    paddingVertical: spacing.xl,
    paddingHorizontal: 0,
    justifyContent: 'space-between',
  },
  brand: { marginBottom: spacing.xxl, paddingHorizontal: spacing.lg },
  nav: { flex: 1 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  footer: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    overflow: 'hidden'
  }
});
