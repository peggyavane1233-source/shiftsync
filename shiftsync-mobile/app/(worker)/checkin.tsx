/**
 * app/(worker)/checkin.web.tsx
 * PURPOSE: No-op stub for the GPS checkin on Web.
 * WHY: Web doesn't support expo-location bundled native modules in our config, and workers don't use the web app anyway.
 */
import React from 'react';
import { View, Text } from 'react-native';

export default function CheckinScreenWeb() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>GPS Checkin not supported on Web</Text>
    </View>
  );
}
