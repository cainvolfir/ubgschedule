import React from 'react';
import { PALETTE, SHADOWS, BORDERS, TYPOGRAPHY, interpolateValue, calculateSpring, SPRING_PRESETS } from './designTokens';
import { SceneRoot, SceneBody, Panel, SceneHeading } from './SceneShell';
import { ScheduleResultCards, ExportButtonBar } from './VideoMockupComponents';

export interface Scene5ResultProps {
  frame: number;
}

/**
 * The reused mockup components (ScheduleResultCards, ExportButtonBar) carry their
 * own internal timelines anchored at local frames 95 / 120 / 145. We feed them a
 * compressed frame so their full sequence lands inside Scene 5's 180-frame window.
 */
const COMPONENT_FRAME_BASE = 95;
const COMPONENT_FRAME_SPEED = 0.6;

export const Scene5Result: React.FC<Scene5ResultProps> = ({ frame }) => {
  const componentFrame = COMPONENT_FRAME_BASE + frame * COMPONENT_FRAME_SPEED;

  // Conflict emphasis: a red glow ring pulses while the bentrok badge is active
  const alertActive = frame >= 12 && frame <= 70;
  const pulse = alertActive ? 1 + Math.sin((frame - 12) * 0.35) * 0.5 : 0;

  return (
    <SceneRoot>
      <SceneHeading
        frame={frame}
        step="LANGKAH 3"
        stepColor={PALETTE.primary}
        accent={PALETTE.primary}
        title="Jadwal Terpadu Dan Bebas Bentrok"
        subtitle="Satu tabel jadwal lengkap dengan peringatan bentrok merah menyala, siap diekspor."
      />

      <SceneBody>
        {/* Glow-adjusted wrapper so the pulsing red ring sits behind the conflict card zone */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            boxShadow: alertActive ? `0 0 0 ${Math.round(pulse * 6)}px rgba(244,63,94,0.35)` : 'none',
            border: alertActive ? `3px solid ${PALETTE.error}` : '3px solid transparent',
            boxSizing: 'border-box',
          }}
        >
          <ScheduleResultCards frame={componentFrame} />
        </div>

        <div style={{ display: 'flex', gap: 16, width: '100%' }}>
          {[
            { code: 'ICS', label: 'Kalender .ics', desc: 'Sinkron ke Google Calendar', color: PALETTE.tertiary, delay: 8 },
            { code: 'PNG', label: 'Gambar .png', desc: 'Resolusi tinggi siap cetak', color: PALETTE.primary, delay: 16 },
            { code: 'TXT', label: 'Teks salin', desc: 'Tempel ke catatan atau chat', color: PALETTE.success, delay: 24 },
          ].map((item) => {
            const spring = calculateSpring(frame, item.delay, SPRING_PRESETS.bouncy);
            return (
              <div
                key={item.code}
                style={{
                  flex: 1,
                  backgroundColor: item.color,
                  color: item.color === PALETTE.primary ? PALETTE.text : PALETTE.surface,
                  border: BORDERS.medium,
                  boxShadow: SHADOWS.base,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transform: `scale(${interpolateValue(spring, [0, 1], [0.9, 1])})`,
                  opacity: interpolateValue(frame, [item.delay, item.delay + 10], [0, 1]),
                }}
              >
                <span
                  style={{
                    backgroundColor: '#000000',
                    color: PALETTE.surface,
                    border: BORDERS.thin,
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: TYPOGRAPHY.weights.black,
                  }}
                >
                  {item.code}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 15, fontWeight: TYPOGRAPHY.weights.black, textTransform: 'uppercase' }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: TYPOGRAPHY.weights.bold, opacity: 0.9 }}>{item.desc}</span>
                </div>
              </div>
            );
          })}
        </div>

        <Panel
          background={PALETTE.backgroundAlt}
          style={{ padding: 6, opacity: interpolateValue(frame, [70, 82], [0, 1]) }}
        >
          <ExportButtonBar frame={componentFrame} />
        </Panel>
      </SceneBody>
    </SceneRoot>
  );
};