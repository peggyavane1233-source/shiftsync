import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { Text, Button, Card, Screen } from '../../src/components/ui';
import { spacing, useTheme } from '../../src/theme';
import { offlineWrite } from '../../src/offline/write';
import { apiClient } from '../../src/api/client';
import { OutcomeOverlay, OutcomeState } from '../../src/components/ui/OutcomeOverlay';

// Hardcoded Mine Zone for mock purposes
const MINE_ZONE = {
  latitude: -31.9505, // E.g. Perth mock
  longitude: 115.8605,
  radiusMeters: 500
};

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function GPSCheckinScreen() {
  const { shiftId, type } = useLocalSearchParams(); // type: 'checkin' | 'checkout'
  const theme = useTheme();

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<OutcomeState>('NONE');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let sub: Location.LocationSubscription;
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Just mock distance locally if permission fails for dev
        return;
      }

      sub = await Location.watchPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 5,
      }, (loc) => {
        setLocation(loc);
        if (loc.mocked) {
          setFeedback('BLOCKED');
        } else {
          const dist = getDistanceMeters(loc.coords.latitude, loc.coords.longitude, MINE_ZONE.latitude, MINE_ZONE.longitude);
          setDistance(Math.round(dist));
        }
      });
    })();
    return () => { if (sub) sub.remove(); };
  }, []);

  const handleAction = async () => {
    if (!location) return;
    setSubmitting(true);

    const endpoint = type === 'checkout' ? '/v1/attendance/checkout' : '/v1/attendance/checkin';
      
    try {
      const payloadCheckin = {
        clientUuid: 'temp-id',
        shiftId: shiftId as string,
        method: 'GPS' as const,
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        capturedAt: new Date().toISOString(),
      };

      if (type === 'checkout') {
        await apiClient.attendance.checkout(payloadCheckin);
      } else {
        await apiClient.attendance.checkin(payloadCheckin);
      }
      setFeedback('SUCCESS');

    } catch (e: any) {
      if (e.message?.includes('Network request failed') || e.message?.includes('Failed to fetch') || !e.error) {
          const payload = {
            shiftId: shiftId as string,
            method: 'GPS',
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          };
          await offlineWrite(endpoint, 'POST', payload);
          setFeedback('QUEUED');
      } else if (e?.error === 'FATIGUE_CRITICAL') {
        setFeedback('BLOCKED');
      } else if (e?.error === 'FORBIDDEN') {
        setFeedback('NOT_ROSTERED');
      } else {
        setFeedback('NOT_ROSTERED');
      }
    }
    setSubmitting(false);
  };

  const handleDismiss = () => {
    if (feedback === 'SUCCESS' || feedback === 'QUEUED') {
      router.back();
    } else {
      setFeedback('NONE');
    }
  };

  const isOutside = distance !== null && distance > MINE_ZONE.radiusMeters;
  const isMocked = location?.mocked;
  const isBtnDisabled = !location || isOutside || isMocked || submitting;

  return (
    <Screen style={{ padding: spacing.md, backgroundColor: theme.seam }}>
      <Text variant="display" weight="bold" style={{ color: theme.headlamp, marginBottom: spacing.xl, marginTop: spacing.md }}>
        GPS CHECK-IN
      </Text>

      <Card padding="xl" style={{ alignItems: 'center', backgroundColor: theme.anthracite, borderColor: theme.rule }}>
        {/* SVG Ring Visualizer */}
        <View style={styles.svgContainer}>
          <Svg width="200" height="200">
            {/* The Geofence Zone (radius 80) */}
            <Circle cx="100" cy="100" r="80" stroke={theme.rule} strokeWidth="2" fill="transparent" />
            <Circle cx="100" cy="100" r="80" fill={theme.lamp} opacity="0.05" />
            
            {/* The Worker Dot */}
            {distance !== null && (
              <Circle 
                cx="100" 
                cy={isOutside ? 180 : 100 + (distance / MINE_ZONE.radiusMeters) * 70} // Map distance physically
                r="8" 
                fill={isOutside ? theme.danger : theme.lamp} 
              />
            )}
          </Svg>
        </View>

        {!location ? (
          <View style={{ alignItems: 'center', height: 80, justifyContent: 'center' }}>
            <ActivityIndicator color={theme.lamp} size="large" />
            <Text variant="label" style={{ marginTop: spacing.md, color: theme.dust }}>ACQUIRING SATELLITE LOCK...</Text>
          </View>
        ) : (
          <View style={{ height: 80, alignItems: 'center', justifyContent: 'center' }}>
            {isMocked ? (
              <Text variant="bodyLg" style={{ color: theme.danger, textAlign: 'center' }}>Location cannot be verified on this device.</Text>
            ) : isOutside ? (
              <>
                <Text variant="bodyLg" style={{ color: theme.danger, textAlign: 'center' }}>
                  You are <Text variant="dataLg" style={{ color: theme.danger }}>{distance}</Text>m outside Zone 2.
                </Text>
              </>
            ) : (
              <Text variant="bodyLg" style={{ color: theme.safe, textAlign: 'center' }}>
                You are within Zone 2. Ready to check in.
              </Text>
            )}
          </View>
        )}
      </Card>

      <Button 
        title={type === 'checkout' ? "CONFIRM CHECK OUT" : "CONFIRM CHECK IN"}
        size="lg"
        variant="primary"
        disabled={isBtnDisabled}
        loading={submitting}
        onPress={handleAction}
        style={{ marginTop: spacing.xxl, height: 72 }}
      />

      <OutcomeOverlay outcome={feedback} onDismiss={handleDismiss} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  svgContainer: {
    width: 200,
    height: 200,
    marginBottom: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
