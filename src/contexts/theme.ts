import { createContext, useContext } from 'react';

export type Theme = 'light' | 'dark';
export type ThemeSetting = Theme | 'system';

export interface ThemeContextValue {
  theme: Theme;
  themeSetting: ThemeSetting;
  setThemeSetting: (setting: ThemeSetting) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function getSystemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function resolveTheme(setting: ThemeSetting): Theme {
  if (setting === 'system') return getSystemTheme();
  return setting;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
