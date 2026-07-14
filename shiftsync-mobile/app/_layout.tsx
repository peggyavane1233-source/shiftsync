import React, { useEffect, useState } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { View } from 'react-native';
import { ThemeProvider, darkTheme } from '../src/theme';
import { SyncBadge, Spinner, Screen, NotificationBell } from '../src/components/ui';
import { useAuth } from '../src/features/auth';
import { registerForPushNotificationsAsync, setupNotificationListeners } from '../src/features/notifications/push';
import { useFonts, BarlowCondensed_700Bold, BarlowCondensed_600SemiBold } from '@expo-google-fonts/barlow-condensed';
import { Barlow_400Regular, Barlow_600SemiBold } from '@expo-google-fonts/barlow';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';

export default function RootLayout() {
  const { isAuthenticated, isRestoring, restoreSession, user } = useAuth();
  const segments = useSegments();
  const [hasRestored, setHasRestored] = useState(false);

  const [fontsLoaded] = useFonts({
    BarlowCondensed_700Bold,
    BarlowCondensed_600SemiBold,
    Barlow_400Regular,
    Barlow_600SemiBold,
    IBMPlexMono_500Medium,
  });

  useEffect(() => {
    restoreSession().finally(() => setHasRestored(true));
    
    // Setup listeners
    const cleanup = setupNotificationListeners();
    return cleanup;
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotificationsAsync();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!hasRestored) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated and not already in auth group
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect away from login if authenticated
      if (user?.role === 'WORKER') {
        router.replace('/(worker)/');
      } else {
        router.replace('/(supervisor)/');
      }
    }
  }, [isAuthenticated, hasRestored, segments, user]);

  if (!hasRestored || isRestoring || !fontsLoaded) {
    return (
      <ThemeProvider>
        <Screen style={{ justifyContent: 'center', alignItems: 'center' }}>
          <Spinner />
        </Screen>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <Stack screenOptions={{ 
        headerStyle: { backgroundColor: darkTheme.surface },
        headerTintColor: darkTheme.text,
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8, gap: 8 }}>
            <NotificationBell />
            <SyncBadge />
          </View>
        ),
      }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(worker)" options={{ title: 'ShiftSync', headerBackVisible: false }} />
        <Stack.Screen name="(supervisor)" options={{ title: 'ShiftSync', headerBackVisible: false }} />
        <Stack.Screen name="dev" options={{ title: 'Design System (Dev)' }} />
      </Stack>
    </ThemeProvider>
  );
}
