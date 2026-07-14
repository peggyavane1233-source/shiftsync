/**
 * app/(worker)/scanner.web.tsx
 * PURPOSE: No-op stub for the worker QR scanner on Web.
 * WHY: Web doesn't support expo-camera, and workers don't use the web app anyway.
 */
import React from 'react';
import { View, Text } from 'react-native';

export default function ScannerScreenWeb() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Scanner not supported on Web</Text>
    </View>
  );
}
