/**
 * src/theme/index.ts
 * PURPOSE: Barrel export for the design system tokens and persistent theme hook/provider.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, darkTheme, lightTheme, ThemeColors } from './colors';
import { spacing, space, radius, elevation, TAP_MIN } from './spacing';
import { typography, typeScale, fonts } from './typography';

export { colors, darkTheme, lightTheme, spacing, space, radius, elevation, typography, typeScale, fonts, TAP_MIN };
export type { ThemeColors };

type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  theme: ThemeColors;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: darkTheme,
  mode: 'dark',
  setMode: () => {},
});

const THEME_KEY = '@shiftsync_theme';

import { Platform } from 'react-native';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        const style = document.createElement('style');
        style.textContent = `*:focus-visible { outline: 2px solid ${darkTheme.lamp} !important; outline-offset: 2px; }`;
        document.head.appendChild(style);
        
        const stored = window.localStorage.getItem(THEME_KEY);
        if (stored === 'light') setModeState('light');
      } catch (e) {}
      setIsLoaded(true);
      return;
    }

    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === 'light') setModeState('light');
      setIsLoaded(true);
    }).catch(() => {
      setIsLoaded(true);
    });
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    if (Platform.OS === 'web') {
      try { window.localStorage.setItem(THEME_KEY, newMode); } catch (e) {}
    } else {
      AsyncStorage.setItem(THEME_KEY, newMode).catch(() => {});
    }
  };

  if (!isLoaded) return null; // Avoid theme flash

  const theme = mode === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook returns the colors directly for backwards compatibility, 
// and the full context for new components
export const useTheme = (): ThemeColors & { mode: ThemeMode; setMode: (m: ThemeMode) => void } => {
  const context = useContext(ThemeContext);
  return { ...context.theme, mode: context.mode, setMode: context.setMode };
};
