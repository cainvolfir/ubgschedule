# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**UBG Schedule** — an unofficial schedule organizer for Universitas Bumigora students. It's a client-side web app that parses university schedule documents (PDFs and XLSX) and produces a unified class schedule with conflict detection.

## Tech Stack

- **React 19** + **TypeScript** (~6.0.2) + **Vite 8**
- **Tailwind CSS 3** with `darkMode: 'class'`
- **Zustand 5** for global state
- **react-router-dom 7** (BrowserRouter)
- **pdfjs-dist** for PDF parsing (in Web Workers)
- **xlsx** (SheetJS) for XLSX parsing (in Web Workers)
- **Radix UI** primitives (Select, Slot) wrapped with custom pixel-art styling
- **class-variance-authority** + **clsx** + **tailwind-merge** for component variants
- **lucide-react** for icons
- **framer-motion** (present but not actively used in current pages)

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check (`tsc -b`) then build with Vite |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |

## Architecture

### Wizard Flow (4 steps)

The app is a linear wizard driven by local component state (`WizardStep` in `App.tsx`), not URL routes:

1. **UploadKrsPage** — Upload a KRS (Study Plan) PDF → extracts student name, NIM, semester, and verified course codes
2. **UploadTeoriPage** — Upload a Theory schedule PDF → filters by verified course codes, lets user pick a class (e.g., "Class A") per course
3. **UploadPraktikumPage** — Upload a Practical schedule XLSX → scan for room prefixes, parse candidates, user selects which to include
4. **ResultPage** — Merges theory + practical schedules, detects time collisions, displays table + mobile cards, offers PNG export

### State Management

Single Zustand store (`src/store/useJadwalStore.ts`) holds all wizard data:
- `dataKRS`, `kodeMKTerverifikasi` — from KRS PDF
- `dataTeoriMentah`, `kelasPilihanUser`, `jadwalTeoriTerpilih` — from theory PDF + user selections
- `praktikumCandidates`, `selectedCandidateIds`, `praktikumRoomPrefixes`, `selectedRoomPrefix` — from praktikum XLSX
- `jadwalFinal` — merged output sent to ResultPage

### Web Workers

Heavy parsing is offloaded to three workers, all using `import()` for dynamic library loading:

| Worker | Input | Library | Output |
|--------|-------|---------|--------|
| `krs.worker.ts` | KRS PDF (`ArrayBuffer`) | `pdfjs-dist` | Student info + course codes |
| `theory.worker.ts` | Theory PDF + verified codes | `pdfjs-dist` | `DataTeoriMentah[]` rows |
| `praktikum.worker.ts` | XLSX (`Uint8Array`) | `xlsx` | Room prefixes (scan) or candidates (parse) |

Workers communicate via `postMessage` with typed `{ type, step, data }` envelopes (`LOG`, `WARN`, `ERROR`, `RESULT`, `SCAN_RESULT`, `PARSE_RESULT`).

### PDF Parsing Strategy

Both KRS and theory workers extract text tokens from PDF pages using `pdfjs-dist`'s `getTextContent()`, then apply regex-based token matching:
- **KRS**: Finds NIM (10–13 digit number), semester, name (4-tier fallback regex), and course codes (pattern: 8–10 chars starting with 2 uppercase letters + digits)
- **Theory**: Scans for verified course codes, then looks ahead for time patterns (`HH.MM - HH.MM`), extracts dosen (quoted strings), class letter, SKS, semester, room, and method

### XLSX Parsing Strategy (Praktikum)

Two-phase approach:
1. **Scan** — reads all cells for room prefix patterns (e.g., `LAB 101-102`), returns unique prefixes
2. **Parse** — filters cells by selected prefix, extracts course name/kelas from pipe-delimited cells, uses spatial lookup to find day headers above data rows

### Collision Detection

`ResultPage` builds a `collisionMap` (`Map<number, string[]>`) by grouping rows by day, parsing time ranges, and checking for overlapping intervals. Collided rows are highlighted in red.

### PNG Export

`ExportCanvas` renders the schedule to a hidden `<canvas>` using `CanvasRenderingContext2D` with the "Press Start 2P" pixel font, then triggers a download via `<a>` element.

## UI Components

### Pixel-act UI (`src/components/ui/pixelact-ui/`)

Custom pixel-art styled components wrapping shadcn/ui primitives:
- **Button** — pixel box-shadow, press-down active state, variants: default, secondary, warning, success, destructive, link
- **Card** — pixel box-shadow, no border-radius
- **Select** — wraps Radix Select with pixel styling, custom SVG chevron icons

All use CSS custom properties (`--pixel-box-shadow`, `--box-shadow-width`) defined in `styles/styles.css`. The "Press Start 2P" Google Font is loaded globally and applied via `.pixel-font` class.

### shadcn/ui (`src/components/ui/`)

Standard shadcn button, card, select — used as base primitives for the pixel-act wrappers.

## Path Aliases

- `@/` maps to `src/` (configured in `vite.config.ts` and `tsconfig.app.json`)

## Key Constraints

- All PDF/XLSX parsing happens client-side in workers — no backend
- `SelectClassPage` exists as a standalone component but is **not wired into any route** — the class selection UI is embedded directly in `UploadTeoriPage`
- The `.gitignore` excludes `*.pdf`, `*.xlsx`, `*.csv` — test data files should not be committed
- TypeScript strictness: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `erasableSyntaxOnly`
