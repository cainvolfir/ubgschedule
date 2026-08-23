# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

UBG Schedule — unofficial schedule organizer for Universitas Bumigora students. PWA (Vite + React 19 + TypeScript + Tailwind v3) deployed on Vercel. UI language is Indonesian (course data, day names like Senin/Selasa, SKS, Kelas).

App flow is a 3-step wizard: upload theory schedule (PDF) → upload practical schedule (XLSX/XLS/CSV) → view/export merged schedule.

## Commands

```bash
npm run dev       # Vite dev server
npm run build     # tsc -b && vite build
npm run lint      # eslint .
npm run preview   # preview production build
```

No test suite exists. Verify changes with `npm run build` (type-check + build) and manual testing in the browser.

## Architecture

- **`src/App.tsx`** — wizard state machine. Local `useState<WizardStep>` holds the step ('teori' | 'praktikum' | 'result'); `goNext`/`goBack` walk the step array. React Router (`BrowserRouter` + `Routes`) wraps it but only uses a catch-all `/*` route — routing is decorative, step navigation is plain state. `RootLayout` receives `currentStep`/`statusText` as props.
- **`src/store/useJadwalStore.ts`** — single Zustand store with `persist` middleware (localStorage key `ubg-schedule-storage`). All wizard state lives here: parsed theory rows, selected IDs, praktikum candidates, and the final merged schedule (`jadwalFinal`). `partialize` excludes the transient flags (`isScanning`, `isParsing`). `courseColors` maps course names to hex colors but is not populated anywhere yet.
- **Parsing runs in Web Workers** (`src/workers/`), one per file type, spawned with `new Worker(new URL('../../workers/...', import.meta.url), { type: 'module' })`. Workers communicate via `postMessage` with `{ type, step, data }` envelopes and stream `LOG`/`WARN`/`ERROR` messages so pages can show live progress.
  - **`theory.worker.ts`** — parses theory schedule PDFs with `pdfjs-dist` (dynamic import inside worker, `workerSrc` set to the `?url` asset). Tokenizes the whole PDF text, then pattern-matches: course code regex (`[A-Z]{2}...[0-9]`, 8-10 chars), time format `HH.MM-HH.MM`, lecturer delimited by `"` quotes, day from `.Perkuliahan Hari X` headers, room until a metode token (`Offline`/`Online`/`Blended`).
  - **`praktikum.worker.ts`** — parses practical schedule spreadsheets with `xlsx` (dynamic import). Two-pass: `SCAN_XLSX` extracts room prefixes (e.g. `LAB`, `A`) from cells matching `PREFIX N-M` patterns in the scan part of `|`-delimited cells; `PARSE_PRAKTIKUM` (with chosen `roomPrefix`) finds data rows, parses course/class/lecturer/semester from cell parts, resolves day/room spatially by scanning up columns for the day header row, and merges consecutive same-course rows into one time span.
- **Pages** (`src/features/schedule/`) — `UploadTeoriPage` (PDF drop zone + filterable class table + checkbox selection), `UploadPraktikumPage` (spreadsheet drop zone, room-prefix `<Select>`, candidate table, merges checked candidates into runs by time adjacency and appends to `jadwalFinal` with theory rows), `ResultPage` (searchable/editable table, collision detection flagging overlapping times same day as "Jadwal Bentrok", add/edit/delete rows, print).
- **Exporters** (`src/features/exporter/` + `ExportCopy.tsx`) — lazy-loaded on ResultPage: `ExportCopy` (plain text/markdown to clipboard), `ExportCanvas` (renders table to hidden `<canvas>` at 4x scale, downloads PNG), `ExportICS` (RFC 5545 `.ics` with weekly `RRULE`, semester dates derived from month: Feb–Jul even semester, Aug–Jan odd).


## Data shape

Final schedule rows (`jadwalFinal`) use Indonesian PascalCase keys: `KodeMK`, `MataKuliah`, `Kelas`, `SKS`, `SMT`, `DosenPengampuh`, `Hari`, `Jam` (format `HH.MM-HH.MM` or `HH:MM-HH:MM`, both appear), `Ruang`, `Keterangan`. Time parsing regexes tolerate both `.` and `:` separators and en/em-dash (`[-–]`). Days are Indonesian: Senin…Minggu.

## Notes

- Deployed to Vercel (`uni-schedule` project, `.vercel/` local config). `vite-plugin-pwa` generates a service worker with `autoUpdate`; CDN assets cached CacheFirst.
- The PWA icons/screenshots are static files in `public/`.
- Parser robustness matters more than strictness: files from the university portal vary in layout, so both workers use defensive heuristics (spatial lookups, prefix matching, lookahead windows). When changing parsers, keep `log()` streaming intact — pages depend on it for progress UI.
