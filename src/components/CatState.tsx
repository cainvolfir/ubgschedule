import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { UBGMascot } from './UBGMascot';

type UgoPose = 'idle' | 'blink' | 'tail-wag' | 'sleep' | 'loading';

interface CatStateProps {
  pose: UgoPose;
  size?: number;
  message?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * Reusable UGO mascot + message state component for empty, loading, error, and success states.
 */
export function CatState({ pose, size = 64, message, children, className }: CatStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-6', className)}>
      <div>
        <UBGMascot pose={pose} size={size} />
      </div>
      {message && (
        <p className="pixel-font text-center text-[9px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          {message}
        </p>
      )}
      {children && <div className="mt-2 flex flex-col items-center gap-2">{children}</div>}
    </div>
  );
}

export default CatState;
