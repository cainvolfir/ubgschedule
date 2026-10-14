import React from 'react';
import { PALETTE, SHADOWS, BORDERS, TYPOGRAPHY, interpolateValue, calculateSpring, SPRING_PRESETS } from './designTokens';
import { SceneRoot, SceneBody, Panel, SceneHeading } from './SceneShell';

export interface Scene4UploadPraktikumProps {
  frame: number;
}

const ROOM_PREFIXES = [
  { label: 'LAB', desc: 'Laboratorium Komputer', delay: 22 },
  { label: 'R', desc: 'Ruang Kelas', delay: 28 },
  { label: 'GD', desc: 'Gedung Lama', delay: 34 },
];

const LAB_SLOTS = [
  { code: 'LAB102', name: 'Praktikum Basis Data', group: 'Kelompok 2', time: '10.30 - 12.10 WITA', delay: 60 },
  { code: 'LAB110', name: 'Praktikum Pemrograman Web', group: 'Kelompok 1', time: '13.00 - 14.40 WITA', delay: 70 },
];

export const Scene4UploadPraktikum: React.FC<Scene4UploadPraktikumProps> = ({ frame }) => {
  const cardSpring = calculateSpring(frame, 8, SPRING_PRESETS.snappy);
  const cardY = interpolateValue(cardSpring, [0, 1], [36, 0]);
  const cardOpacity = interpolateValue(frame, [8, 20], [0, 1]);

  const dropped = frame >= 24;
  const impact = interpolateValue(frame, [24, 28, 34], [0, 3, 0]);
  const progress = interpolateValue(frame, [26, 46], [0, 100]);

  // Room selection: LAB chosen at frame 40
  const selectedPrefix = frame >= 40 ? 'LAB' : null;

  return (
    <SceneRoot>
      <SceneHeading
        frame={frame}
        step="LANGKAH 2"
        stepColor={PALETTE.success}
        accent={PALETTE.secondary}
        title="Unggah Excel Praktikum Dan Pilih Lab"
        subtitle="Muat file XLSX jadwal praktikum, lalu tentukan kode ruangan lab yang kamu pakai."
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
                  backgroundColor: PALETTE.success,
                  color: PALETTE.surface,
                  border: BORDERS.thin,
                  boxShadow: SHADOWS.sm,
                  fontSize: 13,
                  fontWeight: TYPOGRAPHY.weights.black,
                  padding: '4px 12px',
                }}
              >
                XLSX
              </span>
              <span style={{ fontSize: 17, fontWeight: TYPOGRAPHY.weights.black, textTransform: 'uppercase' }}>
                Jadwal Praktikum Lab
              </span>
            </div>
            <span
              style={{
                backgroundColor: dropped ? PALETTE.success : PALETTE.secondary,
                color: dropped ? PALETTE.surface : PALETTE.text,
                border: BORDERS.thin,
                boxShadow: SHADOWS.sm,
                fontSize: 12,
                fontWeight: TYPOGRAPHY.weights.extrabold,
                padding: '4px 12px',
              }}
            >
              {dropped ? 'BERHASIL DIBACA' : 'OPSIONAL'}
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
                  fontSize: 14,
                  fontWeight: TYPOGRAPHY.weights.black,
                }}
              >
                {dropped ? 'OK' : 'XLS'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <span style={{ fontSize: 16, fontWeight: TYPOGRAPHY.weights.extrabold }}>
                  {dropped ? 'Jadwal_Labkom_Semester5.xlsx' : 'Tarik & letakkan berkas Excel'}
                </span>
                <span style={{ fontSize: 13, fontWeight: TYPOGRAPHY.weights.medium, color: PALETTE.textMuted }}>
                  {dropped ? '28 slot praktikum ditemukan, 640 KB' : 'Format .xlsx atau .xls lab universitas'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: TYPOGRAPHY.weights.bold }}>
                <span>MEMBACA SPREADSHEET</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div style={{ height: 14, backgroundColor: '#E2E8F0', border: BORDERS.thin, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, backgroundColor: PALETTE.secondary }} />
              </div>
            </div>
          </div>
        </Panel>

        {/* Room prefix selection row */}
        <Panel
          background={PALETTE.backgroundAlt}
          style={{
            padding: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            opacity: interpolateValue(frame, [18, 28], [0, 1]),
          }}
        >
          <span style={{ fontSize: 15, fontWeight: TYPOGRAPHY.weights.black, textTransform: 'uppercase' }}>
            Kode ruangan:
          </span>
          <div style={{ display: 'flex', gap: 12 }}>
            {ROOM_PREFIXES.map((room) => {
              const isActive = selectedPrefix === room.label || (selectedPrefix === null && frame < 40 && room.label === 'LAB');
              const spring = calculateSpring(frame, room.delay, SPRING_PRESETS.bouncy);
              return (
                <div
                  key={room.label}
                  style={{
                    backgroundColor: isActive ? PALETTE.tertiary : PALETTE.surface,
                    color: isActive ? PALETTE.surface : PALETTE.text,
                    border: BORDERS.medium,
                    boxShadow: isActive ? SHADOWS.none : SHADOWS.sm,
                    transform: `translate(${isActive ? 2 : 0}px, ${isActive ? 2 : 0}px) scale(${interpolateValue(spring, [0, 1], [0.9, 1])})`,
                    padding: '8px 16px',
                    fontSize: 14,
                    fontWeight: TYPOGRAPHY.weights.black,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    minWidth: 96,
                  }}
                >
                  <span>{room.label}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: TYPOGRAPHY.weights.bold,
                      color: isActive ? 'rgba(255,255,255,0.85)' : PALETTE.textMuted,
                    }}
                  >
                    {room.desc}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ flex: 1 }} />
          <span
            style={{
              backgroundColor: selectedPrefix ? '#DCFCE7' : PALETTE.backgroundAlt,
              color: selectedPrefix ? '#166534' : PALETTE.textMuted,
              border: BORDERS.thin,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: TYPOGRAPHY.weights.extrabold,
              opacity: interpolateValue(frame, [38, 48], [0, 1]),
            }}
          >
            FILTER RUANGAN: {selectedPrefix ?? 'SEMUA'}
          </span>
        </Panel>

        {/* Candidate lab slots resolved from the chosen prefix */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, width: '100%' }}>
          {LAB_SLOTS.map((slot) => {
            const spring = calculateSpring(frame, slot.delay, SPRING_PRESETS.snappy);
            const opacity = interpolateValue(frame, [slot.delay, slot.delay + 12], [0, 1]);
            return (
              <Panel
                key={slot.code}
                style={{
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  transform: `translateY(${interpolateValue(spring, [0, 1], [30, 0])}px)`,
                  opacity,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      backgroundColor: '#000000',
                      color: PALETTE.surface,
                      fontFamily: TYPOGRAPHY.fontFamilyMono,
                      fontSize: 12,
                      fontWeight: TYPOGRAPHY.weights.black,
                      padding: '3px 10px',
                    }}
                  >
                    {slot.code}
                  </span>
                  <span
                    style={{
                      backgroundColor: PALETTE.secondary,
                      border: BORDERS.thin,
                      padding: '3px 10px',
                      fontSize: 12,
                      fontWeight: TYPOGRAPHY.weights.black,
                    }}
                  >
                    {slot.group}
                  </span>
                </div>
                <span style={{ fontSize: 17, fontWeight: TYPOGRAPHY.weights.black, textTransform: 'uppercase' }}>
                  {slot.name}
                </span>
                <div
                  style={{
                    backgroundColor: PALETTE.background,
                    border: BORDERS.thin,
                    padding: '8px 12px',
                    fontSize: 13,
                    fontWeight: TYPOGRAPHY.weights.bold,
                  }}
                >
                  WAKTU: {slot.time}
                </div>
              </Panel>
            );
          })}
        </div>
      </SceneBody>
    </SceneRoot>
  );
};