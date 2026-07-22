import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Svg, { Path, Polygon, Line, Circle, Polyline } from 'react-native-svg';
import { router } from 'expo-router';
import { Screen, Text, Card, Button } from '../../src/components/ui';
import { spacing, useTheme } from '../../src/theme';
import { apiClient } from '../../src/api/client';

// Math for Gauge
const GAUGE_START_ANGLE = 150;
const GAUGE_END_ANGLE = 390;
const GAUGE_RANGE = GAUGE_END_ANGLE - GAUGE_START_ANGLE;
const CX = 150;
const CY = 150;
const R = 100;

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(" ");
}

const getBlockBar = (val: number, max: number) => {
  const totalBlocks = 10;
  const filled = Math.min(totalBlocks, Math.max(0, Math.round((val / max) * totalBlocks)));
  const empty = totalBlocks - filled;
  return '▓'.repeat(filled) + '░'.repeat(empty);
};

export default function FatigueScreen() {
  const theme = useTheme();
  const [fatigue, setFatigue] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [sleepHours, setSleepHours] = useState<number>(7.0);
  const [alertness, setAlertness] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const data = await apiClient.fatigue.me();
      setFatigue(data);
      if (data?.lastAssessment) {
        setSleepHours(data.lastAssessment.sleepHours);
        setAlertness(data.lastAssessment.alertness);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async () => {
    if (alertness === null) return;
    setSubmitting(true);
    try {
      const updated = await apiClient.fatigue.selfReport({ sleepHours, alertness });
      setFatigue(updated);
      Alert.alert(
        'Assessment Updated',
        `Your fatigue score is now ${updated.score} (${updated.riskLevel}).`
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save assessment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Screen style={styles.center}><Text variant="display" color="textMuted">LOADING...</Text></Screen>;
  if (!fatigue) return <Screen style={styles.center}><Text>No data</Text></Screen>;

  const score = fatigue.score;
  const isCritical = fatigue.riskLevel === 'CRITICAL';
  const hasOverride = !!fatigue.hasOverride;
  const nightShifts = fatigue.nightShifts7d ?? fatigue.nightShifts ?? 0;
  const hours24 = fatigue.hoursWorked24h ?? 0;
  const hours7d = fatigue.hoursWorked7d ?? 0;
  const consecutiveDays = fatigue.consecutiveDays ?? 0;
  // Sleep risk contribution: fewer hours → higher bar
  const sleepRisk = Math.max(0, Math.min(15, Math.round((8 - sleepHours) * 3)));
  
  const getRiskColor = (level: string) => {
    if (level === 'CRITICAL') return theme.critical;
    if (level === 'WARNING') return theme.warning;
    if (level === 'ADVISORY') return theme.advisory;
    return theme.safe;
  };
  const activeColor = getRiskColor(fatigue.riskLevel);

  // SVG Gauge Math
  const scoreAngle = GAUGE_START_ANGLE + (score / 100) * GAUGE_RANGE;
  const needleTip = polarToCartesian(CX, CY, R - 12, scoreAngle);
  const needleLeft = polarToCartesian(CX, CY, 8, scoreAngle - 90);
  const needleRight = polarToCartesian(CX, CY, 8, scoreAngle + 90);
  const needlePath = `${needleTip.x},${needleTip.y} ${needleLeft.x},${needleLeft.y} ${needleRight.x},${needleRight.y}`;

  // Sparkline Math
  const sparklineData = fatigue.history && fatigue.history.length > 0 
    ? fatigue.history.map((h: any) => h.score)
    : [score]; // fallback
    
  // If fewer than 30 data points, pad the beginning or just draw what we have
  const count = Math.max(1, sparklineData.length - 1);
  const sparkPts = sparklineData.map((d: number, i: number) => `${(i / count) * 300},${100 - d}`).join(' ');

  return (
    <Screen style={{ backgroundColor: theme.seam }}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* CRITICAL OVERRIDE BAR */}
        {isCritical && !hasOverride && (
          <View style={[styles.criticalBar, { backgroundColor: theme.danger }]}>
            <Text variant="title" weight="bold" style={{ color: '#000000', marginBottom: spacing.sm }}>
              ⛔ YOU CANNOT START YOUR NEXT SHIFT WITHOUT SUPERVISOR APPROVAL.
            </Text>
            <Button title="BACK TO ROSTER" variant="secondary" onPress={() => router.back()} />
          </View>
        )}

        {isCritical && hasOverride && (
          <View style={[styles.criticalBar, { backgroundColor: theme.warning }]}>
            <Text variant="title" weight="bold" style={{ color: '#000000' }}>
              SUPERVISOR OVERRIDE ACTIVE — CHECK-IN ALLOWED
            </Text>
          </View>
        )}

        <Text variant="display" weight="bold" style={{ color: theme.headlamp, margin: spacing.md, textAlign: 'center' }}>
          FATIGUE INSTRUMENT
        </Text>

        {/* THE CAP-LAMP GAUGE */}
        <View style={styles.gaugeContainer}>
          <Svg width={300} height={200} viewBox="0 0 300 200">
            {/* The Bands */}
            <Path d={describeArc(CX, CY, R, GAUGE_START_ANGLE, GAUGE_START_ANGLE + GAUGE_RANGE * 0.4)} stroke={theme.safe} strokeWidth="12" fill="none" />
            <Path d={describeArc(CX, CY, R, GAUGE_START_ANGLE + GAUGE_RANGE * 0.4, GAUGE_START_ANGLE + GAUGE_RANGE * 0.6)} stroke={theme.advisory} strokeWidth="12" fill="none" />
            <Path d={describeArc(CX, CY, R, GAUGE_START_ANGLE + GAUGE_RANGE * 0.6, GAUGE_START_ANGLE + GAUGE_RANGE * 0.8)} stroke={theme.warning} strokeWidth="12" fill="none" />
            <Path d={describeArc(CX, CY, R, GAUGE_START_ANGLE + GAUGE_RANGE * 0.8, GAUGE_END_ANGLE)} stroke={theme.critical} strokeWidth="12" fill="none" />
            
            {/* Tick Marks (Every 10 points) */}
            {Array.from({ length: 11 }).map((_, i) => {
              const val = i * 10;
              const angle = GAUGE_START_ANGLE + (val / 100) * GAUGE_RANGE;
              const isHeavy = val === 40 || val === 60 || val === 80;
              const outer = polarToCartesian(CX, CY, R + (isHeavy ? 12 : 6), angle);
              const inner = polarToCartesian(CX, CY, R - (isHeavy ? 12 : 6), angle);
              return <Line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={theme.rule} strokeWidth={isHeavy ? 4 : 2} />;
            })}

            {/* The Needle */}
            <Polygon points={needlePath} fill={theme.lamp} />
            <Circle cx={CX} cy={CY} r="12" fill={theme.lamp} />
            <Circle cx={CX} cy={CY} r="6" fill="#000000" />
          </Svg>

          {/* Central Score */}
          <View style={styles.scoreTextOverlay}>
            <Text variant="hero" style={{ color: theme.headlamp }}>{score}</Text>
            <Text variant="status" style={{ color: activeColor }}>{fatigue.riskLevel}</Text>
          </View>
        </View>

        {/* THE "WHY" BREAKDOWN */}
        <Card padding="md" style={styles.breakdownCard}>
          <Text variant="label" style={{ color: theme.shadow, marginBottom: spacing.md }}>WHY YOUR RISK IS HIGH</Text>
          <View style={{ borderBottomWidth: 1, borderBottomColor: theme.rule, marginBottom: spacing.sm }} />
          
          <BreakdownRow label="Hours worked, last 24h" raw={`${hours24} h`} val={hours24} max={16} theme={theme} />
          <BreakdownRow label="Hours worked, last 7 days" raw={`${hours7d} h`} val={hours7d} max={56} theme={theme} />
          <BreakdownRow label="Night shifts, last 7 days" raw={`${nightShifts}`} val={nightShifts} max={7} theme={theme} />
          <BreakdownRow label="Days without a rest day" raw={`${consecutiveDays}`} val={consecutiveDays} max={14} theme={theme} />
          <BreakdownRow label="Sleep reported last night" raw={`${sleepHours} h`} val={sleepRisk} max={15} theme={theme} />
          
          <View style={{ borderTopWidth: 1, borderTopColor: theme.rule, marginTop: spacing.sm, paddingTop: spacing.md, flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Text variant="label" style={{ color: theme.shadow, marginRight: spacing.md }}>TOTAL</Text>
            <Text variant="dataLg" style={{ color: theme.headlamp }}>{score} / 100</Text>
          </View>
        </Card>

        {/* 30-DAY SPARKLINE */}
        <Card padding="md" style={styles.breakdownCard}>
          <Text variant="label" style={{ color: theme.shadow, marginBottom: spacing.md }}>30-DAY TREND</Text>
          <View style={{ height: 100, width: '100%' }}>
            <Svg width="100%" height="100%" viewBox="0 0 300 100" preserveAspectRatio="none">
              {/* Hairlines at 40, 60, 80 */}
              <Line x1="0" y1={100 - 40} x2="300" y2={100 - 40} stroke={theme.rule} strokeWidth="1" strokeDasharray="4,4" />
              <Line x1="0" y1={100 - 60} x2="300" y2={100 - 60} stroke={theme.rule} strokeWidth="1" strokeDasharray="4,4" />
              <Line x1="0" y1={100 - 80} x2="300" y2={100 - 80} stroke={theme.rule} strokeWidth="1" strokeDasharray="4,4" />
              
              {/* The Sparkline */}
              <Polyline points={sparkPts} fill="none" stroke={theme.headlamp} strokeWidth="2" />
              
              {/* Mark warnings */}
              {sparklineData.map((d: number, i: number) => {
                if (d >= 60) {
                  const cx = (i / count) * 300;
                  const cy = 100 - d;
                  return <Circle key={i} cx={cx} cy={cy} r="4" fill={d >= 80 ? theme.danger : theme.warning} />;
                }
                return null;
              })}
            </Svg>
          </View>
        </Card>

        {/* SELF-REPORT */}
        <Text variant="label" style={{ color: theme.shadow, marginTop: spacing.xl, marginBottom: spacing.md }}>
          SELF-REPORT
        </Text>
        <Card padding="md" style={styles.breakdownCard}>
          <Text variant="body" style={{ color: theme.headlamp, marginBottom: spacing.md }}>How many hours did you sleep?</Text>
          <View style={styles.stepper}>
            <Button title="—" variant="secondary" onPress={() => setSleepHours(Math.max(0, sleepHours - 0.5))} style={styles.stepperBtn} />
            <View style={styles.stepperVal}>
              <Text variant="dataLg" style={{ color: theme.headlamp }}>{sleepHours.toFixed(1)} h</Text>
            </View>
            <Button title="+" variant="secondary" onPress={() => setSleepHours(Math.min(24, sleepHours + 0.5))} style={styles.stepperBtn} />
          </View>

          <Text variant="body" style={{ color: theme.headlamp, marginTop: spacing.xl, marginBottom: spacing.md }}>How alert do you feel right now?</Text>
          <View style={{ gap: spacing.sm }}>
            {[
              { val: 1, label: 'FIGHTING SLEEP' },
              { val: 2, label: 'STRUGGLING' },
              { val: 3, label: 'A BIT TIRED' },
              { val: 4, label: 'FINE' },
              { val: 5, label: 'WIDE AWAKE' },
            ].map(item => (
              <TouchableOpacity 
                key={item.val} 
                onPress={() => setAlertness(item.val)}
                style={[
                  styles.alertCard, 
                  { borderColor: theme.rule, backgroundColor: alertness === item.val ? theme.lampDim : theme.anthracite },
                  alertness === item.val && { borderColor: theme.lamp }
                ]}
              >
                <Text variant="dataLg" style={{ color: alertness === item.val ? theme.lamp : theme.dust, width: 32 }}>{item.val}</Text>
                <Text variant="label" style={{ color: alertness === item.val ? '#000000' : theme.headlamp }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button 
            title="UPDATE ASSESSMENT" 
            variant="primary" 
            style={{ marginTop: spacing.xl }}
            disabled={alertness === null || submitting}
            loading={submitting}
            onPress={handleSubmit}
          />
        </Card>

      </ScrollView>
    </Screen>
  );
}

function BreakdownRow({ label, raw, val, max, theme }: { label: string, raw: string, val: number, max: number, theme: any }) {
  const capped = Math.min(val, max);
  return (
    <View style={styles.breakdownRow}>
      <Text variant="body" style={{ color: theme.headlamp, flex: 2 }}>{label}</Text>
      <Text variant="data" style={{ color: theme.dust, width: 60, textAlign: 'right' }}>{raw}</Text>
      <Text variant="data" style={{ color: theme.warning, width: 100, textAlign: 'center' }}>{getBlockBar(capped, max)}</Text>
      <Text variant="data" style={{ color: theme.headlamp, width: 60, textAlign: 'right' }}>{capped} / {max}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  criticalBar: { padding: spacing.lg, borderRadius: 2, marginBottom: spacing.xl },
  gaugeContainer: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xxl, height: 200 },
  scoreTextOverlay: { position: 'absolute', top: 90, alignItems: 'center', width: 200 },
  breakdownCard: { marginBottom: spacing.lg },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepperBtn: { width: 64, height: 56, paddingHorizontal: 0 },
  stepperVal: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 56, borderWidth: 1, borderColor: '#2C343D', marginHorizontal: spacing.xs, borderRadius: 2 },
  alertCard: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, borderWidth: 1, borderRadius: 2 }
});
