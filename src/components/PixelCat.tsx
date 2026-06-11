import { cn } from '@/lib/utils';

type CatPose = 'idle' | 'blink' | 'tail-wag' | 'sleep' | 'loading';

interface PixelCatProps {
  pose?: CatPose;
  size?: number;
  className?: string;
}

/**
 * Pixel art cat drawn as inline SVG on a 32x32 grid.
 * Each pose is a separate <g> group; only the active pose is rendered.
 */
export function PixelCat({ pose = 'idle', size = 48, className }: PixelCatProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={cn('shrink-0', className)}
      aria-label={`Pixel cat (${pose})`}
      role="img"
    >
      {/* IDLE — standing, eyes open, tail still */}
      {pose === 'idle' && (
        <g data-pose="idle">
          {/* Ears */}
          <rect x="7" y="2" width="4" height="5" fill="var(--cat-body)" />
          <rect x="21" y="2" width="4" height="5" fill="var(--cat-body)" />
          {/* Inner ears */}
          <rect x="8" y="3" width="2" height="3" fill="var(--cat-ear-inner)" />
          <rect x="22" y="3" width="2" height="3" fill="var(--cat-ear-inner)" />
          {/* Head */}
          <rect x="6" y="6" width="20" height="12" fill="var(--cat-body)" />
          {/* Eyes */}
          <rect x="10" y="10" width="3" height="4" fill="var(--cat-eye)" />
          <rect x="19" y="10" width="3" height="4" fill="var(--cat-eye)" />
          {/* Eye shine */}
          <rect x="11" y="10" width="1" height="1" fill="var(--cat-white)" />
          <rect x="20" y="10" width="1" height="1" fill="var(--cat-white)" />
          {/* Nose */}
          <rect x="15" y="14" width="2" height="2" fill="var(--cat-nose)" />
          {/* Mouth */}
          <rect x="13" y="16" width="2" height="1" fill="var(--cat-dark)" />
          <rect x="17" y="16" width="2" height="1" fill="var(--cat-dark)" />
          {/* Body */}
          <rect x="9" y="18" width="14" height="8" fill="var(--cat-body)" />
          {/* Belly */}
          <rect x="12" y="20" width="8" height="4" fill="var(--cat-white)" />
          {/* Tail */}
          <rect x="23" y="20" width="3" height="2" fill="var(--cat-body)" />
          <rect x="25" y="18" width="2" height="2" fill="var(--cat-body)" />
          {/* Feet */}
          <rect x="10" y="26" width="3" height="2" fill="var(--cat-dark)" />
          <rect x="19" y="26" width="3" height="2" fill="var(--cat-dark)" />
        </g>
      )}

      {/* BLINK — eyes closed (confused/surprised) */}
      {pose === 'blink' && (
        <g data-pose="blink">
          {/* Ears */}
          <rect x="7" y="2" width="4" height="5" fill="var(--cat-body)" />
          <rect x="21" y="2" width="4" height="5" fill="var(--cat-body)" />
          <rect x="8" y="3" width="2" height="3" fill="var(--cat-ear-inner)" />
          <rect x="22" y="3" width="2" height="3" fill="var(--cat-ear-inner)" />
          {/* Head */}
          <rect x="6" y="6" width="20" height="12" fill="var(--cat-body)" />
          {/* Eyes — closed (horizontal lines) */}
          <rect x="10" y="12" width="3" height="1" fill="var(--cat-eye)" />
          <rect x="19" y="12" width="3" height="1" fill="var(--cat-eye)" />
          {/* Nose */}
          <rect x="15" y="14" width="2" height="2" fill="var(--cat-nose)" />
          {/* Mouth — small o */}
          <rect x="15" y="16" width="2" height="2" fill="var(--cat-dark)" />
          {/* Body */}
          <rect x="9" y="18" width="14" height="8" fill="var(--cat-body)" />
          <rect x="12" y="20" width="8" height="4" fill="var(--cat-white)" />
          {/* Tail — question mark style */}
          <rect x="23" y="20" width="3" height="2" fill="var(--cat-body)" />
          <rect x="25" y="18" width="2" height="2" fill="var(--cat-body)" />
          {/* Feet */}
          <rect x="10" y="26" width="3" height="2" fill="var(--cat-dark)" />
          <rect x="19" y="26" width="3" height="2" fill="var(--cat-dark)" />
        </g>
      )}

      {/* TAIL-WAG — happy, tail raised */}
      {pose === 'tail-wag' && (
        <g data-pose="tail-wag">
          {/* Ears — perked up */}
          <rect x="7" y="1" width="4" height="5" fill="var(--cat-body)" />
          <rect x="21" y="1" width="4" height="5" fill="var(--cat-body)" />
          <rect x="8" y="2" width="2" height="3" fill="var(--cat-ear-inner)" />
          <rect x="22" y="2" width="2" height="3" fill="var(--cat-ear-inner)" />
          {/* Head */}
          <rect x="6" y="5" width="20" height="12" fill="var(--cat-body)" />
          {/* Eyes — happy (upside-down U shape) */}
          <rect x="10" y="9" width="3" height="1" fill="var(--cat-eye)" />
          <rect x="10" y="10" width="1" height="2" fill="var(--cat-eye)" />
          <rect x="12" y="10" width="1" height="2" fill="var(--cat-eye)" />
          <rect x="19" y="9" width="3" height="1" fill="var(--cat-eye)" />
          <rect x="19" y="10" width="1" height="2" fill="var(--cat-eye)" />
          <rect x="21" y="10" width="1" height="2" fill="var(--cat-eye)" />
          {/* Nose */}
          <rect x="15" y="13" width="2" height="2" fill="var(--cat-nose)" />
          {/* Mouth — smile */}
          <rect x="14" y="15" width="4" height="1" fill="var(--cat-dark)" />
          {/* Body */}
          <rect x="9" y="17" width="14" height="8" fill="var(--cat-body)" />
          <rect x="12" y="19" width="8" height="4" fill="var(--cat-white)" />
          {/* Tail — raised up */}
          <rect x="23" y="16" width="3" height="2" fill="var(--cat-body)" />
          <rect x="25" y="14" width="2" height="2" fill="var(--cat-body)" />
          <rect x="26" y="12" width="2" height="2" fill="var(--cat-body)" />
          {/* Feet */}
          <rect x="10" y="25" width="3" height="2" fill="var(--cat-dark)" />
          <rect x="19" y="25" width="3" height="2" fill="var(--cat-dark)" />
        </g>
      )}

      {/* SLEEP — curled up, eyes closed, Zzz */}
      {pose === 'sleep' && (
        <g data-pose="sleep">
          {/* Body — curled */}
          <rect x="8" y="12" width="16" height="10" rx="0" fill="var(--cat-body)" />
          {/* Head resting */}
          <rect x="6" y="14" width="10" height="8" fill="var(--cat-body)" />
          {/* Ears — droopy */}
          <rect x="6" y="12" width="3" height="3" fill="var(--cat-body)" />
          <rect x="13" y="12" width="3" height="3" fill="var(--cat-body)" />
          {/* Eyes — closed */}
          <rect x="8" y="17" width="3" height="1" fill="var(--cat-eye)" />
          <rect x="12" y="17" width="3" height="1" fill="var(--cat-eye)" />
          {/* Nose */}
          <rect x="10" y="19" width="2" height="1" fill="var(--cat-nose)" />
          {/* Tail — wrapped around body */}
          <rect x="22" y="14" width="2" height="6" fill="var(--cat-body)" />
          <rect x="20" y="12" width="4" height="2" fill="var(--cat-body)" />
          {/* Zzz */}
          <rect x="18" y="8" width="2" height="2" fill="var(--cat-eye)" opacity="0.6" />
          <rect x="21" y="5" width="2" height="2" fill="var(--cat-eye)" opacity="0.4" />
          <rect x="24" y="3" width="2" height="2" fill="var(--cat-eye)" opacity="0.2" />
        </g>
      )}

      {/* LOADING — bobbing, eyes open, looking around */}
      {pose === 'loading' && (
        <g data-pose="loading">
          {/* Ears */}
          <rect x="7" y="2" width="4" height="5" fill="var(--cat-body)" />
          <rect x="21" y="2" width="4" height="5" fill="var(--cat-body)" />
          <rect x="8" y="3" width="2" height="3" fill="var(--cat-ear-inner)" />
          <rect x="22" y="3" width="2" height="3" fill="var(--cat-ear-inner)" />
          {/* Head */}
          <rect x="6" y="6" width="20" height="12" fill="var(--cat-body)" />
          {/* Eyes — looking left */}
          <rect x="10" y="10" width="3" height="3" fill="var(--cat-eye)" />
          <rect x="19" y="10" width="3" height="3" fill="var(--cat-eye)" />
          {/* Pupils — shifted left */}
          <rect x="10" y="11" width="1" height="1" fill="var(--cat-white)" />
          <rect x="19" y="11" width="1" height="1" fill="var(--cat-white)" />
          {/* Nose */}
          <rect x="15" y="14" width="2" height="2" fill="var(--cat-nose)" />
          {/* Mouth — small */}
          <rect x="15" y="16" width="2" height="1" fill="var(--cat-dark)" />
          {/* Body */}
          <rect x="9" y="18" width="14" height="8" fill="var(--cat-body)" />
          <rect x="12" y="20" width="8" height="4" fill="var(--cat-white)" />
          {/* Tail — wagging */}
          <rect x="23" y="18" width="2" height="2" fill="var(--cat-body)" />
          <rect x="24" y="16" width="2" height="2" fill="var(--cat-body)" />
          {/* Feet — bouncing */}
          <rect x="10" y="26" width="3" height="2" fill="var(--cat-dark)" />
          <rect x="19" y="26" width="3" height="2" fill="var(--cat-dark)" />
        </g>
      )}
    </svg>
  );
}

export default PixelCat;
