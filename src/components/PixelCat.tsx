import { cn } from '@/lib/utils';

type RobotPose = 'idle' | 'blink' | 'tail-wag' | 'sleep' | 'loading';

interface PixelCatProps {
  pose?: RobotPose;
  size?: number;
  className?: string;
}

/**
 * Pixel art robot drawn as inline SVG on a 32x32 grid.
 * Each pose is a separate <g> group; only the active pose is rendered.
 */
const poseAnimation: Record<RobotPose, string> = {
  'idle': 'animate-[cat-idle_0.8s_steps(4)_infinite]',
  'blink': 'animate-[cat-blink_3s_steps(2)_infinite]',
  'tail-wag': 'animate-[cat-tail-wag_0.4s_steps(4)_infinite]',
  'sleep': 'animate-[cat-sleep_2s_steps(2)_infinite]',
  'loading': 'animate-[cat-loading_0.3s_steps(2)_infinite]',
};

export function PixelCat({ pose = 'idle', size = 48, className }: PixelCatProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={cn('shrink-0', poseAnimation[pose], className)}
      aria-label={`Pixel robot (${pose})`}
      role="img"
    >
      {/* IDLE — standing, eyes glowing, antenna still */}
      {pose === 'idle' && (
        <g data-pose="idle">
          {/* Antenna */}
          <rect x="15" y="1" width="2" height="3" fill="var(--robot-accent)" />
          <rect x="14" y="0" width="4" height="1" fill="var(--robot-glow)" />
          {/* Head */}
          <rect x="7" y="4" width="18" height="12" fill="var(--robot-body)" />
          {/* Face plate */}
          <rect x="9" y="6" width="14" height="8" fill="var(--robot-face)" />
          {/* Eyes — glowing squares */}
          <rect x="11" y="8" width="3" height="3" fill="var(--robot-glow)" />
          <rect x="18" y="8" width="3" height="3" fill="var(--robot-glow)" />
          {/* Eye inner dark */}
          <rect x="12" y="9" width="1" height="1" fill="var(--robot-dark)" />
          <rect x="19" y="9" width="1" height="1" fill="var(--robot-dark)" />
          {/* Mouth — small line */}
          <rect x="13" y="12" width="6" height="1" fill="var(--robot-accent)" />
          {/* Neck */}
          <rect x="13" y="16" width="6" height="2" fill="var(--robot-dark)" />
          {/* Body */}
          <rect x="8" y="18" width="16" height="8" fill="var(--robot-body)" />
          {/* Chest panel */}
          <rect x="11" y="20" width="10" height="4" fill="var(--robot-face)" />
          {/* Chest lights */}
          <rect x="12" y="21" width="2" height="2" fill="var(--robot-glow)" />
          <rect x="18" y="21" width="2" height="2" fill="var(--robot-accent)" />
          {/* Arms */}
          <rect x="4" y="18" width="4" height="2" fill="var(--robot-body)" />
          <rect x="24" y="18" width="4" height="2" fill="var(--robot-body)" />
          {/* Hands */}
          <rect x="3" y="20" width="3" height="3" fill="var(--robot-accent)" />
          <rect x="26" y="20" width="3" height="3" fill="var(--robot-accent)" />
          {/* Legs */}
          <rect x="10" y="26" width="4" height="3" fill="var(--robot-dark)" />
          <rect x="18" y="26" width="4" height="3" fill="var(--robot-dark)" />
          {/* Feet */}
          <rect x="9" y="29" width="5" height="1" fill="var(--robot-body)" />
          <rect x="18" y="29" width="5" height="1" fill="var(--robot-body)" />
        </g>
      )}

      {/* BLINK — eyes dimmed, confused expression */}
      {pose === 'blink' && (
        <g data-pose="blink">
          {/* Antenna */}
          <rect x="15" y="1" width="2" height="3" fill="var(--robot-accent)" />
          <rect x="14" y="0" width="4" height="1" fill="var(--robot-glow)" opacity="0.4" />
          {/* Head */}
          <rect x="7" y="4" width="18" height="12" fill="var(--robot-body)" />
          {/* Face plate */}
          <rect x="9" y="6" width="14" height="8" fill="var(--robot-face)" />
          {/* Eyes — dimmed horizontal lines */}
          <rect x="11" y="9" width="3" height="1" fill="var(--robot-glow)" opacity="0.4" />
          <rect x="18" y="9" width="3" height="1" fill="var(--robot-glow)" opacity="0.4" />
          {/* Mouth — small square (surprised) */}
          <rect x="14" y="12" width="4" height="2" fill="var(--robot-accent)" />
          {/* Neck */}
          <rect x="13" y="16" width="6" height="2" fill="var(--robot-dark)" />
          {/* Body */}
          <rect x="8" y="18" width="16" height="8" fill="var(--robot-body)" />
          <rect x="11" y="20" width="10" height="4" fill="var(--robot-face)" />
          <rect x="12" y="21" width="2" height="2" fill="var(--robot-glow)" opacity="0.3" />
          <rect x="18" y="21" width="2" height="2" fill="var(--robot-accent)" opacity="0.3" />
          {/* Arms */}
          <rect x="4" y="18" width="4" height="2" fill="var(--robot-body)" />
          <rect x="24" y="18" width="4" height="2" fill="var(--robot-body)" />
          <rect x="3" y="20" width="3" height="3" fill="var(--robot-accent)" />
          <rect x="26" y="20" width="3" height="3" fill="var(--robot-accent)" />
          {/* Legs */}
          <rect x="10" y="26" width="4" height="3" fill="var(--robot-dark)" />
          <rect x="18" y="26" width="4" height="3" fill="var(--robot-dark)" />
          <rect x="9" y="29" width="5" height="1" fill="var(--robot-body)" />
          <rect x="18" y="29" width="5" height="1" fill="var(--robot-body)" />
        </g>
      )}

      {/* TAIL-WAG — happy, antenna glowing bright, chest lights active */}
      {pose === 'tail-wag' && (
        <g data-pose="tail-wag">
          {/* Antenna — bright */}
          <rect x="15" y="1" width="2" height="3" fill="var(--robot-accent)" />
          <rect x="13" y="0" width="6" height="1" fill="var(--robot-glow)" />
          <rect x="14" y="0" width="4" height="1" fill="var(--robot-white)" />
          {/* Head */}
          <rect x="7" y="4" width="18" height="12" fill="var(--robot-body)" />
          {/* Face plate */}
          <rect x="9" y="6" width="14" height="8" fill="var(--robot-face)" />
          {/* Eyes — happy arcs */}
          <rect x="11" y="8" width="3" height="1" fill="var(--robot-glow)" />
          <rect x="11" y="9" width="1" height="2" fill="var(--robot-glow)" />
          <rect x="13" y="9" width="1" height="2" fill="var(--robot-glow)" />
          <rect x="18" y="8" width="3" height="1" fill="var(--robot-glow)" />
          <rect x="18" y="9" width="1" height="2" fill="var(--robot-glow)" />
          <rect x="20" y="9" width="1" height="2" fill="var(--robot-glow)" />
          {/* Mouth — smile */}
          <rect x="13" y="12" width="6" height="1" fill="var(--robot-glow)" />
          <rect x="12" y="11" width="1" height="1" fill="var(--robot-glow)" />
          <rect x="19" y="11" width="1" height="1" fill="var(--robot-glow)" />
          {/* Neck */}
          <rect x="13" y="16" width="6" height="2" fill="var(--robot-dark)" />
          {/* Body */}
          <rect x="8" y="18" width="16" height="8" fill="var(--robot-body)" />
          <rect x="11" y="20" width="10" height="4" fill="var(--robot-face)" />
          {/* Chest lights — all bright */}
          <rect x="12" y="21" width="2" height="2" fill="var(--robot-glow)" />
          <rect x="18" y="21" width="2" height="2" fill="var(--robot-glow)" />
          <rect x="15" y="21" width="2" height="2" fill="var(--robot-accent)" />
          {/* Arms — raised */}
          <rect x="4" y="16" width="4" height="2" fill="var(--robot-body)" />
          <rect x="24" y="16" width="4" height="2" fill="var(--robot-body)" />
          <rect x="3" y="14" width="3" height="3" fill="var(--robot-accent)" />
          <rect x="26" y="14" width="3" height="3" fill="var(--robot-accent)" />
          {/* Legs */}
          <rect x="10" y="26" width="4" height="3" fill="var(--robot-dark)" />
          <rect x="18" y="26" width="4" height="3" fill="var(--robot-dark)" />
          <rect x="9" y="29" width="5" height="1" fill="var(--robot-body)" />
          <rect x="18" y="29" width="5" height="1" fill="var(--robot-body)" />
        </g>
      )}

      {/* SLEEP — powered down, dim eyes, curled/sitting, Zzz */}
      {pose === 'sleep' && (
        <g data-pose="sleep">
          {/* Antenna — dim */}
          <rect x="15" y="1" width="2" height="3" fill="var(--robot-accent)" opacity="0.3" />
          <rect x="14" y="0" width="4" height="1" fill="var(--robot-glow)" opacity="0.2" />
          {/* Head — tilted */}
          <rect x="7" y="6" width="18" height="12" fill="var(--robot-body)" />
          {/* Face plate */}
          <rect x="9" y="8" width="14" height="8" fill="var(--robot-face)" />
          {/* Eyes — closed lines */}
          <rect x="11" y="11" width="3" height="1" fill="var(--robot-glow)" opacity="0.2" />
          <rect x="18" y="11" width="3" height="1" fill="var(--robot-glow)" opacity="0.2" />
          {/* Mouth — off */}
          <rect x="13" y="14" width="6" height="1" fill="var(--robot-dark)" opacity="0.3" />
          {/* Neck */}
          <rect x="13" y="18" width="6" height="2" fill="var(--robot-dark)" />
          {/* Body — sitting/curled */}
          <rect x="8" y="20" width="16" height="6" fill="var(--robot-body)" />
          <rect x="11" y="22" width="10" height="2" fill="var(--robot-face)" />
          {/* Chest lights — off */}
          <rect x="12" y="22" width="2" height="1" fill="var(--robot-dark)" opacity="0.3" />
          <rect x="18" y="22" width="2" height="1" fill="var(--robot-dark)" opacity="0.3" />
          {/* Arms — resting */}
          <rect x="4" y="22" width="4" height="2" fill="var(--robot-body)" />
          <rect x="24" y="22" width="4" height="2" fill="var(--robot-body)" />
          <rect x="3" y="24" width="3" height="2" fill="var(--robot-accent)" />
          <rect x="26" y="24" width="3" height="2" fill="var(--robot-accent)" />
          {/* Legs — folded */}
          <rect x="10" y="26" width="4" height="2" fill="var(--robot-dark)" />
          <rect x="18" y="26" width="4" height="2" fill="var(--robot-dark)" />
          <rect x="9" y="28" width="5" height="1" fill="var(--robot-body)" />
          <rect x="18" y="28" width="5" height="1" fill="var(--robot-body)" />
          {/* Zzz */}
          <rect x="22" y="10" width="2" height="2" fill="var(--robot-glow)" opacity="0.3" />
          <rect x="25" y="7" width="2" height="2" fill="var(--robot-glow)" opacity="0.2" />
          <rect x="20" y="4" width="2" height="2" fill="var(--robot-glow)" opacity="0.15" />
        </g>
      )}

      {/* LOADING — processing, eyes scanning, antenna pulsing */}
      {pose === 'loading' && (
        <g data-pose="loading">
          {/* Antenna — pulsing */}
          <rect x="15" y="1" width="2" height="3" fill="var(--robot-glow)" />
          <rect x="13" y="0" width="6" height="1" fill="var(--robot-glow)" />
          {/* Head */}
          <rect x="7" y="4" width="18" height="12" fill="var(--robot-body)" />
          {/* Face plate */}
          <rect x="9" y="6" width="14" height="8" fill="var(--robot-face)" />
          {/* Eyes — scanning (one bright, one dim) */}
          <rect x="11" y="8" width="3" height="3" fill="var(--robot-glow)" />
          <rect x="18" y="8" width="3" height="3" fill="var(--robot-glow)" opacity="0.3" />
          <rect x="12" y="9" width="1" height="1" fill="var(--robot-dark)" />
          {/* Mouth — processing line */}
          <rect x="12" y="12" width="3" height="1" fill="var(--robot-glow)" />
          <rect x="16" y="12" width="3" height="1" fill="var(--robot-accent)" />
          <rect x="14" y="13" width="3" height="1" fill="var(--robot-glow)" opacity="0.5" />
          {/* Neck */}
          <rect x="13" y="16" width="6" height="2" fill="var(--robot-dark)" />
          {/* Body */}
          <rect x="8" y="18" width="16" height="8" fill="var(--robot-body)" />
          <rect x="11" y="20" width="10" height="4" fill="var(--robot-face)" />
          {/* Chest lights — alternating */}
          <rect x="12" y="21" width="2" height="2" fill="var(--robot-glow)" />
          <rect x="18" y="21" width="2" height="2" fill="var(--robot-glow)" opacity="0.3" />
          <rect x="15" y="21" width="2" height="2" fill="var(--robot-accent)" />
          {/* Arms */}
          <rect x="4" y="18" width="4" height="2" fill="var(--robot-body)" />
          <rect x="24" y="18" width="4" height="2" fill="var(--robot-body)" />
          <rect x="3" y="20" width="3" height="3" fill="var(--robot-accent)" />
          <rect x="26" y="20" width="3" height="3" fill="var(--robot-accent)" />
          {/* Legs — bouncing */}
          <rect x="10" y="26" width="4" height="3" fill="var(--robot-dark)" />
          <rect x="18" y="26" width="4" height="3" fill="var(--robot-dark)" />
          <rect x="9" y="29" width="5" height="1" fill="var(--robot-body)" />
          <rect x="18" y="29" width="5" height="1" fill="var(--robot-body)" />
        </g>
      )}
    </svg>
  );
}

export default PixelCat;
