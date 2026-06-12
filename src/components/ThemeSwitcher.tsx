import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="group relative flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[var(--border)] bg-card text-foreground shadow-sm transition-all duration-300 hover:border-[var(--primary)] hover:shadow-glow hover:scale-105 active:scale-95"
      aria-label="Toggle theme"
    >
      {/* Glow ring on hover */}
      <div className="absolute inset-0 rounded-xl bg-primary/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative transition-transform duration-500 group-hover:rotate-12">
        {theme === 'dark' ? (
          <Sun size={16} className="text-warning drop-shadow-[0_0_4px_var(--warning)]" />
        ) : (
          <Moon size={16} className="text-primary drop-shadow-[0_0_4px_var(--primary)]" />
        )}
      </div>
    </button>
  );
}
