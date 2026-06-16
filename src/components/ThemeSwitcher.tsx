import { Moon, Monitor, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export function ThemeSwitcher() {
  const { themeSetting, setThemeSetting } = useTheme();

  // Cycle: system → light → dark → system
  const handleClick = () => {
    if (themeSetting === 'system') setThemeSetting('light');
    else if (themeSetting === 'light') setThemeSetting('dark');
    else setThemeSetting('system');
  };

  const icons = {
    system: <Monitor size={16} />,
    light: <Sun size={16} />,
    dark: <Moon size={16} />,
  };

  const labels = {
    system: 'System theme',
    light: 'Light theme',
    dark: 'Dark theme',
  };

  const nextTheme = themeSetting === 'system' ? 'light' : themeSetting === 'light' ? 'dark' : 'system';

  return (
    <button
      onClick={handleClick}
      className="group relative flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[var(--border)] bg-card text-foreground shadow-sm transition-all duration-300 hover:border-[var(--primary)] hover:shadow-glow hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
      aria-label={`${labels[themeSetting]}. Click to switch to ${nextTheme} theme.`}
      title={`${labels[themeSetting]} → ${nextTheme}`}
    >
      {/* Glow ring on hover */}
      <div className="absolute inset-0 rounded-xl bg-primary/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />

      <div className="relative transition-transform duration-500 group-hover:rotate-12">
        <span className={themeSetting === 'light' ? 'text-warning drop-shadow-[0_0_4px_var(--warning)]' : themeSetting === 'dark' ? 'text-primary drop-shadow-[0_0_4px_var(--primary)]' : 'text-muted-foreground'}>
          {icons[themeSetting]}
        </span>
      </div>
    </button>
  );
}
