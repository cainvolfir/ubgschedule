import { cn } from '@/lib/utils';

type UgoPose = 'idle' | 'blink' | 'tail-wag' | 'sleep' | 'loading';

const poseAnimation: Record<UgoPose, string> = {
  'idle': 'animate-[ugo-idle_2s_ease-in-out_infinite]',
  'blink': 'animate-[ugo-blink_3s_ease-in-out_infinite]',
  'tail-wag': 'animate-[ugo-tail-wag_0.6s_ease-in-out_infinite]',
  'sleep': 'animate-[ugo-sleep_3s_ease-in-out_infinite]',
  'loading': 'animate-[ugo-loading_0.5s_ease-in-out_infinite]',
};

interface UBGMascotProps {
  pose?: UgoPose;
  size?: number;
  className?: string;
}

/**
 * UGO — the Bumigora University mascot.
 * Rendered as inline SVG pixel art on a 64x64 canvas.
 *
 * Design: blue antler mascot inspired by the UBG reference image,
 * with a black visor, smile, yellow heart badge, and stubby limbs.
 */
export function UBGMascot({ pose = 'idle', size = 48, className }: UBGMascotProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn('shrink-0', poseAnimation[pose], className)}
      aria-label={`UGO mascot (${pose})`}
      role="img"
      style={{ imageRendering: 'pixelated' }}
      shapeRendering="crispEdges"
    >
      <g transform="translate(10, 2)">
        {pose === 'idle' && <IdleMascot />}
        {pose === 'blink' && <BlinkMascot />}
        {pose === 'tail-wag' && <TailWagMascot />}
        {pose === 'sleep' && <SleepMascot />}
        {pose === 'loading' && <LoadingMascot />}
      </g>
    </svg>
  );
}

function Antlers({ shade = 'var(--robot-dark)' }: { shade?: string }) {
  return (
    <g fill={shade}>
      <rect x="13" y="3" width="2" height="7" />
      <rect x="11" y="2" width="2" height="3" />
      <rect x="15" y="2" width="2" height="3" />
      <rect x="9" y="1" width="2" height="2" />
      <rect x="17" y="1" width="2" height="2" />
      <rect x="25" y="3" width="2" height="7" />
      <rect x="23" y="2" width="2" height="3" />
      <rect x="27" y="2" width="2" height="3" />
      <rect x="21" y="1" width="2" height="2" />
      <rect x="29" y="1" width="2" height="2" />
    </g>
  );
}

function HeadBase({ body = 'var(--robot-body)', dark = 'var(--robot-dark)', face = 'var(--robot-face)' }: { body?: string; dark?: string; face?: string }) {
  return (
    <g>
      <rect x="10" y="9" width="2" height="14" fill={dark} />
      <rect x="32" y="9" width="2" height="14" fill={dark} />
      <rect x="12" y="7" width="2" height="2" fill={face} />
      <rect x="30" y="7" width="2" height="2" fill={face} />
      <rect x="14" y="5" width="16" height="2" fill={body} />
      <rect x="12" y="7" width="20" height="18" fill={body} />
      <rect x="14" y="9" width="16" height="14" fill={body} />
      <rect x="16" y="11" width="12" height="10" fill={body} />
      <rect x="18" y="8" width="8" height="2" fill={body} />
      <rect x="14" y="25" width="16" height="2" fill={dark} />
      <rect x="12" y="23" width="2" height="2" fill={dark} />
      <rect x="30" y="23" width="2" height="2" fill={dark} />
    </g>
  );
}

function HeartBadge({ ring = 'var(--robot-white)', heart = '#ef4444', glow = 'var(--robot-glow)' }: { ring?: string; heart?: string; glow?: string }) {
  return (
    <g>
      <rect x="18" y="32" width="8" height="1" fill={ring} />
      <rect x="17" y="33" width="10" height="4" fill={ring} />
      <rect x="18" y="37" width="8" height="1" fill={ring} />
      <rect x="20" y="34" width="4" height="3" fill={heart} />
      <rect x="19" y="35" width="2" height="1" fill={glow} opacity="0.7" />
    </g>
  );
}

function Shadow() {
  return <rect x="11" y="56" width="22" height="2" fill="#0f172a" opacity="0.18" />;
}

