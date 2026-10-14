import React from 'react';
import {
  PALETTE,
  SHADOWS,
  BORDERS,
  TYPOGRAPHY,
  CANVAS,
  interpolateValue,
  calculateSpring,
  SPRING_PRESETS,
} from './designTokens';

// ============================================================================
// 1. MAIN LAYOUT CONTAINER
// ============================================================================

export interface VideoLayoutContainerProps {
  frame: number;
  children: React.ReactNode;
}

export const VideoLayoutContainer: React.FC<VideoLayoutContainerProps> = ({ frame, children }) => {
  const containerScale = interpolateValue(frame, [0, 15], [0.96, 1.0], (t) => Math.sin((t * Math.PI) / 2));
  const containerOpacity = interpolateValue(frame, [0, 12], [0, 1]);

  return (
    <div
      style={{
        width: CANVAS.width,
        height: CANVAS.height,
        backgroundColor: PALETTE.background,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: TYPOGRAPHY.fontFamily,
        color: PALETTE.text,
        boxSizing: 'border-box',
        transform: `scale(${containerScale})`,
        opacity: containerOpacity,
        backgroundImage: `
          radial-gradient(${PALETTE.border} 1px, transparent 1px),
          linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px, 64px 64px, 64px 64px',
      }}
    >
      {/* Top Window Chrome Bar */}
      <div
        style={{
          height: 64,
          backgroundColor: PALETTE.surface,
          borderBottom: BORDERS.thick,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          boxSizing: 'border-box',
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 32,
              height: 32,
              backgroundColor: PALETTE.primary,
              border: BORDERS.thin,
              boxShadow: SHADOWS.sm,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: TYPOGRAPHY.weights.black,
              fontSize: 16,
            }}
          >
            U
          </div>
          <span
            style={{
              fontWeight: TYPOGRAPHY.weights.black,
              fontSize: 18,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            UBG SCHEDULE // AUTO GENERATOR
          </span>
          <span
            style={{
              backgroundColor: PALETTE.secondary,
              color: PALETTE.text,
              fontSize: 12,
              fontWeight: TYPOGRAPHY.weights.extrabold,
              padding: '3px 8px',
              border: BORDERS.thin,
              boxShadow: SHADOWS.sm,
            }}
          >
            v2.0 STABLE
          </span>
        </div>

        {/* Window controls and status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: PALETTE.surface,
              border: BORDERS.thin,
              padding: '4px 12px',
              boxShadow: SHADOWS.sm,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                backgroundColor: PALETTE.success,
                border: '1.5px solid #000000',
              }}
            />
            <span style={{ fontSize: 13, fontWeight: TYPOGRAPHY.weights.bold }}>
              ENGINE READY
            </span>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {['_', '[]', 'X'].map((ctrl) => (
              <div
                key={ctrl}
                style={{
                  width: 28,
                  height: 28,
                  backgroundColor: ctrl === 'X' ? PALETTE.error : PALETTE.surface,
                  color: ctrl === 'X' ? PALETTE.surface : PALETTE.text,
                  border: BORDERS.thin,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: TYPOGRAPHY.weights.extrabold,
                  fontSize: 12,
                  boxShadow: SHADOWS.sm,
                }}
              >
                {ctrl}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Viewport Content */}
      <div
        style={{
          flex: 1,
          padding: '28px 48px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {children}
      </div>
    </div>
  );
};

// ============================================================================
// 2. HERO TITLE BANNER WITH BADGE TAGS
// ============================================================================

export interface HeroTitleBannerProps {
  frame: number;
}

export const HeroTitleBanner: React.FC<HeroTitleBannerProps> = ({ frame }) => {
  const bannerSpring = calculateSpring(frame, 5, SPRING_PRESETS.snappy);
  const bannerY = interpolateValue(bannerSpring, [0, 1], [-60, 0]);
  const bannerOpacity = interpolateValue(frame, [5, 18], [0, 1]);

  const tags = [
    { label: 'MODE OTOMATIS', bg: PALETTE.tertiary, color: '#FFFFFF', delay: 14 },
    { label: 'SEMESTER GANJIL 2026/2027', bg: PALETTE.secondary, color: PALETTE.text, delay: 18 },
    { label: 'UNIVERSITAS BUMIGORA', bg: PALETTE.surface, color: PALETTE.text, delay: 22 },
  ];

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: PALETTE.primary,
        border: BORDERS.thick,
        boxShadow: SHADOWS.lg,
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        boxSizing: 'border-box',
        transform: `translateY(${bannerY}px)`,
        opacity: bannerOpacity,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 40,
              lineHeight: 1.1,
              fontWeight: TYPOGRAPHY.weights.black,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
              color: PALETTE.text,
            }}
          >
            SUSUN JADWAL KULIAH CEPAT & BEBAS BENTROK
          </h1>
          <p
            style={{
              margin: '8px 0 0 0',
              fontSize: 18,
              fontWeight: TYPOGRAPHY.weights.bold,
              color: '#1E293B',
            }}
          >
            Unggah file KRS dan jadwal praktikum, pilih kelas, beres dalam hitungan detik.
          </p>
        </div>

        <div
          style={{
            backgroundColor: PALETTE.surface,
            border: BORDERS.medium,
            boxShadow: SHADOWS.base,
            padding: '8px 16px',
            fontSize: 14,
            fontWeight: TYPOGRAPHY.weights.black,
            textTransform: 'uppercase',
          }}
        >
          STEP 01 - 03
        </div>
      </div>

      {/* Badges Container */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {tags.map((tag) => {
          const tagSpring = calculateSpring(frame, tag.delay, SPRING_PRESETS.bouncy);
          const tagScale = interpolateValue(tagSpring, [0, 1], [0.6, 1.0]);
          const tagOpacity = interpolateValue(frame, [tag.delay, tag.delay + 6], [0, 1]);

          return (
            <div
              key={tag.label}
              style={{
                backgroundColor: tag.bg,
                color: tag.color,
                border: BORDERS.thin,
                boxShadow: SHADOWS.sm,
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: TYPOGRAPHY.weights.extrabold,
                letterSpacing: '0.04em',
                transform: `scale(${tagScale})`,
                opacity: tagOpacity,
              }}
            >
              {tag.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 3. DUAL FILE UPLOAD CARDS (PDF TEORI & XLSX PRAKTIKUM)
// ============================================================================

export interface DualFileUploadCardsProps {
  frame: number;
}

export const DualFileUploadCards: React.FC<DualFileUploadCardsProps> = ({ frame }) => {
  // Entrance spring for both cards
  const cardsSpring = calculateSpring(frame, 25, SPRING_PRESETS.snappy);
  const cardsY = interpolateValue(cardsSpring, [0, 1], [40, 0]);
  const cardsOpacity = interpolateValue(frame, [25, 38], [0, 1]);

  // Card A simulated drop at frame 48
  const isTeoriDropped = frame >= 48;
  const dropAImpact = interpolateValue(frame, [48, 52, 58], [0, 3, 0]);

  // Card B simulated drop at frame 62
  const isPraktikumDropped = frame >= 62;
  const dropBImpact = interpolateValue(frame, [62, 66, 72], [0, 3, 0]);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 24,
        width: '100%',
        boxSizing: 'border-box',
        transform: `translateY(${cardsY}px)`,
        opacity: cardsOpacity,
      }}
    >
      {/* CARD A: PDF TEORI */}
      <div
        style={{
          backgroundColor: isTeoriDropped ? '#F0FDF4' : PALETTE.surface,
          border: BORDERS.medium,
          boxShadow: isTeoriDropped ? SHADOWS.base : SHADOWS.lg,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxSizing: 'border-box',
          transform: `translate(${dropAImpact}px, ${dropAImpact}px)`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                backgroundColor: PALETTE.error,
                color: '#FFFFFF',
                border: BORDERS.thin,
                boxShadow: SHADOWS.sm,
                fontSize: 12,
                fontWeight: TYPOGRAPHY.weights.black,
                padding: '4px 8px',
              }}
            >
              PDF
            </span>
            <span style={{ fontSize: 16, fontWeight: TYPOGRAPHY.weights.black, textTransform: 'uppercase' }}>
              Jadwal Kuliah Teori
            </span>
          </div>
          <span
            style={{
              backgroundColor: isTeoriDropped ? PALETTE.success : PALETTE.warning,
              color: isTeoriDropped ? '#FFFFFF' : PALETTE.text,
              border: BORDERS.thin,
              boxShadow: SHADOWS.sm,
              fontSize: 11,
              fontWeight: TYPOGRAPHY.weights.extrabold,
              padding: '3px 8px',
            }}
          >
            {isTeoriDropped ? 'TERPARSING' : 'WAJIB'}
          </span>
        </div>

        {/* Drop zone visual container */}
        <div
          style={{
            border: BORDERS.dashed,
            backgroundColor: isTeoriDropped ? '#DCFCE7' : PALETTE.backgroundAlt,
            padding: '24px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              backgroundColor: PALETTE.surface,
              border: BORDERS.thin,
              boxShadow: SHADOWS.sm,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: TYPOGRAPHY.weights.black,
            }}
          >
            {isTeoriDropped ? 'OK' : 'PDF'}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: TYPOGRAPHY.weights.extrabold }}>
              {isTeoriDropped ? 'Jadwal_Kuliah_Ganjil_2026.pdf' : 'Tarik & Letakkan Berkas PDF'}
            </div>
            <div style={{ fontSize: 13, fontWeight: TYPOGRAPHY.weights.medium, color: PALETTE.textMuted }}>
              {isTeoriDropped ? 'Ukuran: 1.2 MB | 142 Baris Jadwal Ditemukan' : 'Maksimal 15 MB format PDF resmi SIAM'}
            </div>
          </div>
        </div>

        {/* Progress or status bar */}
        <div
          style={{
            height: 12,
            backgroundColor: '#E2E8F0',
            border: BORDERS.thin,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              backgroundColor: PALETTE.tertiary,
              width: isTeoriDropped ? '100%' : '0%',
            }}
          />
        </div>
      </div>

      {/* CARD B: XLSX PRAKTIKUM */}
      <div
        style={{
          backgroundColor: isPraktikumDropped ? '#F0FDF4' : PALETTE.surface,
          border: BORDERS.medium,
          boxShadow: isPraktikumDropped ? SHADOWS.base : SHADOWS.lg,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxSizing: 'border-box',
          transform: `translate(${dropBImpact}px, ${dropBImpact}px)`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                backgroundColor: PALETTE.success,
                color: '#FFFFFF',
                border: BORDERS.thin,
                boxShadow: SHADOWS.sm,
                fontSize: 12,
                fontWeight: TYPOGRAPHY.weights.black,
                padding: '4px 8px',
              }}
            >
              XLSX
            </span>
            <span style={{ fontSize: 16, fontWeight: TYPOGRAPHY.weights.black, textTransform: 'uppercase' }}>
              Jadwal Praktikum Lab
            </span>
          </div>
          <span
            style={{
              backgroundColor: isPraktikumDropped ? PALETTE.success : PALETTE.secondary,
              color: isPraktikumDropped ? '#FFFFFF' : PALETTE.text,
              border: BORDERS.thin,
              boxShadow: SHADOWS.sm,
              fontSize: 11,
              fontWeight: TYPOGRAPHY.weights.extrabold,
              padding: '3px 8px',
            }}
          >
            {isPraktikumDropped ? 'TERPARSING' : 'OPSIONAL'}
          </span>
        </div>

        {/* Drop zone visual container */}
        <div
          style={{
            border: BORDERS.dashed,
            backgroundColor: isPraktikumDropped ? '#DCFCE7' : PALETTE.backgroundAlt,
            padding: '24px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              backgroundColor: PALETTE.surface,
              border: BORDERS.thin,
              boxShadow: SHADOWS.sm,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: TYPOGRAPHY.weights.black,
            }}
          >
            {isPraktikumDropped ? 'OK' : 'XLS'}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: TYPOGRAPHY.weights.extrabold }}>
              {isPraktikumDropped ? 'Jadwal_Labkom_Semester5.xlsx' : 'Tarik & Letakkan Berkas Excel'}
            </div>
            <div style={{ fontSize: 13, fontWeight: TYPOGRAPHY.weights.medium, color: PALETTE.textMuted }}>
              {isPraktikumDropped ? 'Ukuran: 640 KB | 28 Slot Praktikum Ditemukan' : 'Format .xlsx atau .xls lab universitas'}
            </div>
          </div>
        </div>

        {/* Progress or status bar */}
        <div
          style={{
            height: 12,
            backgroundColor: '#E2E8F0',
            border: BORDERS.thin,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              backgroundColor: PALETTE.secondary,
              width: isPraktikumDropped ? '100%' : '0%',
            }}
          />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. SIMULATED CLASS SELECTION CHECKLIST & TAGS
// ============================================================================

export interface ClassSelectionChecklistProps {
  frame: number;
}

export const ClassSelectionChecklist: React.FC<ClassSelectionChecklistProps> = ({ frame }) => {
  const containerSpring = calculateSpring(frame, 68, SPRING_PRESETS.snappy);
  const containerY = interpolateValue(containerSpring, [0, 1], [40, 0]);
  const containerOpacity = interpolateValue(frame, [68, 78], [0, 1]);

  const items = [
    { code: 'TIF201', name: 'ALGORITMA & STRUKTUR DATA', section: 'TI-A', sks: '3 SKS', frameCheck: 76 },
    { code: 'TIF205', name: 'PEMROGRAMAN WEB LANJUT', section: 'TI-A', sks: '3 SKS', frameCheck: 82 },
    { code: 'TIF209', name: 'BASIS DATA RELASIONAL', section: 'TI-A', sks: '3 SKS', frameCheck: 88 },
    { code: 'LAB102', name: 'PRAKTIKUM BASIS DATA (LAB 02)', section: 'Kelompok 2', sks: '1 SKS', frameCheck: 94 },
  ];

  const totalSKS = interpolateValue(frame, [74, 98], [0, 10]);

  return (
    <div
      style={{
        backgroundColor: PALETTE.surface,
        border: BORDERS.thick,
        boxShadow: SHADOWS.lg,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        boxSizing: 'border-box',
        transform: `translateY(${containerY}px)`,
        opacity: containerOpacity,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: TYPOGRAPHY.weights.black,
              textTransform: 'uppercase',
            }}
          >
            PILIH KELAS & MATA KULIAH
          </h2>
          <span style={{ fontSize: 13, fontWeight: TYPOGRAPHY.weights.bold, color: PALETTE.textMuted }}>
            Pilih section kelas otomatis berdasarkan kode KRS yang terinput
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              backgroundColor: PALETTE.primary,
              border: BORDERS.thin,
              boxShadow: SHADOWS.sm,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: TYPOGRAPHY.weights.black,
            }}
          >
            TOTAL: {Math.floor(totalSKS)} SKS TERPILIH
          </div>
          <div
            style={{
              backgroundColor: PALETTE.tertiary,
              color: '#FFFFFF',
              border: BORDERS.thin,
              boxShadow: SHADOWS.sm,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: TYPOGRAPHY.weights.extrabold,
            }}
          >
            FILTER GLOBAL: TI-A
          </div>
        </div>
      </div>

      {/* Row Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item) => {
          const isChecked = frame >= item.frameCheck;
          const checkScale = isChecked
            ? calculateSpring(frame, item.frameCheck, SPRING_PRESETS.bouncy)
            : 0;

          return (
            <div
              key={item.code}
              style={{
                backgroundColor: isChecked ? '#EFF6FF' : PALETTE.surface,
                border: BORDERS.thin,
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: isChecked ? SHADOWS.sm : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Brutalist Square Checkbox */}
                <div
                  style={{
                    width: 26,
                    height: 26,
                    backgroundColor: isChecked ? PALETTE.tertiary : PALETTE.surface,
                    border: BORDERS.thin,
                    boxShadow: SHADOWS.sm,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: `scale(${isChecked ? Math.min(1.05, checkScale) : 1})`,
                  }}
                >
                  {isChecked && (
                    <div
                      style={{
                        color: '#FFFFFF',
                        fontWeight: TYPOGRAPHY.weights.black,
                        fontSize: 14,
                        lineHeight: 1,
                      }}
                    >
                      [x]
                    </div>
                  )}
                </div>

                <div
                  style={{
                    backgroundColor: '#000000',
                    color: '#FFFFFF',
                    fontFamily: TYPOGRAPHY.fontFamilyMono,
                    fontSize: 12,
                    fontWeight: TYPOGRAPHY.weights.black,
                    padding: '2px 8px',
                    border: '1px solid #000000',
                  }}
                >
                  {item.code}
                </div>

                <span style={{ fontSize: 15, fontWeight: TYPOGRAPHY.weights.extrabold }}>
                  {item.name}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    backgroundColor: PALETTE.secondary,
                    border: BORDERS.thin,
                    padding: '3px 10px',
                    fontSize: 12,
                    fontWeight: TYPOGRAPHY.weights.black,
                  }}
                >
                  {item.section}
                </span>
                <span
                  style={{
                    backgroundColor: '#000000',
                    color: '#FFFFFF',
                    padding: '3px 10px',
                    fontSize: 12,
                    fontWeight: TYPOGRAPHY.weights.black,
                  }}
                >
                  {item.sks}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 5. SCHEDULE RESULT CARDS WITH BENTROK BADGE & WARNING MOTION
// ============================================================================

export interface ScheduleResultCardsProps {
  frame: number;
}

export const ScheduleResultCards: React.FC<ScheduleResultCardsProps> = ({ frame }) => {
  const containerSpring = calculateSpring(frame, 95, SPRING_PRESETS.snappy);
  const containerY = interpolateValue(containerSpring, [0, 1], [40, 0]);
  const containerOpacity = interpolateValue(frame, [95, 105], [0, 1]);

  // Warning oscillation formula for collision alert: 8hz oscillation between frames 110 and 160
  const isAlertActive = frame >= 110;
  const shakeOffset = isAlertActive
    ? Math.sin((frame - 110) * 0.9) * 3.5 * Math.max(0, 1 - (frame - 110) / 70)
    : 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        width: '100%',
        boxSizing: 'border-box',
        transform: `translateY(${containerY}px)`,
        opacity: containerOpacity,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 14, height: 14, backgroundColor: '#000000' }} />
        <h2
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: TYPOGRAPHY.weights.black,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          SENIN (HASIL EVALUASI JADWAL)
        </h2>
        <div style={{ flex: 1, height: 2, backgroundColor: '#000000', opacity: 0.2 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* CARD 1: NORMAL CLASS */}
        <div
          style={{
            backgroundColor: PALETTE.surface,
            border: BORDERS.medium,
            boxShadow: SHADOWS.base,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span
                style={{
                  backgroundColor: PALETTE.tertiary,
                  color: '#FFFFFF',
                  border: BORDERS.thin,
                  fontSize: 11,
                  fontWeight: TYPOGRAPHY.weights.black,
                  padding: '2px 8px',
                }}
              >
                TIF201
              </span>
              <span
                style={{
                  backgroundColor: '#000000',
                  color: '#FFFFFF',
                  fontSize: 11,
                  fontWeight: TYPOGRAPHY.weights.black,
                  padding: '2px 8px',
                }}
              >
                3 SKS
              </span>
            </div>
            <span
              style={{
                backgroundColor: '#DCFCE7',
                color: '#166534',
                border: BORDERS.thin,
                fontSize: 11,
                fontWeight: TYPOGRAPHY.weights.black,
                padding: '2px 8px',
              }}
            >
              AMAN
            </span>
          </div>

          <h3
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: TYPOGRAPHY.weights.black,
              textTransform: 'uppercase',
              lineHeight: 1.2,
            }}
          >
            ALGORITMA & STRUKTUR DATA (TI-A)
          </h3>

          <div
            style={{
              backgroundColor: PALETTE.background,
              border: BORDERS.thin,
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              fontSize: 13,
              fontWeight: TYPOGRAPHY.weights.bold,
            }}
          >
            <div>WAKTU: 08.00 - 10.30 WITA</div>
            <div>RUANG: R.302 (GEDUNG BARU)</div>
            <div style={{ color: PALETTE.textMuted }}>DOSEN: Dr. Aris Sudarsono, M.Kom</div>
          </div>
        </div>

        {/* CARD 2: BENTROK CONFLICT CLASS */}
        <div
          style={{
            backgroundColor: PALETTE.primary,
            border: BORDERS.medium,
            boxShadow: SHADOWS.base,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            position: 'relative',
            transform: `translateX(${shakeOffset}px)`,
          }}
        >
          {/* Highlighted Warning Badge */}
          <div
            style={{
              position: 'absolute',
              top: -14,
              right: -10,
              backgroundColor: PALETTE.error,
              color: '#FFFFFF',
              border: BORDERS.medium,
              boxShadow: SHADOWS.sm,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: TYPOGRAPHY.weights.black,
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              zIndex: 10,
            }}
          >
            <span>[!] BENTROK 60 MENIT</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span
                style={{
                  backgroundColor: '#000000',
                  color: '#FFFFFF',
                  border: BORDERS.thin,
                  fontSize: 11,
                  fontWeight: TYPOGRAPHY.weights.black,
                  padding: '2px 8px',
                }}
              >
                TIF205
              </span>
              <span
                style={{
                  backgroundColor: '#000000',
                  color: '#FFFFFF',
                  fontSize: 11,
                  fontWeight: TYPOGRAPHY.weights.black,
                  padding: '2px 8px',
                }}
              >
                3 SKS
              </span>
            </div>
          </div>

          <h3
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: TYPOGRAPHY.weights.black,
              textTransform: 'uppercase',
              lineHeight: 1.2,
            }}
          >
            PEMROGRAMAN WEB LANJUT (TI-B)
          </h3>

          <div
            style={{
              backgroundColor: 'rgba(255,255,255,0.85)',
              border: BORDERS.thin,
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              fontSize: 13,
              fontWeight: TYPOGRAPHY.weights.bold,
            }}
          >
            <div style={{ color: PALETTE.error }}>WAKTU: 09.30 - 12.00 WITA (TUMPANG TINDIH)</div>
            <div>RUANG: LAB KOMPUTER 01</div>
            <div style={{ color: PALETTE.textMuted }}>DOSEN: M. Zulfikar, M.T</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 6. EXPORT BUTTON BAR (ICS, GAMBAR PNG, TEKS)
// ============================================================================

export interface ExportButtonBarProps {
  frame: number;
}

export const ExportButtonBar: React.FC<ExportButtonBarProps> = ({ frame }) => {
  const barSpring = calculateSpring(frame, 120, SPRING_PRESETS.snappy);
  const barY = interpolateValue(barSpring, [0, 1], [60, 0]);
  const barOpacity = interpolateValue(frame, [120, 130], [0, 1]);

  // Simulated button press physics for "UNDUH GAMBAR PNG" at frame 145-155
  const isPressed = frame >= 145 && frame <= 155;
  const isDownloaded = frame > 155;

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: PALETTE.surface,
        border: BORDERS.thick,
        boxShadow: SHADOWS.lg,
        padding: '16px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        transform: `translateY(${barY}px)`,
        opacity: barOpacity,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 12,
            height: 12,
            backgroundColor: PALETTE.success,
            border: '2px solid #000000',
          }}
        />
        <span
          style={{
            fontSize: 15,
            fontWeight: TYPOGRAPHY.weights.extrabold,
            textTransform: 'uppercase',
          }}
        >
          Jadwal Siap Diekspor Ke Kalender & Gambar
        </span>
      </div>

      <div style={{ display: 'flex', gap: 14 }}>
        {/* BUTTON 1: ICS KALENDER */}
        <button
          type="button"
          style={{
            backgroundColor: PALETTE.tertiary,
            color: '#FFFFFF',
            border: BORDERS.medium,
            boxShadow: SHADOWS.base,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: TYPOGRAPHY.weights.black,
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          EKSPOR ICS (.CAL)
        </button>

        {/* BUTTON 2: UNDUH GAMBAR PNG (ACTIVE SIMULATION) */}
        <button
          type="button"
          style={{
            backgroundColor: isDownloaded ? PALETTE.success : PALETTE.primary,
            color: isDownloaded ? '#FFFFFF' : PALETTE.text,
            border: BORDERS.medium,
            boxShadow: isPressed ? SHADOWS.none : SHADOWS.base,
            transform: isPressed ? 'translate(4px, 4px)' : 'translate(0px, 0px)',
            padding: '10px 22px',
            fontSize: 14,
            fontWeight: TYPOGRAPHY.weights.black,
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          {isDownloaded ? 'TERUNDUH BERHASIL!' : 'UNDUH GAMBAR PNG'}
        </button>

        {/* BUTTON 3: SALIN JADWAL TEKS */}
        <button
          type="button"
          style={{
            backgroundColor: PALETTE.surface,
            color: PALETTE.text,
            border: BORDERS.medium,
            boxShadow: SHADOWS.base,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: TYPOGRAPHY.weights.black,
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          SALIN TEKS
        </button>
      </div>
    </div>
  );
};
