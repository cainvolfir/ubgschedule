import { cn } from '@/lib/utils';
import { UBGMascot } from './UBGMascot';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <ol className={cn('flex items-center gap-1.5', className)} aria-label="Progress">
      {steps.map((label, idx) => {
        const isCompleted = idx < currentStep;
        const isActive = idx === currentStep;
        const isFuture = idx > currentStep;

        return (
          <li key={label} className="flex items-center gap-1.5" aria-current={isActive ? 'step' : undefined}>
            {/* Step dot */}
            <div
              className={cn(
                'relative flex h-8 w-8 items-center justify-center rounded-lg border-2 transition-all duration-300 overflow-hidden',
                isActive && 'border-[var(--primary)] bg-primary/10 shadow-glow scale-110',
                isCompleted && 'border-[var(--success)] bg-success/10 shadow-sm',
                isFuture && 'border-[var(--border)] bg-muted/50',
              )}
              aria-label={`${label}${isActive ? ' (current)' : isCompleted ? ' (completed)' : ''}`}
            >
              {isActive ? (
                <>
                  <div className="absolute inset-0 rounded-lg bg-primary/15 animate-pulse" />
                  <UBGMascot pose="tail-wag" size={24} />
                </>
              ) : isCompleted ? (
                <Check size={14} className="text-success" strokeWidth={3} />
              ) : (
                <span className="text-[8px] pixel-font text-muted-foreground font-bold">{idx + 1}</span>
              )}

              {/* Pulse ring for active */}
              {isActive && (
                <div className="absolute inset-0 rounded-lg border-2 border-[var(--primary)] animate-ping opacity-20" />
              )}
            </div>

            {/* Step label (visible on wider screens) */}
            <span className={cn(
              'hidden lg:inline pixel-font text-[7px] transition-colors duration-300',
              isActive ? 'text-primary font-bold' : isCompleted ? 'text-success' : 'text-muted-foreground',
            )}>
              {label}
            </span>

            {/* Connector */}
            {idx < steps.length - 1 && (
              <div className="relative h-0.5 w-6 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div
                  className={cn(
                    'absolute inset-0 rounded-full bg-gradient-to-r from-success to-success transition-all duration-500',
                    isCompleted ? 'w-full' : 'w-0',
                  )}
                />
              </div>
            )}
          </li>
        );
      })}

    </ol>
  );
}