function IdleMascot() {
  return (
    <g>
      <Shadow />
      <Antlers />
      <HeadBase />
      <rect x="13" y="14" width="18" height="5" fill="#111827" />
      <rect x="14" y="15" width="6" height="1" fill="#475569" opacity="0.7" />
      <rect x="17" y="21" width="2" height="1" fill="#111827" />
      <rect x="21" y="21" width="2" height="1" fill="#111827" />
      <rect x="19" y="22" width="2" height="1" fill="#111827" />
      <rect x="18" y="27" width="4" height="2" fill="var(--robot-dark)" />
      <rect x="13" y="29" width="18" height="12" fill="var(--robot-body)" />
      <rect x="15" y="41" width="14" height="3" fill="var(--robot-body)" />
      <rect x="11" y="31" width="2" height="8" fill="var(--robot-body)" />
      <rect x="31" y="31" width="2" height="8" fill="var(--robot-body)" />
      <HeartBadge />
      <rect x="8" y="31" width="3" height="6" fill="var(--robot-body)" />
      <rect x="33" y="31" width="3" height="6" fill="var(--robot-body)" />
      <rect x="7" y="37" width="5" height="3" fill="var(--robot-dark)" />
      <rect x="32" y="37" width="5" height="3" fill="var(--robot-dark)" />
      <rect x="14" y="44" width="4" height="5" fill="var(--robot-dark)" />
      <rect x="26" y="44" width="4" height="5" fill="var(--robot-dark)" />
      <rect x="12" y="49" width="7" height="2" fill="#111827" />
      <rect x="25" y="49" width="7" height="2" fill="#111827" />
    </g>
  );
}

function BlinkMascot() {
  return (
    <g>
      <Shadow />
      <Antlers />
      <HeadBase />
      <rect x="13" y="15" width="18" height="3" fill="#111827" />
      <rect x="14" y="16" width="4" height="1" fill="#475569" opacity="0.5" />
      <rect x="17" y="22" width="2" height="1" fill="#111827" />
      <rect x="21" y="22" width="2" height="1" fill="#111827" />
      <rect x="19" y="23" width="2" height="1" fill="#111827" />
      <rect x="18" y="27" width="4" height="2" fill="var(--robot-dark)" />
      <rect x="13" y="29" width="18" height="12" fill="var(--robot-body)" />
      <rect x="15" y="41" width="14" height="3" fill="var(--robot-body)" />
      <rect x="11" y="31" width="2" height="8" fill="var(--robot-body)" />
      <rect x="31" y="31" width="2" height="8" fill="var(--robot-body)" />
      <HeartBadge />
      <rect x="8" y="31" width="3" height="6" fill="var(--robot-body)" />
      <rect x="33" y="31" width="3" height="6" fill="var(--robot-body)" />
      <rect x="7" y="37" width="5" height="3" fill="var(--robot-dark)" />
      <rect x="32" y="37" width="5" height="3" fill="var(--robot-dark)" />
      <rect x="14" y="44" width="4" height="5" fill="var(--robot-dark)" />
      <rect x="26" y="44" width="4" height="5" fill="var(--robot-dark)" />
      <rect x="12" y="49" width="7" height="2" fill="#111827" />
      <rect x="25" y="49" width="7" height="2" fill="#111827" />
    </g>
  );
}

function TailWagMascot() {
  return (
    <g>
      <Shadow />
      <Antlers shade="var(--robot-accent)" />
      <HeadBase body="var(--robot-body)" dark="var(--robot-accent)" />
      <rect x="13" y="14" width="18" height="5" fill="#111827" />
      <rect x="14" y="15" width="8" height="1" fill="#64748b" opacity="0.7" />
      <rect x="16" y="21" width="2" height="1" fill="#111827" />
      <rect x="22" y="21" width="2" height="1" fill="#111827" />
      <rect x="18" y="22" width="6" height="1" fill="#111827" />
      <rect x="18" y="27" width="4" height="2" fill="var(--robot-dark)" />
      <rect x="13" y="29" width="18" height="12" fill="var(--robot-body)" />
      <rect x="15" y="41" width="14" height="3" fill="var(--robot-body)" />
      <rect x="11" y="31" width="2" height="8" fill="var(--robot-body)" />
      <rect x="31" y="31" width="2" height="8" fill="var(--robot-body)" />
      <HeartBadge ring="#fde047" glow="#7dd3fc" />
      <rect x="6" y="30" width="3" height="6" fill="var(--robot-body)" />
      <rect x="35" y="30" width="3" height="6" fill="var(--robot-body)" />
      <rect x="5" y="26" width="5" height="3" fill="var(--robot-dark)" />
      <rect x="34" y="26" width="5" height="3" fill="var(--robot-dark)" />
      <rect x="14" y="44" width="4" height="5" fill="var(--robot-dark)" />
      <rect x="26" y="44" width="4" height="5" fill="var(--robot-dark)" />
      <rect x="12" y="49" width="7" height="2" fill="#111827" />
      <rect x="25" y="49" width="7" height="2" fill="#111827" />
    </g>
  );
}

