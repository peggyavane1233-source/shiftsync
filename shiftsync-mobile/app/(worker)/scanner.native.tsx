import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, AccessibilityInfo } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '../../src/components/ui';
import { spacing, useTheme } from '../../src/theme';
import { offlineWrite } from '../../src/offline/write';
import { apiClient } from '../../src/api/client';
import { OutcomeOverlay, OutcomeState } from '../../src/components/ui/OutcomeOverlay';

export default function ScannerScreen() {
  const { shiftId, type } = useLocalSearchParams(); // type: 'checkin' | 'checkout'
  const theme = useTheme();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [feedback, setFeedback] = useState<OutcomeState>('NONE');

  // Animation for scanner sweep
  const sweepAnim = useRef(new Animated.Value(0)).current;
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();

    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
  }, []);

  useEffect(() => {
    if (!reducedMotion) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(sweepAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(sweepAnim, { toValue: 0, duration: 2000, useNativeDriver: true })
        ])
      ).start();
    }
  }, [reducedMotion]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    const endpoint = type === 'checkout' ? '/v1/attendance/checkout' : '/v1/attendance/checkin';
      
    try {
      const payloadCheckin = {
        clientUuid: 'temp-id',
        shiftId: shiftId as string,
        method: 'QR' as const,
        qrToken: data,
        lat: 0,
        lng: 0,
        capturedAt: new Date().toISOString()
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
            method: 'QR',
            qrToken: data,
            lat: 0,
            lng: 0,
          };
          await offlineWrite(endpoint, 'POST', payload);
          setFeedback('QUEUED');
      } else if (e?.error === 'QR_EXPIRED') {
        setFeedback('EXPIRED');
      } else if (e?.error === 'FATIGUE_CRITICAL') {
        setFeedback('BLOCKED');
      } else if (e?.error === 'FORBIDDEN') {
        setFeedback('NOT_ROSTERED');
      } else {
        setFeedback('NOT_ROSTERED');
      }
    }
  };

  const handleDismiss = () => {
    if (feedback === 'SUCCESS' || feedback === 'QUEUED') {
      router.back();
    } else {
      setFeedback('NONE');
      setScanned(false);
    }
  };

  if (hasPermission === null) {
    return <View style={[styles.center, { backgroundColor: theme.seam }]}><Text>Requesting camera permission...</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={[styles.center, { backgroundColor: theme.seam }]}><Text>No access to camera</Text></View>;
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />
      
      {/* Scan Frame Overlay */}
      <View style={styles.overlay}>
        <View style={styles.instructionContainer}>
          <Text variant="label" style={{ color: '#FFFFFF', textAlign: 'center' }}>
            SCAN THE CODE AT THE ROLL CALL POINT
          </Text>
        </View>

        {/* Glowing Amber Frame */}
        <View style={[styles.frame, { borderColor: theme.lamp, shadowColor: theme.lamp }]}>
          {/* Sweeping scan line */}
          {!reducedMotion && (
            <Animated.View
              style={[
                styles.sweep,
                { backgroundColor: theme.lamp },
                {
                  transform: [{
                    translateY: sweepAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 248] // Inner height of frame
                    })
                  }]
                }
              ]}
            />
          )}
        </View>
      </View>

      <OutcomeOverlay outcome={feedback} onDismiss={handleDismiss} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionContainer: {
    position: 'absolute',
    top: 100,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 2,
  },
  frame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    backgroundColor: 'transparent',
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 8, // Intense lamp glow
    overflow: 'hidden', // Contain sweep line
  },
  sweep: {
    width: '100%',
    height: 2,
    position: 'absolute',
    top: 0,
    shadowColor: '#FFB000',
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  }
});
