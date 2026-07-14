/**
 * app/(admin)/reports.tsx
 * PURPOSE: Stub for the Reports portal.
 */
import React from 'react';
import { Screen, Text } from '../../src/components/ui';

export default function AdminReportsScreen() {
  return (
    <Screen style={{ justifyContent: 'center', alignItems: 'center' }}>
      <Text variant="xl" weight="bold">Reports Portal</Text>
      <Text color="textMuted">Export attendance, overtime, and fatigue summaries.</Text>
    </Screen>
  );
}
