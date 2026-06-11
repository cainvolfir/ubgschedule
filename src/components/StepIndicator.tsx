import { cn } from '@/lib/utils';
import { PixelCat } from './PixelCat';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

/**
 * Visual progress bar for the wizard steps.
 * Shows dots connected by lines with the active step highlighted by a cat face.
 */
export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {steps.map((label, idx) => {
        const isCompleted = idx < currentStep;
        const isActive = idx === currentStep;
        const isFuture = idx > currentStep;

        return (
          <div key={label} className="flex items-center gap-1">
            {/* Step dot */}
            <div
              className={cn(
                'relative flex h-6 w-6 items-center justify-center border-2 transition-all',
                isActive && 'border-cyan-400 bg-cyan-400/10',
                isCompleted && 'border-green-500 bg-green-500/10',
                isFuture && 'border-zinc-300 bg-transparent dark:border-zinc-600',
              )}
            >
              {isActive ? (
                <PixelCat pose="tail-wag" size={16} />
              ) : isCompleted ? (
                <svg width="12" height="12" viewBox="0 0 12 12" className="text-green-500">
                  <rect x="2" y="5" width="3" height="2" fill="currentColor" />
                  <rect x="4" y="7" width="2" height="2" fill="currentColor" />
                  <rect x="5" y="6" width="2" height="2" fill="currentColor" />
                  <rect x="6" y="5" width="2" height="2" fill="currentColor" />
                  <rect x="7" y="3" width="3" height="2" fill="currentColor" />
                </svg>
              ) : (
                <div className="h-1.5 w-1.5 bg-zinc-300 dark:bg-zinc-600" />
              )}
            </div>

            {/* Connector line */}
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-3 transition-all',
                  isCompleted ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-600',
                )}
              />
            )}
          </div>
        );
      })}

      {/* Step label — visible on sm+ */}
      <span className="pixel-font ml-2 hidden text-[8px] text-zinc-400 sm:inline">
        Step {currentStep + 1}/{steps.length}
      </span>
    </div>
  );
}

export default StepIndicator;
