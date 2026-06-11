import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PixelCat } from './PixelCat';

type CatPose = 'idle' | 'blink' | 'tail-wag' | 'sleep' | 'loading';

interface CatStateProps {
  pose: CatPose;
  size?: number;
  message?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * Reusable cat + message state component for empty, loading, error, and success states.
 */
export function CatState({ pose, size = 64, message, children, className }: CatStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-6', className)}>
      <div
        className={cn(
          pose === 'loading' && 'animate-cat-loading',
          pose === 'sleep' && 'animate-cat-sleep',
          pose === 'idle' && 'animate-cat-bob',
          pose === 'tail-wag' && 'animate-cat-tail-wag',
        )}
      >
        <PixelCat pose={pose} size={size} />
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
