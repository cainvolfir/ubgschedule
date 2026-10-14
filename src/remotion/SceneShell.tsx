import React from 'react';
import {
  PALETTE,
  SHADOWS,
  BORDERS,
  TYPOGRAPHY,
  interpolateValue,
  calculateSpring,
  SPRING_PRESETS,
} from './designTokens';

/**
 * Shared scene scaffolding. Every scene renders a single SceneRoot as a direct
 * child of the VideoLayoutContainer viewport, so the window chrome and inner
 * padding stay consistent across the timeline.
 */

export const SceneRoot: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      boxSizing: 'border-box',
    }}
  >
    {children}
  </div>
);

export const SceneBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      flex: 1,
      minHeight: 0,
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      justifyContent: 'center',
      boxSizing: 'border-box',
    }}
  >
    {children}
  </div>
);

export interface PanelProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  shadow?: string;
  background?: string;
}

export const Panel: React.FC<PanelProps> = ({
  children,
  style,
  shadow = SHADOWS.base,
  background = PALETTE.surface,
}) => (
  <div
    style={{
      backgroundColor: background,
      border: BORDERS.medium,
      boxShadow: shadow,
      boxSizing: 'border-box',
      ...style,
    }}
  >
    {children}
  </div>
);

export interface SceneHeadingProps {
  frame: number;
  step: string;
  stepColor?: string;
  title: string;
  subtitle?: string;
  accent?: string;
}

export const SceneHeading: React.FC<SceneHeadingProps> = ({
  frame,
  step,
  stepColor = PALETTE.tertiary,
  title,
  subtitle,
  accent = PALETTE.primary,
}) => {
  const spring = calculateSpring(frame, 0, SPRING_PRESETS.snappy);
  const y = interpolateValue(spring, [0, 1], [-28, 0]);
  const opacity = interpolateValue(frame, [0, 10], [0, 1]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        transform: `translateY(${y}px)`,
        opacity,
      }}
    >
      <div
        style={{
          width: 16,
          alignSelf: 'stretch',
          backgroundColor: accent,
          border: BORDERS.thin,
          boxShadow: SHADOWS.sm,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span
          style={{
            alignSelf: 'flex-start',
            backgroundColor: stepColor,
            color: PALETTE.surface,
            border: BORDERS.thin,
            boxShadow: SHADOWS.sm,
            padding: '4px 12px',
            fontSize: 13,
            fontWeight: TYPOGRAPHY.weights.black,
            letterSpacing: '0.08em',
          }}
        >
          {step}
        </span>
        <h1
          style={{
            margin: 0,
            fontSize: 44,
            lineHeight: 1.05,
            fontWeight: TYPOGRAPHY.weights.black,
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            color: PALETTE.text,
          }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: TYPOGRAPHY.weights.bold,
              color: '#334155',
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export interface FocusTagProps {
  frame: number;
  label: string;
  color?: string;
  delay?: number;
}

export const FocusTag: React.FC<FocusTagProps> = ({ frame, label, color = '#000000', delay = 10 }) => {
  const spring = calculateSpring(frame, delay, SPRING_PRESETS.bouncy);
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        width: '100%',
        opacity: interpolateValue(frame, [delay, delay + 8], [0, 1]),
      }}
    >
      <span
        style={{
          backgroundColor: color,
          color: PALETTE.surface,
          border: BORDERS.thin,
          boxShadow: SHADOWS.sm,
          padding: '5px 14px',
          fontSize: 13,
          fontWeight: TYPOGRAPHY.weights.black,
          letterSpacing: '0.06em',
          transform: `scale(${interpolateValue(spring, [0, 1], [0.8, 1])})`,
        }}
      >
        {label}
      </span>
    </div>
  );
};