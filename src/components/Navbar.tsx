import { ThemeSwitcher } from './ThemeSwitcher';
import { PixelCat } from './PixelCat';
import { StepIndicator } from './StepIndicator';

const WIZARD_STEPS = ['Upload Theory', 'Upload Practical', 'View Schedule'];

interface NavbarProps {
  currentStep?: number;
}

export function Navbar({ currentStep }: NavbarProps) {
  return (
    <nav className="border-b-2 border-black dark:border-zinc-700">
      <div className="mx-auto flex h-14 items-center justify-between px-3 sm:h-16 sm:px-4 lg:px-8">
        {/* Left: Cat + Title */}
        <div className="flex items-center gap-2">
          <div className="animate-cat-bob">
            <PixelCat pose="idle" size={28} />
          </div>
          <h1 className="pixel-font text-[10px] leading-none tracking-wide sm:text-xs">
            UBG Schedule
          </h1>
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

      {/* Mobile step indicator (below navbar) */}
      {currentStep !== undefined && (
        <div className="flex items-center justify-center border-t border-zinc-200 px-3 py-1.5 dark:border-zinc-800 md:hidden">
          <StepIndicator steps={WIZARD_STEPS} currentStep={currentStep} />
        </div>
      )}
    </nav>
  );
}

export default Navbar;
