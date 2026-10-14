import React from 'react';
import { PALETTE, SHADOWS, BORDERS, TYPOGRAPHY, interpolateValue, calculateSpring, SPRING_PRESETS } from './designTokens';
import { SceneRoot, SceneBody, Panel, SceneHeading } from './SceneShell';
import { ClassSelectionChecklist } from './VideoMockupComponents';

export interface Scene3UploadTeoriProps {
  frame: number;
}

export const Scene3UploadTeori: React.FC<Scene3UploadTeoriProps> = ({ frame }) => {
  // Card entrance
  const cardSpring = calculateSpring(frame, 8, SPRING_PRESETS.snappy);
  const cardY = interpolateValue(cardSpring, [0, 1], [36, 0]);
  const cardOpacity = interpolateValue(frame, [8, 20], [0, 1]);

  // Simulated PDF landing at local frame 24
  const dropped = frame >= 24;
  const impact = interpolateValue(frame, [24, 28, 34], [0, 3, 0]);
  const progress = interpolateValue(frame, [26, 46], [0, 100]);

  return (
    <SceneRoot>
      <SceneHeading
        frame={frame}
        step="LANGKAH 1"
        stepColor={PALETTE.error}
        accent={PALETTE.error}
        title="Unggah PDF Teori Dan Pilih Kelas"
        subtitle="Tarik berkas jadwal kuliah teori dari portal SIAM, lalu centang kelas yang kamu ambil."
      />

      <SceneBody>
        <Panel
          shadow={SHADOWS.lg}
          style={{
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            transform: `translateY(${cardY}px)`,
            opacity: cardOpacity,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  backgroundColor: PALETTE.error,
                  color: PALETTE.surface,
                  border: BORDERS.thin,
                  boxShadow: SHADOWS.sm,
                  fontSize: 13,
                  fontWeight: TYPOGRAPHY.weights.black,
                  padding: '4px 12px',
                }}
              >
                PDF
              </span>
              <span style={{ fontSize: 17, fontWeight: TYPOGRAPHY.weights.black, textTransform: 'uppercase' }}>
                Jadwal Kuliah Teori
              </span>
            </div>
            <span
              style={{
                backgroundColor: dropped ? PALETTE.success : PALETTE.warning,
                color: dropped ? PALETTE.surface : PALETTE.text,
                border: BORDERS.thin,
                boxShadow: SHADOWS.sm,
                fontSize: 12,
                fontWeight: TYPOGRAPHY.weights.extrabold,
                padding: '4px 12px',
              }}
            >
              {dropped ? 'BERHASIL DIBACA' : 'MENUNGGU BERKAS'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div
              style={{
                border: BORDERS.dashed,
                backgroundColor: dropped ? '#DCFCE7' : PALETTE.backgroundAlt,
                padding: '20px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                transform: `translate(${impact}px, ${impact}px)`,
              }}
            >
              <div
                style={{
                  width: 50,
                  height: 50,
                  flexShrink: 0,
                  backgroundColor: PALETTE.surface,
                  border: BORDERS.thin,
                  boxShadow: SHADOWS.sm,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 15,
                  fontWeight: TYPOGRAPHY.weights.black,
                }}
              >
                {dropped ? 'OK' : 'PDF'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <span style={{ fontSize: 16, fontWeight: TYPOGRAPHY.weights.extrabold }}>
                  {dropped ? 'Jadwal_Kuliah_Ganjil_2026.pdf' : 'Tarik & letakkan berkas PDF'}
                </span>
                <span style={{ fontSize: 13, fontWeight: TYPOGRAPHY.weights.medium, color: PALETTE.textMuted }}>
                  {dropped ? '142 baris jadwal ditemukan, 1.2 MB' : 'Maksimal 15 MB format PDF resmi SIAM'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: TYPOGRAPHY.weights.bold }}>
                <span>MEMBACA PDF</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div style={{ height: 14, backgroundColor: '#E2E8F0', border: BORDERS.thin, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, backgroundColor: PALETTE.tertiary }} />
              </div>
              <div
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: dropped ? '#DCFCE7' : PALETTE.backgroundAlt,
                  color: dropped ? '#166534' : PALETTE.textMuted,
                  border: BORDERS.thin,
                  padding: '4px 12px',
                  fontSize: 12,
                  fontWeight: TYPOGRAPHY.weights.extrabold,
                  opacity: interpolateValue(frame, [34, 44], [0, 1]),
                }}
              >
                TEORI TERPARSING: 12 MATA KULIAH
              </div>
            </div>
          </div>
        </Panel>

        {/* Reuse the class selection checklist: compress its internal timeline (starts at frame 68,
             checks resolve by frame 94) into Scene 3's 210-frame budget at half speed. */}
        <ClassSelectionChecklist frame={68 + frame * 0.5} />
      </SceneBody>
    </SceneRoot>
  );
};