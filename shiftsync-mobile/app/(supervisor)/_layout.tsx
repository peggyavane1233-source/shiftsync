/**
 * app/(supervisor)/_layout.tsx
 * PURPOSE: Root layout for the supervisor section of the app.
 * PLACE: Loaded automatically by expo-router when a user with role SUPERVISOR accesses the app.
 * 
 * HACK: We use a simple Stack here instead of Tabs because Supervisors need full screen 
 * focus on tasks like Muster or QR Display. Navigation happens via the main Dashboard index.
 */

import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme';

import { MusterInitiationBar } from '../../src/components/ui';

export default function SupervisorLayout() {
  const theme = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: 'bold' },
      }}>
        <Stack.Screen name="index" options={{ title: 'Supervisor Dashboard', headerBackVisible: false }} />
        <Stack.Screen name="qr-display" options={{ title: 'Muster Point QR', presentation: 'fullScreenModal' }} />
        <Stack.Screen name="headcount" options={{ title: 'Live Headcount' }} />
        <Stack.Screen name="roster" options={{ title: 'Roster & Swaps' }} />
        <Stack.Screen name="shift/create" options={{ title: 'Create Shift' }} />
        <Stack.Screen name="shift/[id]" options={{ title: 'Manage Shift' }} />
        <Stack.Screen name="fatigue-alerts" options={{ title: 'Fatigue Alerts' }} />
        <Stack.Screen name="muster" options={{ title: 'Emergency Muster', headerShown: false, presentation: 'fullScreenModal' }} />
      </Stack>
      <MusterInitiationBar />
    </View>
  );
}
