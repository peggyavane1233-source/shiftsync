/**
 * src/components/ui/StatusPill.tsx
 * PURPOSE: Strict status indicator. 
 * REQUIREMENT: Every status = COLOUR + ICON + WORD. All three.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CheckCircle2, AlertCircle, AlertTriangle, XCircle, MinusCircle } from 'lucide-react-native';
import { useTheme, spacing, radius } from '../../theme';
import { Text } from './Text';

export type StatusVariant = 'safe' | 'advisory' | 'warning' | 'danger' | 'neutral';

interface StatusPillProps {
  variant: StatusVariant;
  label: string;
}

export function StatusPill({ variant, label }: StatusPillProps) {
  const theme = useTheme();

  const getConfig = () => {
    switch (variant) {
      case 'safe': return { color: theme.safe, Icon: CheckCircle2 };
      case 'advisory': return { color: theme.advisory, Icon: AlertCircle };
      case 'warning': return { color: theme.warning, Icon: AlertTriangle };
      case 'danger': return { color: theme.danger, Icon: XCircle };
      case 'neutral': 
      default: 
        return { color: theme.dust, Icon: MinusCircle };
    }
  };

  const { color, Icon } = getConfig();

  return (
    <View style={[styles.container, { backgroundColor: theme.anthracite, borderColor: theme.rule }]}>
      <Icon size={16} color={color} strokeWidth={2.5} />
      <Text variant="label" style={{ color: color, marginLeft: spacing.xs }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});
