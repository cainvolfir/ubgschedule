import { cn } from '@/lib/utils';
import { PixelCat } from './PixelCat';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {steps.map((label, idx) => {
        const isCompleted = idx < currentStep;
        const isActive = idx === currentStep;
        const isFuture = idx > currentStep;

        return (
          <div key={label} className="flex items-center gap-1.5">
            {/* Step dot */}
            <div
              className={cn(
                'relative flex h-8 w-8 items-center justify-center rounded-lg border-2 transition-all duration-300',
                isActive && 'border-[var(--primary)] bg-primary/20 shadow-glow scale-110',
                isCompleted && 'border-[var(--success)] bg-success shadow-sm',
                isFuture && 'border-[var(--border)] bg-muted',
              )}
            >
              {isActive ? (
                <PixelCat pose="tail-wag" size={20} />
              ) : isCompleted ? (
                <svg width="14" height="14" viewBox="0 0 16 16" className="text-success-foreground">
                  <path d="M13.5 4.5L6.5 11.5L2.5 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              ) : (
                <span className="text-[8px] pixel-font text-muted-foreground font-bold">{idx + 1}</span>
              )}

              {/* Pulse ring for active */}
              {isActive && (
                <div className="absolute inset-0 rounded-lg border-2 border-[var(--primary)] animate-ping opacity-20" />
              )}
            </div>

            {/* Connector */}
            {idx < steps.length - 1 && (
              <div className="relative h-0.5 w-6 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'absolute inset-0 rounded-full bg-gradient-to-r from-success to-success transition-all duration-500',
                    isCompleted ? 'w-full' : 'w-0',
                  )}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Step label */}
      <span className="pixel-font ml-2 hidden text-[8px] text-muted-foreground sm:inline">
        Step {currentStep + 1}/{steps.length}
      </span>
    </div>
  );
}

export default StepIndicator;
