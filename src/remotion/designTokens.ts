/**
 * UBG Schedule Video Design Tokens
 * Target: Remotion Compositions (1920x1080 @ 30 FPS)
 * Neubrutalism Mode A: Pure Boxy (Sharp 90-degree corners, rounded-none)
 */

export const PALETTE = {
  primary: '#FFD13B',      // Vibrant Yellow
  secondary: '#FF90E8',    // Bright Pink
  tertiary: '#3B82F6',     // Electric Blue
  accent: '#2563EB',       // Deep Royal Blue
  success: '#10B981',      // Emerald Green
  warning: '#FFD13B',      // Amber
  error: '#F43F5E',        // Rose Red (Bentrok clash alert)
  surface: '#FFFFFF',      // Crisp White Surface
  background: '#EFF6FF',   // Ice Blue Soft Tint
  backgroundAlt: '#F8FAFC',// Neutral White/Slate Tint
  text: '#0F172A',         // Slate 900 High Contrast
  textMuted: '#64748B',    // Slate 500
  border: '#000000',       // Absolute Black
} as const;

export const SHADOWS = {
  sm: '2px 2px 0px #000000',
  base: '4px 4px 0px #000000',
  lg: '6px 6px 0px #000000',
  xl: '8px 8px 0px #000000',
  none: '0px 0px 0px #000000',
} as const;

export const BORDERS = {
  thin: '2px solid #000000',
  medium: '3px solid #000000',
  thick: '4px solid #000000',
  dashed: '3px dashed #000000',
} as const;

export const TYPOGRAPHY = {
  fontFamily: '"Space Grotesk", system-ui, -apple-system, sans-serif',
  fontFamilyMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  weights: {
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
} as const;

export const CANVAS = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;

export interface SpringConfig {
  damping: number;
  mass: number;
  stiffness: number;
}

export const SPRING_PRESETS: Record<string, SpringConfig> = {
  bouncy: { damping: 12, mass: 0.8, stiffness: 140 },
  snappy: { damping: 18, mass: 0.9, stiffness: 180 },
  stiff: { damping: 24, mass: 1.0, stiffness: 220 },
  gentle: { damping: 20, mass: 1.2, stiffness: 100 },
};

/**
 * Pure mathematical linear interpolation helper with clamping.
 * Supports multi-segment keyframe arrays, mirroring Remotion interpolate().
 */
export function interpolateValue(
  frame: number,
  inputRange: number[],
  outputRange: number[],
  easingFn?: (t: number) => number
): number {
  if (inputRange.length !== outputRange.length || inputRange.length < 2) {
    return outputRange[0] ?? 0;
  }

  // Clamping left
  if (frame <= inputRange[0]) return outputRange[0];
  // Clamping right
  const lastIdx = inputRange.length - 1;
  if (frame >= inputRange[lastIdx]) return outputRange[lastIdx];

  // Find active segment
  let seg = 0;
  while (seg < lastIdx && frame > inputRange[seg + 1]) {
    seg++;
  }

  const inMin = inputRange[seg];
  const inMax = inputRange[seg + 1];
  const outMin = outputRange[seg];
  const outMax = outputRange[seg + 1];

  let progress = (frame - inMin) / (inMax - inMin);
  if (easingFn) {
    progress = easingFn(progress);
  }

  return outMin + progress * (outMax - outMin);
}

/**
 * Pure damped harmonic spring formula calculation.
 * Outputs a normalized 0 -> 1 value over frame elapsed.
 */
export function calculateSpring(
  frame: number,
  delayFrame: number = 0,
  config: SpringConfig = SPRING_PRESETS.snappy,
  fps: number = 30
): number {
  const elapsed = (frame - delayFrame) / fps;
  if (elapsed <= 0) return 0;

  const { damping, mass, stiffness } = config;
  const omega0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));

  if (zeta < 1) {
    // Underdamped
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
    const envelope = Math.exp(-zeta * omega0 * elapsed);
    const oscillation = Math.cos(omegaD * elapsed) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(omegaD * elapsed);
    return Math.min(1.08, Math.max(0, 1 - envelope * oscillation));
  } else {
    // Critically damped / overdamped
    const envelope = Math.exp(-omega0 * elapsed);
    return Math.min(1, Math.max(0, 1 - envelope * (1 + omega0 * elapsed)));
  }
}