function SleepMascot() {
  return (
    <g opacity="0.78">
      <Shadow />
      <Antlers />
      <HeadBase />
      <rect x="13" y="16" width="18" height="2" fill="#111827" />
      <rect x="18" y="22" width="4" height="1" fill="#111827" />
      <rect x="18" y="27" width="4" height="2" fill="var(--robot-dark)" />
      <rect x="14" y="29" width="16" height="10" fill="var(--robot-body)" />
      <rect x="16" y="39" width="12" height="3" fill="var(--robot-body)" />
      <rect x="12" y="31" width="2" height="6" fill="var(--robot-body)" />
      <rect x="30" y="31" width="2" height="6" fill="var(--robot-body)" />
      <HeartBadge ring="var(--robot-white)" glow="var(--robot-glow)" />
      <rect x="9" y="33" width="3" height="4" fill="var(--robot-body)" />
      <rect x="32" y="33" width="3" height="4" fill="var(--robot-body)" />
      <rect x="8" y="37" width="5" height="3" fill="var(--robot-dark)" />
      <rect x="31" y="37" width="5" height="3" fill="var(--robot-dark)" />
      <rect x="14" y="42" width="4" height="3" fill="var(--robot-dark)" />
      <rect x="26" y="42" width="4" height="3" fill="var(--robot-dark)" />
      <rect x="13" y="45" width="6" height="2" fill="#111827" />
      <rect x="25" y="45" width="6" height="2" fill="#111827" />
      <rect x="36" y="10" width="2" height="2" fill="#93c5fd" opacity="0.5" />
      <rect x="39" y="7" width="2" height="2" fill="#93c5fd" opacity="0.35" />
      <rect x="42" y="4" width="2" height="2" fill="#93c5fd" opacity="0.2" />
    </g>
  );
}

function LoadingMascot() {
  return (
    <g>
      <Shadow />
      <Antlers shade="var(--robot-accent)" />
      <HeadBase body="var(--robot-body)" dark="var(--robot-accent)" />
      <rect x="13" y="13" width="18" height="5" fill="#111827" />
      <rect x="14" y="14" width="5" height="2" fill="#60a5fa" />
      <rect x="25" y="14" width="5" height="2" fill="#334155" />
      <rect x="16" y="21" width="2" height="1" fill="#60a5fa" />
      <rect x="20" y="21" width="2" height="1" fill="#111827" />
      <rect x="18" y="22" width="2" height="1" fill="#60a5fa" />
      <rect x="18" y="27" width="4" height="2" fill="var(--robot-dark)" />
      <rect x="13" y="29" width="18" height="12" fill="var(--robot-body)" />
      <rect x="15" y="41" width="14" height="3" fill="var(--robot-body)" />
      <rect x="11" y="31" width="2" height="8" fill="var(--robot-body)" />
      <rect x="31" y="31" width="2" height="8" fill="var(--robot-body)" />
      <HeartBadge ring="#fde047" glow="#7dd3fc" />
      <rect x="7" y="31" width="3" height="6" fill="var(--robot-body)" />
      <rect x="34" y="31" width="3" height="6" fill="var(--robot-body)" />
      <rect x="6" y="37" width="5" height="3" fill="var(--robot-dark)" />
      <rect x="33" y="37" width="5" height="3" fill="var(--robot-dark)" />
      <rect x="13" y="44" width="4" height="5" fill="var(--robot-dark)" />
      <rect x="27" y="44" width="4" height="5" fill="var(--robot-dark)" />
      <rect x="11" y="49" width="7" height="2" fill="#111827" />
      <rect x="26" y="49" width="7" height="2" fill="#111827" />
    </g>
  );
}

export default UBGMascot;
