import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Screen, Text, Card, Button } from '../../../src/components/ui';
import { spacing, useTheme } from '../../../src/theme';
import { apiClient } from '../../../src/api/client';
import { format, addDays, startOfDay } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function CreateShiftScreen() {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(addDays(new Date(), 1)));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [shiftType, setShiftType] = useState<'DAY' | 'NIGHT'>('DAY');
  const [zone, setZone] = useState<string>('dept-0000-0000-0000-000000000001'); // Hardcoded Zone 1 for demo
  const [requiredWorkers, setRequiredWorkers] = useState<number>(5);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const startTime = shiftType === 'DAY' 
        ? new Date(selectedDate.getTime() + 6 * 3600000) 
        : new Date(selectedDate.getTime() + 18 * 3600000);
      
      const endTime = shiftType === 'DAY' 
        ? new Date(selectedDate.getTime() + 18 * 3600000) 
        : new Date(selectedDate.getTime() + 30 * 3600000);

      await apiClient.shifts.create({
        departmentId: zone,
        shiftType,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        requiredWorkers
      });
      router.back();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const dates = [0, 1, 2, 3, 4].map(i => startOfDay(addDays(new Date(), i)));
  const zones = [
    { id: 'dept-0000-0000-0000-000000000001', name: 'UG-Z1' },
    { id: 'dept-0000-0000-0000-000000000002', name: 'UG-Z2' },
    { id: 'dept-0000-0000-0000-000000000003', name: 'SURF' }
  ];

  return (
    <Screen style={{ backgroundColor: theme.seam }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="xl" weight="bold" style={{ marginBottom: spacing.lg }}>Create New Shift</Text>
        
        {/* DATE SELECTION */}
        <Text variant="label" style={{ color: theme.shadow, marginBottom: spacing.sm }}>SELECT DATE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
          {dates.map(date => (
            <TouchableOpacity 
              key={date.toISOString()}
              onPress={() => setSelectedDate(date)}
              style={[styles.chip, { 
                backgroundColor: selectedDate.getTime() === date.getTime() ? theme.lamp : theme.anthracite,
                borderColor: selectedDate.getTime() === date.getTime() ? theme.lamp : theme.rule 
              }]}
            >
              <Text variant="label" style={{ color: selectedDate.getTime() === date.getTime() ? '#000' : theme.dust }}>
                {format(date, 'EEE, MMM dd').toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity 
            onPress={() => setShowDatePicker(true)}
            style={[styles.chip, { 
              backgroundColor: theme.anthracite,
              borderColor: theme.rule 
            }]}
          >
            <Text variant="label" style={{ color: theme.dust }}>
              + CUSTOM DATE
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) {
                // Keep the chosen dates aligned to startOfDay
                setSelectedDate(startOfDay(date));
              }
            }}
          />
        )}

        {/* SHIFT TYPE */}
        <Text variant="label" style={{ color: theme.shadow, marginBottom: spacing.sm }}>SHIFT TYPE</Text>
        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
          {(['DAY', 'NIGHT'] as const).map(type => (
            <TouchableOpacity 
              key={type}
              onPress={() => setShiftType(type)}
              style={[styles.chip, { 
                flex: 1, 
                alignItems: 'center',
                backgroundColor: shiftType === type ? theme.lamp : theme.anthracite,
                borderColor: shiftType === type ? theme.lamp : theme.rule 
              }]}
            >
              <Text variant="label" style={{ color: shiftType === type ? '#000' : theme.dust }}>
                {type} SHIFT
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ZONE */}
        <Text variant="label" style={{ color: theme.shadow, marginBottom: spacing.sm }}>LOCATION / ZONE</Text>
        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
          {zones.map(z => (
            <TouchableOpacity 
              key={z.id}
              onPress={() => setZone(z.id)}
              style={[styles.chip, { 
                flex: 1, 
                alignItems: 'center',
                backgroundColor: zone === z.id ? theme.lamp : theme.anthracite,
                borderColor: zone === z.id ? theme.lamp : theme.rule 
              }]}
            >
              <Text variant="label" style={{ color: zone === z.id ? '#000' : theme.dust }}>
                {z.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* REQUIRED WORKERS */}
        <Text variant="label" style={{ color: theme.shadow, marginBottom: spacing.sm }}>HEADCOUNT REQUIRED</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xxl }}>
          <Button title="-" variant="secondary" onPress={() => setRequiredWorkers(Math.max(1, requiredWorkers - 1))} />
          <Card style={{ paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: theme.anthracite, borderColor: theme.rule }}>
            <Text variant="display" weight="bold">{requiredWorkers}</Text>
          </Card>
          <Button title="+" variant="secondary" onPress={() => setRequiredWorkers(requiredWorkers + 1)} />
        </View>

        <Button 
          title="PUBLISH SHIFT" 
          onPress={handleSubmit} 
          loading={loading}
          style={{ height: 64 }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, paddingBottom: spacing.xxl },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    marginRight: spacing.md
  }
});
