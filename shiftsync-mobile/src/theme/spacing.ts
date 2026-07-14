/**
 * src/theme/spacing.ts
 * PURPOSE: Define the standard spacing scale and critical sizing constants.
 * This app requires large tap targets for gloved operation.
 */

import { colors } from './colors';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const space = spacing; // Alias for exact brief match

export const radius = { none: 0, sm: 2, md: 4, tag: 999 } as const;

export const elevation = {
  flat:    { borderWidth: 0 },
  raised:  { borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.anthracite },
  lamp:    { shadowColor: colors.lamp, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
} as const;

// SAFETY: 56x56 is the absolute minimum tap target size for industrial gloved use.
export const TAP_MIN = 56;
