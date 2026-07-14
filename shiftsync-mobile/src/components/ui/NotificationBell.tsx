import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { spacing, useTheme } from '../../theme';
import { apiClient } from '../../api/client';
import { useAuth } from '../../features/auth';
import { Text } from './Text';

export function NotificationBell() {
  const theme = useTheme();
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    let interval: NodeJS.Timeout;
    const fetchNotifs = async () => {
      try {
        const notifs = await apiClient.notifications.me();
        setUnreadCount(notifs.filter((n: any) => !n.acknowledgedAt).length);
      } catch (e) {
        // silently fail for polling
      }
    };

    fetchNotifs();
    interval = setInterval(fetchNotifs, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  return (
    <TouchableOpacity 
      onPress={() => router.push('/(worker)/notifications')} 
      style={styles.container}
    >
      <Bell size={24} color={theme.text} />
      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: theme.primary }]}>
          <Text variant="xs" style={styles.badgeText}>{unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0A0C10', // Match header bg for cutout effect
  },
  badgeText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 10,
  }
});
