import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { StepIndicator } from '../components/StepIndicator';

const WIZARD_STEPS = ['Upload Theory', 'Upload Practical', 'View Schedule'];

interface RootLayoutProps {
  currentStep?: number;
}

export function RootLayout({ currentStep }: RootLayoutProps) {
  const showWizard = currentStep !== undefined;

  return (
    <div className="min-h-dvh bg-background text-foreground relative overflow-hidden flex flex-col">
      {/* Decorative background orbs */}
      <div className="fixed top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" aria-hidden="true" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-secondary/5 blur-[120px] pointer-events-none" aria-hidden="true" />

      {/* Navbar */}
      <Navbar />

      {/* Step indicator bar (below navbar, above content) */}
      {showWizard && (
        <div
          className="relative z-20 border-b border-[var(--border)] bg-card/40 backdrop-blur-sm"
          role="navigation"
          aria-label="Wizard steps"
        >
          <div className="mx-auto flex items-center justify-center px-3 py-2 sm:px-4 lg:px-8">
            <StepIndicator steps={WIZARD_STEPS} currentStep={currentStep} />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="relative z-10 flex-1 px-0" id="main-content">
        <Outlet />
      </main>

      {/* Footer with step counter */}
      {showWizard && (
        <footer
          className="relative z-20 border-t border-[var(--border)] bg-card/40 backdrop-blur-sm py-3"
          aria-label="Step progress"
        >
          <div className="mx-auto flex items-center justify-center px-3 sm:px-4 lg:px-8">
            <span className="pixel-font text-[8px] text-muted-foreground">
              Step {currentStep + 1} of {WIZARD_STEPS.length}
              {currentStep === 0 && ' — Upload your theory schedule'}
              {currentStep === 1 && ' — Upload your practical schedule'}
              {currentStep === 2 && ' — View your generated schedule'}
            </span>
          </div>
        </footer>
      )}
    </div>
  );
}
