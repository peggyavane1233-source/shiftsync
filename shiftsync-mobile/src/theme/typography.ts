/**
 * src/theme/typography.ts
 * PURPOSE: Define standard typography tokens with strict roles.
 */

export const fonts = {
  display: 'BarlowCondensed_700Bold',
  displayMedium: 'BarlowCondensed_600SemiBold',
  body: 'Barlow_400Regular',
  bodyBold: 'Barlow_600SemiBold',
  data: 'IBMPlexMono_500Medium',
} as const;

export const typeScale = {
  hero: { fontFamily: fonts.display, fontSize: 72, lineHeight: 72, letterSpacing: -1 },
  display: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: 0 },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32 },
  status: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24, letterSpacing: 1.5, textTransform: 'uppercase' as const },
  bodyLg: { fontFamily: fonts.body, fontSize: 18, lineHeight: 26 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 18, letterSpacing: 0.5, textTransform: 'uppercase' as const },
  data: { fontFamily: fonts.data, fontSize: 16, lineHeight: 22 },
  dataLg: { fontFamily: fonts.data, fontSize: 24, lineHeight: 30 },
  caption: { fontFamily: fonts.data, fontSize: 13, lineHeight: 18 },
} as const;

// Legacy mappings to keep generic components working during the transition
export const typography = {
  fonts,
  sizes: {
    xs: 16, // Enforced minimum
    sm: 16,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  weights: {
    regular: '400' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};
