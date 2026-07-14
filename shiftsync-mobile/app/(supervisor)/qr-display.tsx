import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Circle } from 'react-native-svg';
import { Screen, Text, Spinner, Button } from '../../src/components/ui';
import { spacing, useTheme } from '../../src/theme';
import { apiClient } from '../../src/api/client';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';

const QR_TTL_SECONDS = 90;

export default function QRDisplayScreen() {
  useKeepAwake();
  
  const theme = useTheme();
  const [shift, setShift] = useState<any>(null);
  const [headcount, setHeadcount] = useState<any>(null);
  const [token, setToken] = useState<string>('');
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(QR_TTL_SECONDS);
  const ringAnim = useRef(new Animated.Value(1)).current; // 1 = full, 0 = empty
  
  // Flash Queue
  const [flashQueue, setFlashQueue] = useState<string[]>([]);
  const [currentFlash, setCurrentFlash] = useState<string | null>(null);
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current; // slide from left

  const prevRecordsRef = useRef<any[]>([]);

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const init = async () => {
      const shifts = await apiClient.supervisor.listShifts();
      if (shifts.length > 0) {
        const activeShift = shifts[0];
        setShift(activeShift);
        generateToken(activeShift.id);
        fetchHeadcount(activeShift.id);
        
        interval = setInterval(() => fetchHeadcount(activeShift.id), 2000); // Poll fast for demo
      }
    };
    init();
    return () => clearInterval(interval);
  }, []);

  // ---------------------------------------------------------------------------
  // TOKEN & RING ROTATION
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!shift) return;

    // Start ring animation
    Animated.timing(ringAnim, {
      toValue: 0,
      duration: QR_TTL_SECONDS * 1000,
      easing: Easing.linear,
      useNativeDriver: false
    }).start();

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          generateToken(shift.id);
          // Reset ring
          ringAnim.setValue(1);
          Animated.timing(ringAnim, {
            toValue: 0,
            duration: QR_TTL_SECONDS * 1000,
            easing: Easing.linear,
            useNativeDriver: false
          }).start();
          return QR_TTL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [shift]);

  const generateToken = (shiftId: string) => {
    const newToken = `${shiftId}|${new Date().toISOString()}`;
    setToken(newToken);
  };

  // ---------------------------------------------------------------------------
  // FLASH ANIMATION ENGINE
  // ---------------------------------------------------------------------------

  const fetchHeadcount = async (shiftId: string) => {
    try {
      const stats = await apiClient.supervisor.headcount(shiftId);
      setHeadcount(stats);

      // Detect new scans
      if (prevRecordsRef.current.length > 0 && stats.records.length > prevRecordsRef.current.length) {
        const prevIds = prevRecordsRef.current.map(r => r.userId);
        const newRecords = stats.records.filter((r: any) => !prevIds.includes(r.userId));
        
        const newNames = newRecords.map((r: any) => `WORKER ${r.userId.slice(-4).toUpperCase()}`);
        if (newNames.length > 0) {
          setFlashQueue(prev => [...prev, ...newNames]);
        }
      }
      prevRecordsRef.current = stats.records;

    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    // Process queue
    if (flashQueue.length > 0 && !currentFlash) {
      const nextName = flashQueue[0] as string;
      setCurrentFlash(nextName);
      setFlashQueue(prev => prev.slice(1));

      // Trigger animation: slide in, hold 2s, fade out
      slideAnim.setValue(-200);
      flashOpacity.setValue(0);

      Animated.sequence([
        Animated.parallel([
          Animated.timing(flashOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: true })
        ]),
        Animated.delay(2000),
        Animated.timing(flashOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
      ]).start(() => {
        setCurrentFlash(null);
      });
    }
  }, [flashQueue, currentFlash]);

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  if (!shift || !token) {
    return <Screen style={styles.center}><Spinner /></Screen>;
  }

  const { width, height } = Dimensions.get('window');
  // QR code fills 70% of screen width, max 600
  const qrSize = Math.min(width * 0.7, 600);
  // Ring is slightly larger
  const ringSize = qrSize + 48;
  const radius = (ringSize - 8) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animate dash offset
  const strokeDashoffset = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0]
  });

  return (
    <Screen style={{ backgroundColor: theme.surface, justifyContent: 'center', alignItems: 'center' }}>
      
      {/* END KIOSK BUTTON */}
      <View style={styles.header}>
        <Button 
          title="END KIOSK" 
          variant="secondary"
          onPress={() => router.back()} 
          style={{ width: 140 }}
        />
      </View>

      {/* THE ROLL CALL KIOSK RING & QR */}
      <View style={{ width: ringSize, height: ringSize, justifyContent: 'center', alignItems: 'center' }}>
        {/* Depleting SVG Ring */}
        <Svg width={ringSize} height={ringSize} style={StyleSheet.absoluteFillObject}>
          <Circle 
            cx={ringSize / 2} cy={ringSize / 2} r={radius} 
            stroke={theme.rule} strokeWidth={8} fill="none" 
          />
          <AnimatedCircle 
            cx={ringSize / 2} cy={ringSize / 2} r={radius} 
            stroke={theme.lamp} strokeWidth={8} fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
          />
        </Svg>

        {/* Absolute Contrast QR Block */}
        <View style={[styles.qrWrapper, { width: qrSize, height: qrSize }]}>
          <QRCode value={token} size={qrSize - 32} color="#000000" backgroundColor="#FFFFFF" />
        </View>
      </View>

      {/* HERO METRICS */}
      <View style={{ marginTop: spacing.xxl, alignItems: 'center' }}>
        <Text variant="hero" style={{ color: theme.headlamp }}>
          {headcount?.present || 0} / {headcount?.expected || 52}
        </Text>
        <Text variant="display" style={{ color: theme.dust, marginTop: spacing.xs }}>
          CHECKED IN
        </Text>
      </View>

      {/* FLASH ANIMATION LAYER */}
      {currentFlash && (
        <Animated.View style={[
          styles.flashContainer, 
          { 
            backgroundColor: theme.safe,
            opacity: flashOpacity,
            transform: [{ translateX: slideAnim }]
          }
        ]}>
          <Text variant="display" weight="bold" style={{ color: '#000000', fontSize: 40, fontFamily: 'BarlowCondensed-Bold' }}>
            {currentFlash}
          </Text>
          <Text variant="title" style={{ color: '#000000', marginLeft: spacing.lg }}>
            CLEARED
          </Text>
        </Animated.View>
      )}

    </Screen>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.xl,
    zIndex: 10,
  },
  qrWrapper: {
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 0, // Strict rule: No soft corners
  },
  flashContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    shadowColor: '#00D166',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  }
});
