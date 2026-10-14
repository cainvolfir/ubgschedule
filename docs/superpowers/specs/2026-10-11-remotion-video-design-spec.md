# UBG Schedule Video Design Specification

## 1. Design System Tokens & Geometry Contract

### 1.1 Palette Tokens
- Primary: `#FFD13B` (Vibrant Yellow, hero header and conflict card highlight)
- Secondary: `#FF90E8` (Pink, practical course tag and semester badge)
- Tertiary / Action: `#3B82F6` (Electric Blue, primary buttons and course codes)
- Accent: `#2563EB` (Royal Blue, active checkboxes and selection pills)
- Success: `#10B981` (Emerald Green, verified parse status and download confirmed)
- Error / Conflict: `#F43F5E` (Rose Red, collision warnings and bentrok badge)
- Surface: `#FFFFFF` (Solid White card bases and container backgrounds)
- Background: `#EFF6FF` (Ice Blue, canvas base tint)
- Background Neutral: `#F8FAFC` (Dropzone inner background)
- Text Primary: `#0F172A` (Slate 900, passes WCAG AAA on white, yellow, and pink)
- Text Inverted: `#FFFFFF` (High contrast text on blue, red, green, and black badges)
- Stroke / Border: `#000000` (Pitch black high-contrast outlines)

### 1.2 Geometry Contract: Neubrutalism Mode A (Pure Boxy)
- All shapes enforce `border-radius: 0` (`rounded-none`).
- No rounded pills, no curved corners on buttons, cards, dropzones, or badges.
- Checkboxes use custom square boxes (26x26px, 2px solid black border, hard shadow).
- Window control buttons and badges use sharp 90-degree boxes.

### 1.3 Border & Stroke Tokens
- Window Frame & Main Hero: `4px solid #000000`
- Cards & Interactive Buttons: `3px solid #000000`
- Badges & Internal Metadata Boxes: `2px solid #000000`
- Dropzone Guides: `3px dashed #000000`

### 1.4 Hard Shadow Tokens
- Zero blur, positive bottom-right offset:
  - Small / Badges: `2px 2px 0px #000000`
  - Base / Buttons & Inner Cards: `4px 4px 0px #000000`
  - Large / Outer Containers & Hero: `6px 6px 0px #000000`
  - Flattened / Active Press: `0px 0px 0px #000000`

---

## 2. Remotion Motion Physics & Timeline Budget

### 2.1 Video Target Specifications
- Canvas Dimensions: 1920x1080 px (16:9 widescreen)
- Target Frame Rate: 30 FPS
- Animation Engine: Remotion React inline frame calculations (`useCurrentFrame()`, `interpolate()`, `spring()`).
- Strict Rule: Zero CSS transitions (`transition: ...`) and zero CSS keyframe animations (`animation: ...`). All transforms must be driven by deterministic frame calculations.

### 2.2 Spring Presets
- Snappy Entrance: `damping: 18, mass: 0.9, stiffness: 180`
- Bouncy Badge Pop: `damping: 12, mass: 0.8, stiffness: 140`
- Rigid Press / Collision: `damping: 24, mass: 1.0, stiffness: 220`

### 2.3 Master Frame Sequence (Total 180 frames / 6.0 seconds)
- Frame 0 - 15: Main window container scales in from 0.96 to 1.0, opacity 0 to 1.
- Frame 5 - 24: Hero title banner drops in from Y: -60px to 0px.
- Frame 14 - 28: Staggered badge pills pop into the hero banner.
- Frame 25 - 45: Dual upload cards slide up from Y: 40px to 0px.
- Frame 48 - 58: PDF file lands in Card A (3px impact depression, status switches to parsed).
- Frame 62 - 72: XLSX file lands in Card B (3px impact depression, status switches to parsed).
- Frame 68 - 98: Class selection checklist panel enters and checkboxes trigger sequentially.
- Frame 95 - 125: Schedule result cards enter with day header.
- Frame 110 - 160: Conflict warning badge triggers sinusoidal shake on the collided card.
- Frame 120 - 145: Export button bar slides up from bottom.
- Frame 145 - 165: Simulated click triggers mechanical button depression on "UNDUH GAMBAR PNG".

---

## 3. Visual Component Architecture

### Component 1: VideoLayoutContainer
- Renders the 1920x1080 canvas with brutalist dot and grid background pattern.
- Top bar displays simulated retro desktop chrome with window title and sharp status indicators.
- File path: `src/remotion/VideoMockupComponents.tsx` -> `VideoLayoutContainer`

### Component 2: HeroTitleBanner
- Bold yellow background (`#FFD13B`) with 4px solid black border and 6px hard shadow.
- Staggered badges:
  - "MODE OTOMATIS" (Blue `#3B82F6`)
  - "SEMESTER GANJIL 2026/2027" (Pink `#FF90E8`)
  - "UNIVERSITAS BUMIGORA" (White `#FFFFFF`)
- Spring interpolation handles entry without motion blur artifacts.

### Component 3: DualFileUploadCards
- Two 50% width cards side-by-side:
  - Left: Jadwal Kuliah Teori (PDF) with red file badge.
  - Right: Jadwal Praktikum Lab (XLSX) with green file badge.
- Inner dashed dropzones with simulated landing states and progress indicators.

### Component 4: ClassSelectionChecklist
- Panel with total SKS counter and global section filter.
- 4 sample course rows:
  - TIF201: Algoritma & Struktur Data (TI-A, 3 SKS)
  - TIF205: Pemrograman Web Lanjut (TI-A, 3 SKS)
  - TIF209: Basis Data Relasional (TI-A, 3 SKS)
  - LAB102: Praktikum Basis Data (Kelompok 2, 1 SKS)
- Custom square brutalist checkboxes with tactile checked states.

### Component 5: ScheduleResultCards
- Day section marker for "SENIN".
- Two result cards side-by-side:
  - Card 1: Normal lecture (08.00 - 10.30 WITA, green status).
  - Card 2: Conflict lecture (09.30 - 12.00 WITA, yellow fill, red time text).
- "Bentrok!" Warning Badge:
  - Positioned at `-top-4 -right-2`.
  - Driven by `Math.sin((frame - 110) * 0.9) * 3.5px` horizontal oscillation.

### Component 6: ExportButtonBar
- Fixed bottom toolbar with 4px border and 6px hard shadow.
- Three export options:
  - "EKSPOR ICS (.CAL)"
  - "UNDUH GAMBAR PNG"
  - "SALIN TEKS"
- Simulated mouse interaction: button depresses 4px into the canvas and drops its shadow to 0px, followed by green confirmed feedback.

---

## 4. Remotion Native Equivalent Snippet

When porting to an active Remotion environment, replace the local helpers with native Remotion imports:

```tsx
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

// Native Spring usage
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const entrance = spring({
  frame: frame - 10,
  fps,
  config: { damping: 18, mass: 0.9, stiffness: 180 },
});

const translateY = interpolate(entrance, [0, 1], [60, 0], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
});
```
