import { useEffect, useState, type ReactNode } from 'react';
import { getSystemTheme, resolveTheme, ThemeContext, type ThemeSetting } from './theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeSetting, setThemeSettingState] = useState<ThemeSetting>(() => {
    const stored = localStorage.getItem('theme-setting');
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    return 'system';
  });

  const theme = resolveTheme(themeSetting);

  useEffect(() => {
    const root = document.documentElement;
    const resolved = resolveTheme(themeSetting);
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme-setting', themeSetting);
    // Also keep legacy key for backward compat
    localStorage.setItem('theme', resolved);
  }, [themeSetting]);

  // Listen for system preference changes
  useEffect(() => {
    if (themeSetting !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const root = document.documentElement;
      if (mq.matches) root.classList.add('dark');
      else root.classList.remove('dark');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [themeSetting]);

  const setThemeSetting = (setting: ThemeSetting) => {
    setThemeSettingState(setting);
  };

  const toggleTheme = () => {
    setThemeSettingState((prev) => {
      if (prev === 'system') {
        // Toggle based on current resolved theme
        return getSystemTheme() === 'dark' ? 'light' : 'dark';
      }
      return prev === 'dark' ? 'light' : 'dark';
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, themeSetting, setThemeSetting, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
