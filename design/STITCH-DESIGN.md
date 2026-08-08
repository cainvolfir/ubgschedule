# Stitch Design — UBG Schedule

Standalone copy of the Google Stitch design for this project. Move it into the app first, wire features after.

## Source
- **Reference screen**: [`public/design/step1-upload-teori.html`](../public/design/step1-upload-teori.html) — the exact HTML Stitch generated for "Step 1: Upload Jadwal Teori" (servable at `/design/step1-upload-teori.html`).
- **Theme config**: [`stitch-tailwind-theme.mjs`](stitch-tailwind-theme.mjs) — Tailwind `theme.extend` object extracted verbatim from the reference (colors, borderRadius, spacing, fontFamily, fontSize).
- **Stitch project**: `projects/9570590112442480687` "UBG Schedule Design System" (design system tokens in its `designMd`).

## Design language (from reference)
- **Fonts**: Playfair Display (serif, H1/H2 titles), Plus Jakarta Sans (UI), JetBrains Mono (logs).
- **Colors**: light bg `#F3F3F3`, surface `#FFFFFF`, dropzone `#EFEFEF`, primary black `#000000`; dark bg `#0A0A0A`, surface `#141414`, dropzone `#1E1E1E`, primary white. Semantic: success `#10B981`, warning `#F59E0B`, error `#EF4444`.
- **Canvas**: fixed vertical grid lines every 64px (`#E7E7E7` light / `#1F1F1F` dark).
- **Radius**: modal 28px, dropzone 16px, cards 12px, buttons full pill.
- **Buttons**: min-height 48px, full pill; primary black-on-white (inverts in dark); outline secondary.
- **Header**: brand serif + calendar icon; 3-step pill progress (numbered circles); theme toggle sliding pill (sun/moon).
- **Dropzone**: centered white circle badge with `cloud_upload` Material Symbol; dashed border on hover; "Tarik & lepas file PDF di sini atau klik untuk memilih file".
- **File card**: surface-container-low, PDF icon left, filename + status (Selesai / Memproses with %), delete/close icon.
- **Worker log**: JetBrains Mono, `[18:40:12] Web Worker scanning PDF...` style.
- **Footer actions**: Kembali (outline) / Lanjut ke Praktikum (primary + arrow) split by border-t.

## Files (at source of truth)
| File | Purpose |
|---|---|
| `public/design/step1-upload-teori.html` | reference screen (browser at `/design/step1-upload-teori.html`) |
| `design/stitch-tailwind-theme.mjs` | theme.extend JSON for tailwind.config.js |
| `design/STITCH-DESIGN.md` | this file |

## Phase 2 — connecting to features (next)
Map existing feature markup onto the Stitch layout:
1. `tailwind.config.js` — merge `stitch-tailwind-theme.mjs` into `theme.extend` (plus dark token names: `dark-surface`, `dark-background`, `dark-border`, `dark-canvas-line`, `dark-dropzone`, `dark-primary`, `dark-success`, `dark-warning`, `dark-error`).
2. `index.css` — keep @tailwind + fonts + `.grid-canvas` + `.card` (28px modal) + Material Symbols import.
3. `RootLayout` — Stitch header (brand, progress pills, toggle) + grid-canvas; pages render own `.card`.
4. `UploadTeoriPage` — mirror reference markup (header text, dropzone, file states, worker log, footer actions) with existing logic (worker, filters, selection).
5. `UploadPraktikumPage` — same design language; XLSX variant (prefix select, candidates table, continue/skip).
6. `ResultPage` — design language cards/table; search bar, collision badge, edit/add forms, export pill buttons, stats cards.
7. Keep workers, store, routing, exporters byte-identical.
