import { ThemeSwitcher } from './ThemeSwitcher';
import { PixelCat } from './PixelCat';
import { StepIndicator } from './StepIndicator';

const WIZARD_STEPS = ['Upload Theory', 'Upload Practical', 'View Schedule'];

interface NavbarProps {
  currentStep?: number;
}

export function Navbar({ currentStep }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 border-b-2 border-[var(--border)] bg-card-solid">
      <div className="mx-auto flex h-14 items-center justify-between px-3 sm:h-16 sm:px-4 lg:px-8">
        {/* Left: Cat + Title */}
        <div className="flex items-center gap-2.5">
          <div className="animate-cat-bob" style={{ filter: 'drop-shadow(0 0 6px var(--robot-glow))' }}>
            <PixelCat pose="idle" size={28} />
          </div>
          <div>
            <h1 className="pixel-font text-[10px] leading-none tracking-wide sm:text-xs text-foreground">
              UBG Schedule
            </h1>
          </div>
        </div>

        {/* Center: Step indicator (desktop) */}
        {currentStep !== undefined && (
          <div className="hidden md:block">
            <StepIndicator steps={WIZARD_STEPS} currentStep={currentStep} />
          </div>
        )}

        {/* Right: Theme switcher */}
        <ThemeSwitcher />
      </div>

      {/* Mobile step indicator */}
      {currentStep !== undefined && (
        <div className="flex items-center justify-center border-t-2 border-[var(--border)] px-3 py-1.5 md:hidden bg-card-solid">
          <StepIndicator steps={WIZARD_STEPS} currentStep={currentStep} />
        </div>
      )}
    </nav>
  );
}

export default Navbar;
