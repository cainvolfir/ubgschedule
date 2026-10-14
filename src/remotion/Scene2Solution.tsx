import React from 'react';
import { PALETTE, SHADOWS, BORDERS, TYPOGRAPHY, interpolateValue, calculateSpring, SPRING_PRESETS } from './designTokens';
import { SceneRoot, SceneBody, Panel, SceneHeading } from './SceneShell';

export interface Scene2SolutionProps {
  frame: number;
}

const SOLUTION_FEATURES = [
  {
    code: 'A',
    title: 'Satukan jadwal otomatis',
    body: 'Unggah PDF teori dan Excel praktikum, UBG Schedule menggabungkannya jadi satu tabel.',
    accent: PALETTE.tertiary,
    delay: 14,
  },
  {
    code: 'B',
    title: 'Deteksi bentrok',
    body: 'Tabrakan jam di hari yang sama langsung ditandai merah menyala.',
    accent: PALETTE.error,
    delay: 26,
  },
  {
    code: 'C',
    title: 'Ekspor kalender',
    body: 'Simpan ke ICS untuk Google Calendar, PNG resolusi tinggi, atau teks siap tempel.',
    accent: PALETTE.success,
    delay: 38,
  },
];

export const Scene2Solution: React.FC<Scene2SolutionProps> = ({ frame }) => {
  return (
    <SceneRoot>
      <SceneHeading
        frame={frame}
        step="SOLUSI"
        stepColor={PALETTE.tertiary}
        accent={PALETTE.primary}
        title="UBG Schedule Menyatukannya"
        subtitle="Satu alur sederhana: unggah berkas, pilih kelas, kelola jadwal lengkap beserta peringatan bentrok."
      />

      <SceneBody>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, width: '100%', alignItems: 'stretch' }}>
          <Panel
            background={PALETTE.primary}
            shadow={SHADOWS.lg}
            style={{
              padding: 28,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              transform: `translateY(${interpolateValue(calculateSpring(frame, 8, SPRING_PRESETS.snappy), [0, 1], [36, 0])}px)`,
              opacity: interpolateValue(frame, [8, 20], [0, 1]),
            }}
          >
            <span
              style={{
                alignSelf: 'flex-start',
                backgroundColor: '#000000',
                color: PALETTE.surface,
                border: BORDERS.thin,
                boxShadow: SHADOWS.sm,
                padding: '5px 14px',
                fontSize: 13,
                fontWeight: TYPOGRAPHY.weights.black,
                letterSpacing: '0.06em',
              }}
            >
              KENAPA UBG SCHEDULE
            </span>
            <h2
              style={{
                margin: 0,
                fontSize: 38,
                lineHeight: 1.08,
                fontWeight: TYPOGRAPHY.weights.black,
                textTransform: 'uppercase',
                letterSpacing: '-0.02em',
              }}
            >
              Jadwal Rapi Tanpa Salin Manual
            </h2>
            <p style={{ margin: 0, fontSize: 17, fontWeight: TYPOGRAPHY.weights.bold, color: '#1E293B', lineHeight: 1.4 }}>
              Berhenti membandingkan dua berkas di depan layar. Semua data jadwalmu ditarik, digabung, dan diperiksa bentrok
              secara otomatis.
            </p>

            {/* Before to after merge motif */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
              <div
                style={{
                  backgroundColor: PALETTE.surface,
                  border: BORDERS.thin,
                  boxShadow: SHADOWS.sm,
                  padding: '8px 12px',
                  fontSize: 13,
                  fontWeight: TYPOGRAPHY.weights.extrabold,
                }}
              >
                2 BERKAS
              </div>
              <span style={{ fontSize: 22, fontWeight: TYPOGRAPHY.weights.black }}>{'->'}</span>
              <div
                style={{
                  backgroundColor: PALETTE.surface,
                  border: BORDERS.thin,
                  boxShadow: SHADOWS.sm,
                  padding: '8px 12px',
                  fontSize: 13,
                  fontWeight: TYPOGRAPHY.weights.extrabold,
                }}
              >
                1 JADWAL
              </div>
              <span style={{ fontSize: 22, fontWeight: TYPOGRAPHY.weights.black }}>{'->'}</span>
              <div
                style={{
                  backgroundColor: PALETTE.success,
                  color: PALETTE.surface,
                  border: BORDERS.thin,
                  boxShadow: SHADOWS.sm,
                  padding: '8px 12px',
                  fontSize: 13,
                  fontWeight: TYPOGRAPHY.weights.extrabold,
                }}
              >
                BEBAS BENTROK
              </div>
            </div>
          </Panel>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {SOLUTION_FEATURES.map((feature) => {
              const spring = calculateSpring(frame, feature.delay, SPRING_PRESETS.snappy);
              const opacity = interpolateValue(frame, [feature.delay, feature.delay + 12], [0, 1]);
              return (
                <Panel
                  key={feature.code}
                  style={{
                    padding: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 18,
                    transform: `translateX(${interpolateValue(spring, [0, 1], [40, 0])}px)`,
                    opacity,
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      flexShrink: 0,
                      backgroundColor: feature.accent,
                      color: PALETTE.surface,
                      border: BORDERS.thin,
                      boxShadow: SHADOWS.sm,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      fontWeight: TYPOGRAPHY.weights.black,
                    }}
                  >
                    {feature.code}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 19, fontWeight: TYPOGRAPHY.weights.black, textTransform: 'uppercase' }}>
                      {feature.title}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: TYPOGRAPHY.weights.medium, color: '#475569', lineHeight: 1.35 }}>
                      {feature.body}
                    </span>
                  </div>
                </Panel>
              );
            })}
          </div>
        </div>
      </SceneBody>
    </SceneRoot>
  );
};