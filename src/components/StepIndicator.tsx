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
                'relative flex h-8 w-8 items-center justify-center rounded-lg border transition-colors duration-200 overflow-hidden',
                isActive && 'border-[var(--primary)] bg-[var(--primary-subtle)]',
                isCompleted && 'border-[var(--success)] bg-[var(--success)]/10',
                isFuture && 'border-[var(--border)] bg-[var(--muted)]',
              )}
              aria-label={`${label}${isActive ? ' (current)' : isCompleted ? ' (completed)' : ''}`}
            >
              {isActive ? (
                <UBGMascot pose="tail-wag" size={24} />
              ) : isCompleted ? (
                <Check size={14} className="text-success" strokeWidth={3} />
              ) : (
                <span className="text-[10px] font-semibold text-muted-foreground">{idx + 1}</span>
              )}
            </div>

            {/* Step label (visible on wider screens) */}
            <span className={cn(
              'hidden lg:inline text-[10px] font-medium transition-colors duration-200',
              isActive ? 'text-primary' : isCompleted ? 'text-success' : 'text-muted-foreground',
            )}>
              {label}
            </span>

            {/* Connector */}
            {idx < steps.length - 1 && (
              <div className="relative h-0.5 w-6 overflow-hidden rounded-full bg-[var(--muted)]" aria-hidden="true">
                <div
                  className={cn(
                    'absolute inset-0 rounded-full bg-[var(--success)] transition-all duration-300',
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
