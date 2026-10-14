import React from 'react';
import { PALETTE, SHADOWS, BORDERS, TYPOGRAPHY, interpolateValue, calculateSpring, SPRING_PRESETS } from './designTokens';
import { SceneRoot, SceneBody, Panel } from './SceneShell';

export interface Scene6OutroProps {
  frame: number;
}

const DEPLOY_URL = 'ubgjadwal.vercel.app';

export const Scene6Outro: React.FC<Scene6OutroProps> = ({ frame }) => {
  const bannerSpring = calculateSpring(frame, 4, SPRING_PRESETS.snappy);
  const bannerY = interpolateValue(bannerSpring, [0, 1], [-40, 0]);
  const bannerOpacity = interpolateValue(frame, [4, 16], [0, 1]);

  const ctaSpring = calculateSpring(frame, 46, SPRING_PRESETS.bouncy);
  const ctaScale = interpolateValue(ctaSpring, [0, 1], [0.9, 1]);
  const ctaOpacity = interpolateValue(frame, [46, 58], [0, 1]);

  return (
    <SceneRoot>
      <SceneBody>
        <Panel
          background={PALETTE.primary}
          shadow={SHADOWS.lg}
          style={{
            padding: '36px 40px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            transform: `translateY(${bannerY}px)`,
            opacity: bannerOpacity,
          }}
        >
          <span
            style={{
              alignSelf: 'flex-start',
              backgroundColor: '#000000',
              color: PALETTE.surface,
              border: BORDERS.thin,
              boxShadow: SHADOWS.sm,
              padding: '5px 16px',
              fontSize: 14,
              fontWeight: TYPOGRAPHY.weights.black,
              letterSpacing: '0.08em',
            }}
          >
            SIAP DIPAKAI SEKARANG
          </span>
          <h1
            style={{
              margin: 0,
              fontSize: 64,
              lineHeight: 1.02,
              fontWeight: TYPOGRAPHY.weights.black,
              textTransform: 'uppercase',
              letterSpacing: '-0.03em',
            }}
          >
            UBG Schedule Di Web, Gratis
          </h1>
          <p style={{ margin: 0, fontSize: 22, fontWeight: TYPOGRAPHY.weights.bold, color: '#1E293B', lineHeight: 1.35, maxWidth: 1180 }}>
            Satukan PDF teori dan Excel praktikum, deteksi bentrok, lalu ekspor ke kalender. Simpan sebagai PWA supaya
            bisa dibuka seperti aplikasi tanpa install rumit.
          </p>
        </Panel>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, width: '100%', alignItems: 'stretch' }}>
          {/* Simulated browser address bar with the live deploy URL */}
          <Panel
            shadow={SHADOWS.lg}
            style={{
              padding: 22,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              opacity: interpolateValue(frame, [18, 32], [0, 1]),
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 26, height: 26, backgroundColor: PALETTE.error, border: BORDERS.thin }} />
              <div style={{ width: 26, height: 26, backgroundColor: PALETTE.primary, border: BORDERS.thin }} />
              <div style={{ width: 26, height: 26, backgroundColor: PALETTE.success, border: BORDERS.thin }} />
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                backgroundColor: PALETTE.backgroundAlt,
                border: BORDERS.medium,
                boxShadow: SHADOWS.sm,
                padding: '14px 18px',
              }}
            >
              <span style={{ fontSize: 15, fontWeight: TYPOGRAPHY.weights.black, color: PALETTE.success }}>AMAN</span>
              <span
                style={{
                  fontFamily: TYPOGRAPHY.fontFamilyMono,
                  fontSize: 24,
                  fontWeight: TYPOGRAPHY.weights.black,
                  color: PALETTE.tertiary,
                }}
              >
                https://{DEPLOY_URL}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <span
                style={{
                  backgroundColor: PALETTE.secondary,
                  border: BORDERS.thin,
                  boxShadow: SHADOWS.sm,
                  padding: '6px 14px',
                  fontSize: 14,
                  fontWeight: TYPOGRAPHY.weights.black,
                }}
              >
                Tanpa login
              </span>
              <span
                style={{
                  backgroundColor: PALETTE.surface,
                  border: BORDERS.thin,
                  boxShadow: SHADOWS.sm,
                  padding: '6px 14px',
                  fontSize: 14,
                  fontWeight: TYPOGRAPHY.weights.black,
                }}
              >
                Tanpa biaya
              </span>
            </div>
          </Panel>

          {/* PWA install hint */}
          <Panel
            background="#ECFDF5"
            style={{
              padding: 22,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              opacity: interpolateValue(frame, [30, 44], [0, 1]),
            }}
          >
            <span
              style={{
                alignSelf: 'flex-start',
                backgroundColor: PALETTE.success,
                color: PALETTE.surface,
                border: BORDERS.thin,
                boxShadow: SHADOWS.sm,
                padding: '4px 14px',
                fontSize: 13,
                fontWeight: TYPOGRAPHY.weights.black,
                letterSpacing: '0.06em',
              }}
            >
              PWA
            </span>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: TYPOGRAPHY.weights.black, textTransform: 'uppercase' }}>
              Simpan Ke Layar Utama
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Buka tautan di browser', 'Pilih menu Tambah ke layar utama', 'Jalankan seperti aplikasi biasa'].map(
                (step, index) => (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        flexShrink: 0,
                        backgroundColor: PALETTE.success,
                        color: PALETTE.surface,
                        border: BORDERS.thin,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: TYPOGRAPHY.weights.black,
                      }}
                    >
                      {index + 1}
                    </div>
                    <span style={{ fontSize: 15, fontWeight: TYPOGRAPHY.weights.bold, color: '#166534' }}>{step}</span>
                  </div>
                )
              )}
            </div>
          </Panel>
        </div>

        <div
          style={{
            display: 'flex',
            width: '100%',
            transform: `scale(${ctaScale})`,
            opacity: ctaOpacity,
          }}
        >
          <div
            style={{
              flex: 1,
              backgroundColor: PALETTE.tertiary,
              color: PALETTE.surface,
              border: BORDERS.thick,
              boxShadow: SHADOWS.lg,
              padding: '20px 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 30, fontWeight: TYPOGRAPHY.weights.black, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
              Susun jadwalmu sekarang
            </span>
            <span
              style={{
                backgroundColor: PALETTE.primary,
                color: PALETTE.text,
                border: BORDERS.medium,
                boxShadow: SHADOWS.base,
                padding: '12px 26px',
                fontSize: 22,
                fontWeight: TYPOGRAPHY.weights.black,
                textTransform: 'uppercase',
              }}
            >
              {DEPLOY_URL}
            </span>
          </div>
        </div>
      </SceneBody>
    </SceneRoot>
  );
};