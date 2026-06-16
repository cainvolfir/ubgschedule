import { ThemeSwitcher } from './ThemeSwitcher';
import { UBGMascot } from './UBGMascot';
import { StepIndicator } from './StepIndicator';

const WIZARD_STEPS = ['Upload Theory', 'Upload Practical', 'View Schedule'];

interface NavbarProps {
  currentStep?: number;
}

export function Navbar({ currentStep }: NavbarProps) {
  return (
    <nav
      className="sticky top-0 z-50 border-b border-[var(--border)] bg-card/80 backdrop-blur-xl"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-14 items-center justify-between px-3 sm:h-16 sm:px-4 lg:px-8">
        {/* Left: Cat + Title */}
        <div className="flex items-center gap-2.5">
          <div
            className="animate-cat-bob"
            style={{ filter: 'drop-shadow(0 0 6px var(--robot-glow))' }}
          >
            <UBGMascot pose="idle" size={28} />
          </div>
          <div>
            <h1 className="pixel-font text-[10px] leading-none tracking-wide sm:text-xs text-foreground">
              UBG Schedule
            </h1>
          </div>
        </div>

        {/* Center: Step indicator (visible when wizard is active) */}
        {currentStep !== undefined && (
          <div className="hidden md:block" role="navigation" aria-label="Wizard steps">
            <StepIndicator steps={WIZARD_STEPS} currentStep={currentStep} />
          </div>
        )}

        {/* Right: Theme switcher */}
        <ThemeSwitcher />
      </div>

      {/* Mobile step indicator */}
      {currentStep !== undefined && (
        <div
          className="flex items-center justify-center border-t border-[var(--border)] px-3 py-1.5 md:hidden bg-card/50 backdrop-blur-sm"
          role="navigation"
          aria-label="Wizard steps (mobile)"
        >
          <StepIndicator steps={WIZARD_STEPS} currentStep={currentStep} />
        </div>
      )}
    </nav>
  );
}

export default Navbar;
