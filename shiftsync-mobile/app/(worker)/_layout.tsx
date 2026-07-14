import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '../../src/theme';
import { Text } from '../../src/components/ui';

import { Calendar, Battery, Bell, User } from 'lucide-react-native';

export default function WorkerLayout() {
  const theme = useTheme();
  
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: theme.anthracite, borderTopColor: theme.rule, height: 64, paddingBottom: 8, paddingTop: 8 },
      tabBarActiveTintColor: theme.lamp,
      tabBarInactiveTintColor: theme.dust,
    }}>
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'ROSTER',
          tabBarLabelStyle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 14 },
          tabBarIcon: ({ color }) => <Calendar size={24} color={color} strokeWidth={2} />
        }} 
      />
      <Tabs.Screen 
        name="fatigue" 
        options={{ 
          title: 'FATIGUE',
          tabBarLabelStyle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 14 },
          tabBarIcon: ({ color }) => <Battery size={24} color={color} strokeWidth={2} />
        }} 
      />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'SYS.ID',
          tabBarLabelStyle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 14 },
          tabBarIcon: ({ color }) => <User size={24} color={color} strokeWidth={2} />
        }} 
      />

      {/* Hidden Screens */}
      <Tabs.Screen name="shift/[id]" options={{ href: null }} />
      <Tabs.Screen name="shift/swap/[id]" options={{ href: null }} />
      <Tabs.Screen name="swap-modal" options={{ href: null, title: 'Request Swap' }} />
      <Tabs.Screen name="scanner" options={{ href: null }} />
      <Tabs.Screen name="checkin" options={{ href: null }} />
      <Tabs.Screen name="attendance-history" options={{ href: null }} />
    </Tabs>
  );
}
