/**
 * src/components/ui/SyncBadge.tsx
 * PURPOSE: Global indicator of offline/sync status, displayed in the header.
 * OFFLINE: Reflects local queue size or connection state.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme, spacing } from '../../theme';
import { Text } from './Text';
import { useSyncStore } from '../../offline/sync-manager';

export type SyncState = 'synced' | 'pending' | 'failed';

interface SyncBadgeProps {
  state?: SyncState;
  pendingCount?: number; // Only needed if state is 'pending'
}

export function SyncBadge({ state: propState, pendingCount: propPendingCount }: SyncBadgeProps) {
  const theme = useTheme();
  const { pendingCount: storePendingCount, failedCount } = useSyncStore();

  const state = propState || (failedCount > 0 ? 'failed' : (storePendingCount > 0 ? 'pending' : 'synced'));
  const pendingCount = propPendingCount !== undefined ? propPendingCount : storePendingCount;

  const getLabel = () => {
    if (state === 'synced') return '✓';
    if (state === 'pending') return `SYNC ${pendingCount}`;
    return '⚠';
  };

  const getBgColor = () => {
    if (state === 'synced') return theme.surface;
    if (state === 'pending') return theme.advisory;
    return theme.critical;
  };

  const getTextColor = () => {
    if (state === 'synced') return theme.safe;
    // For warning/critical, contrast requires dark text often, but let's stick to safe defaults
    // or white if we assume advisory is yellow and critical is red.
    if (state === 'pending') return '#0F1419'; // dark text on yellow
    return '#FFFFFF'; // white on red
  };

  return (
    <View style={[styles.badge, { backgroundColor: getBgColor() }]}>
      <Text variant="sm" weight="bold" style={{ color: getTextColor() }}>
        {getLabel()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
