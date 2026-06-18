import { cn } from '@/lib/utils';

interface UGOMascotArtProps {
  size?: number;
  alt?: string;
  className?: string;
}

export function UGOMascotArt({ size = 96, alt = 'UGO mascot pixel art', className }: UGOMascotArtProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 96"
      role="img"
      aria-label={alt}
      className={cn('shrink-0', className)}
      style={{
        width: size,
        height: size,
      }}
    >
      <rect x="20" y="84" width="120" height="4" fill="#0f172a" opacity="0.16" />

      {/* Left mascot — thumbs up */}
      <g shapeRendering="crispEdges">
        <rect x="25" y="0" width="4" height="8" fill="#2f78c7" />
        <rect x="21" y="3" width="4" height="4" fill="#2f78c7" />
        <rect x="29" y="3" width="4" height="4" fill="#2f78c7" />
        <rect x="51" y="0" width="4" height="8" fill="#2f78c7" />
        <rect x="47" y="3" width="4" height="4" fill="#2f78c7" />
        <rect x="55" y="3" width="4" height="4" fill="#2f78c7" />

        <rect x="20" y="12" width="44" height="44" fill="#3b9cff" />
        <rect x="16" y="16" width="4" height="36" fill="#1e5a9d" />
        <rect x="60" y="16" width="4" height="36" fill="#1e5a9d" />
        <rect x="20" y="8" width="44" height="4" fill="#6ec6ff" />
        <rect x="24" y="12" width="36" height="4" fill="#6ec6ff" opacity="0.7" />
        <rect x="25" y="24" width="34" height="13" fill="#111827" />
        <rect x="28" y="26" width="12" height="3" fill="#60a5fa" opacity="0.55" />
        <rect x="31" y="41" width="4" height="2" fill="#111827" />
        <rect x="39" y="41" width="4" height="2" fill="#111827" />
        <rect x="34" y="45" width="6" height="2" fill="#111827" />

        <rect x="12" y="38" width="8" height="24" fill="#3b9cff" />
        <rect x="8" y="44" width="4" height="16" fill="#3b9cff" />
        <rect x="6" y="38" width="6" height="8" fill="#1e5a9d" />
        <rect x="16" y="32" width="6" height="16" fill="#3b9cff" />
        <rect x="14" y="28" width="10" height="6" fill="#1e5a9d" />

        <rect x="34" y="55" width="16" height="16" fill="#e0f2fe" />
        <rect x="38" y="59" width="8" height="8" fill="#ef4444" />
        <rect x="40" y="60" width="4" height="4" fill="#fca5a5" opacity="0.7" />

        <rect x="28" y="60" width="30" height="14" fill="#2f78c7" />
        <rect x="24" y="74" width="10" height="10" fill="#2f78c7" />
        <rect x="50" y="74" width="10" height="10" fill="#2f78c7" />
        <rect x="22" y="84" width="16" height="4" fill="#0f172a" />
        <rect x="48" y="84" width="16" height="4" fill="#0f172a" />
      </g>

      {/* Right mascot — pointing */}
      <g shapeRendering="crispEdges">
        <rect x="101" y="1" width="4" height="8" fill="#2f78c7" />
        <rect x="97" y="4" width="4" height="4" fill="#2f78c7" />
        <rect x="105" y="4" width="4" height="4" fill="#2f78c7" />
        <rect x="127" y="1" width="4" height="8" fill="#2f78c7" />
        <rect x="123" y="4" width="4" height="4" fill="#2f78c7" />
        <rect x="131" y="4" width="4" height="4" fill="#2f78c7" />

        <rect x="96" y="12" width="44" height="44" fill="#3b9cff" />
        <rect x="92" y="16" width="4" height="36" fill="#1e5a9d" />
        <rect x="136" y="16" width="4" height="36" fill="#1e5a9d" />
        <rect x="96" y="8" width="44" height="4" fill="#6ec6ff" />
        <rect x="100" y="12" width="36" height="4" fill="#6ec6ff" opacity="0.7" />
        <rect x="101" y="24" width="34" height="13" fill="#111827" />
        <rect x="104" y="26" width="12" height="3" fill="#60a5fa" opacity="0.55" />
        <rect x="107" y="41" width="4" height="2" fill="#111827" />
        <rect x="115" y="41" width="4" height="2" fill="#111827" />
        <rect x="110" y="45" width="6" height="2" fill="#111827" />

        <rect x="132" y="38" width="8" height="18" fill="#3b9cff" />
        <rect x="140" y="34" width="8" height="8" fill="#3b9cff" />
        <rect x="146" y="28" width="6" height="10" fill="#3b9cff" />
        <rect x="144" y="24" width="10" height="6" fill="#1e5a9d" />

        <rect x="110" y="55" width="16" height="16" fill="#e0f2fe" />
        <rect x="114" y="59" width="8" height="8" fill="#ef4444" />
        <rect x="116" y="60" width="4" height="4" fill="#fca5a5" opacity="0.7" />

        <rect x="104" y="60" width="30" height="14" fill="#2f78c7" />
        <rect x="100" y="74" width="10" height="10" fill="#2f78c7" />
        <rect x="126" y="74" width="10" height="10" fill="#2f78c7" />
        <rect x="98" y="84" width="16" height="4" fill="#0f172a" />
        <rect x="124" y="84" width="16" height="4" fill="#0f172a" />
      </g>
    </svg>
  );
}

export default UGOMascotArt;
