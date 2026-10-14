import React from 'react';
import { PALETTE, SHADOWS, BORDERS, TYPOGRAPHY, interpolateValue, calculateSpring, SPRING_PRESETS } from './designTokens';
import { SceneRoot, SceneBody, Panel, SceneHeading } from './SceneShell';

export interface Scene1ProblemProps {
  frame: number;
}

const PROBLEM_CARDS = [
  {
    tag: 'PDF',
    tagColor: PALETTE.error,
    file: 'Jadwal_Teori_Ganjil.pdf',
    line: 'Jadwal kuliah teori dari portal SIAM',
    note: 'Format beda tiap semester',
    delay: 16,
  },
  {
    tag: 'XLSX',
    tagColor: PALETTE.success,
    file: 'Jadwal_Praktikum_Lab.xlsx',
    line: 'Jadwal praktikum dari lab komputer',
    note: 'Kolom dan header tidak seragam',
    delay: 26,
  },
];

const PAIN_POINTS = [
  {
    code: '01',
    title: 'Dua berkas terpisah',
    body: 'PDF teori dan Excel praktikum tidak pernah satu tempat.',
    color: PALETTE.error,
    delay: 46,
  },
  {
    code: '02',
    title: 'Risiko jadwal bentrok',
    body: 'Mata kuliah tabrakan jam tanpa kamu sadari sampai hari H.',
    color: PALETTE.error,
    delay: 56,
  },
  {
    code: '03',
    title: 'Cek manual melelahkan',
    body: 'Menyalin ke satu tabel butuh teliti dan waktu lama.',
    color: PALETTE.error,
    delay: 66,
  },
];

export const Scene1Problem: React.FC<Scene1ProblemProps> = ({ frame }) => {
  const headingSpring = calculateSpring(frame, 4, SPRING_PRESETS.snappy);
  const headingOpacity = interpolateValue(frame, [4, 16], [0, 1]);

  return (
    <SceneRoot>
      <SceneHeading
        frame={frame}
        step="MASALAH"
        stepColor={PALETTE.error}
        accent={PALETTE.error}
        title="Jadwalmu Terpisah Dan Berantakan"
        subtitle="Jadwal teori dan praktikum tersimpan di dua berkas berbeda, tanpa satu tampilan yang menyatukan."
      />

      <SceneBody>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, width: '100%' }}>
          {PROBLEM_CARDS.map((card) => {
            const spring = calculateSpring(frame, card.delay, SPRING_PRESETS.snappy);
            const y = interpolateValue(spring, [0, 1], [36, 0]);
            const opacity = interpolateValue(frame, [card.delay, card.delay + 12], [0, 1]);
            return (
              <Panel
                key={card.file}
                shadow={SHADOWS.lg}
                style={{
                  padding: 22,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  transform: `translateY(${y}px)`,
                  opacity,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      backgroundColor: card.tagColor,
                      color: PALETTE.surface,
                      border: BORDERS.thin,
                      boxShadow: SHADOWS.sm,
                      fontSize: 13,
                      fontWeight: TYPOGRAPHY.weights.black,
                      padding: '4px 12px',
                    }}
                  >
                    {card.tag}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: TYPOGRAPHY.weights.bold, color: PALETTE.textMuted }}>
                    {card.note}
                  </span>
                </div>

                <div
                  style={{
                    border: BORDERS.dashed,
                    backgroundColor: PALETTE.backgroundAlt,
                    padding: '22px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 68,
                      backgroundColor: PALETTE.surface,
                      border: BORDERS.thin,
                      boxShadow: SHADOWS.sm,
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      paddingBottom: 6,
                      fontSize: 15,
                      fontWeight: TYPOGRAPHY.weights.black,
                    }}
                  >
                    {card.tag}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 17, fontWeight: TYPOGRAPHY.weights.extrabold }}>{card.file}</span>
                    <span style={{ fontSize: 14, fontWeight: TYPOGRAPHY.weights.medium, color: PALETTE.textMuted }}>
                      {card.line}
                    </span>
                  </div>
                </div>

                {/* Broken connection motif: file sits alone, no merge path */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 3, backgroundColor: '#CBD5E1' }} />
                  <span style={{ fontSize: 12, fontWeight: TYPOGRAPHY.weights.black, color: PALETTE.textMuted }}>
                    BELUM TERGABUNG
                  </span>
                  <div style={{ flex: 1, height: 3, backgroundColor: '#CBD5E1' }} />
                </div>
              </Panel>
            );
          })}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            transform: `translateY(${interpolateValue(headingSpring, [0, 1], [24, 0])}px)`,
            opacity: headingOpacity,
          }}
        >
          <span
            style={{
              backgroundColor: '#000000',
              color: PALETTE.surface,
              border: BORDERS.thin,
              padding: '6px 14px',
              fontSize: 14,
              fontWeight: TYPOGRAPHY.weights.black,
              letterSpacing: '0.05em',
            }}
          >
            3 MASALAH UTAMA
          </span>
          <div style={{ flex: 1, height: 3, backgroundColor: '#000000', opacity: 0.15 }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, width: '100%' }}>
          {PAIN_POINTS.map((point) => {
            const spring = calculateSpring(frame, point.delay, SPRING_PRESETS.bouncy);
            const scale = interpolateValue(spring, [0, 1], [0.9, 1]);
            const opacity = interpolateValue(frame, [point.delay, point.delay + 10], [0, 1]);
            return (
              <Panel
                key={point.code}
                background="#FEF2F4"
                style={{
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  transform: `scale(${scale})`,
                  opacity,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    backgroundColor: point.color,
                    border: BORDERS.thin,
                    boxShadow: SHADOWS.sm,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: PALETTE.surface,
                    fontSize: 18,
                    fontWeight: TYPOGRAPHY.weights.black,
                  }}
                >
                  {point.code}
                </div>
                <span style={{ fontSize: 18, fontWeight: TYPOGRAPHY.weights.black, textTransform: 'uppercase' }}>
                  {point.title}
                </span>
                <span style={{ fontSize: 14, fontWeight: TYPOGRAPHY.weights.medium, color: '#475569', lineHeight: 1.35 }}>
                  {point.body}
                </span>
              </Panel>
            );
          })}
        </div>
      </SceneBody>
    </SceneRoot>
  );
};