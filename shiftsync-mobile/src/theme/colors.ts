/**
 * src/theme/colors.ts
 * PURPOSE: Define the color palettes for the application (dark by default, plus light theme).
 * The app is an industrial safety app designed for high contrast and readability in harsh conditions.
 */

export const darkTheme = {
  seam:      '#0B0E11',
  anthracite:'#14181D',
  gangue:    '#1E242B',
  rule:      '#2C343D',
  headlamp:  '#F2F5F7',
  dust:      '#96A1AC',
  shadow:    '#5A646E',
  safe:      '#25A55F',
  advisory:  '#E8B10A',
  warning:   '#E5760F',
  danger:    '#D92B2B',
  lamp:      '#FFB000',
  lampDim:   '#8A6100',
  
  // Aliases for compatibility with generic components during migration
  bg: '#0B0E11',
  surface: '#14181D',
  border: '#2C343D',
  text: '#F2F5F7',
  textMuted: '#96A1AC',
  primary: '#FFB000',
  critical: '#D92B2B',
} as const;

export const lightTheme = {
  seam:      '#F4F5F6',
  anthracite:'#FFFFFF',
  gangue:    '#E9EBED',
  rule:      '#CDD2D7',
  headlamp:  '#12161A', // ~15.6:1
  dust:      '#414A52', // Darkened for >7:1
  shadow:    '#626D77', // Darkened to meet 4.5:1
  safe:      '#09542B', // Darkened for 7:1
  advisory:  '#664D00', // Darkened for 7:1
  warning:   '#7A3A07', // Darkened for 7:1
  danger:    '#8B1515', // Darkened for 7:1
  lamp:      '#855A00', // Darkened for 7:1
  lampDim:   '#B39B66',

  // Aliases
  bg: '#F4F5F6',
  surface: '#FFFFFF',
  border: '#CDD2D7',
  text: '#12161A',
  textMuted: '#414A52',
  primary: '#855A00',
  critical: '#8B1515',
} as const;

export const colors = darkTheme;
export type ThemeColors = Record<keyof typeof darkTheme, string>;
