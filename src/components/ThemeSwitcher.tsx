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
    system: <Monitor size={16} className="text-muted-foreground" />,
    light: <Sun size={16} className="text-warning drop-shadow-[0_0_4px_var(--warning)]" />,
    dark: <Moon size={16} className="text-primary drop-shadow-[0_0_4px_var(--primary)]" />,
  };

  const labels = {
    system: 'System',
    light: 'Light',
    dark: 'Dark',
  };

  return (
    <button
      onClick={handleClick}
      className="group relative flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[var(--border)] bg-card text-foreground shadow-sm transition-all duration-300 hover:border-[var(--primary)] hover:shadow-glow hover:scale-105 active:scale-95"
      aria-label={`Theme: ${labels[themeSetting]}. Click to change.`}
      title={`Theme: ${labels[themeSetting]}`}
    >
      {/* Glow ring on hover */}
      <div className="absolute inset-0 rounded-xl bg-primary/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative transition-transform duration-500 group-hover:rotate-12">
        {icons[themeSetting]}
      </div>
    </button>
  );
}
