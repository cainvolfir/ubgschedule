import { Outlet } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

interface RootLayoutProps {
  currentStep?: number;
  statusText?: string;
}

const STEP_LABELS = ['Theory', 'Practical', 'Results'];

export function RootLayout({ currentStep, statusText }: RootLayoutProps) {
  const { toggleTheme, theme } = useTheme();

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background p-md font-sans-ui text-on-surface dark:bg-dark-background dark:text-dark-primary lg:p-lg">
      {/* Ambient grid canvas */}
      <div className="grid-canvas fixed inset-0 z-0 pointer-events-none opacity-0" aria-hidden="true" />

      {/* Wizard header */}
      <header className="z-10 mb-xl flex w-full max-w-4xl items-center justify-between px-md">
        {/* Brand */}
        <div className="font-display-serif flex items-center gap-sm text-headline-md text-primary dark:text-dark-primary">
          <img src="/ubg-logo.png" alt="UBG Schedule logo" className="h-8 w-8 object-contain dark:invert" />
          UBG Schedule
        </div>

        {/* Progress indicator */}
        <div className="hidden items-center gap-md md:flex">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-md">
              {i > 0 && <div className="h-px w-8 bg-outline-variant dark:bg-dark-border" />}
              <div
                className={(
                  'flex items-center gap-sm px-md py-sm ' +
                  (currentStep === i
                    ? 'rounded-full bg-primary-container text-on-primary-container shadow-sm dark:bg-dark-surface dark:text-dark-primary dark:border dark:border-dark-border'
                    : 'text-secondary dark:text-on-tertiary-container')
                )}
              >
                <div
                  className={(
                    'flex h-6 w-6 items-center justify-center font-label-sm text-label-sm ' +
                    (currentStep === i
                      ? 'no-transition rounded-full bg-white font-semibold text-black dark:bg-[#1A1A1A] dark:text-dark-primary'
                      : 'rounded-full border border-secondary dark:border-on-tertiary-container')
                  )}
                >
                  {i + 1}
                </div>
                <span className="font-label-sm text-label-sm font-semibold">{label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="relative flex h-8 w-12 items-center rounded-full border-2 border-black/50 bg-surface p-1 shadow-sm transition-colors hover:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background dark:border-white/50 dark:bg-dark-surface dark:hover:bg-[#1A1A1A] dark:focus:ring-offset-dark-background"
        >
          <div className="flex h-6 w-6 translate-x-0 items-center justify-center transition-transform duration-300 dark:translate-x-4">
            {theme === 'dark' ? (
              <span className="material-symbols-outlined text-[16px] text-white">dark_mode</span>
            ) : (
              <span className="material-symbols-outlined text-[16px] text-black">light_mode</span>
            )}
          </div>
        </button>
      </header>

      {/* Main card — pages render inside */}
      <main className="card z-10 flex flex-col">
        <Outlet context={{ statusText }} />
      </main>
    </div>
  );
}
