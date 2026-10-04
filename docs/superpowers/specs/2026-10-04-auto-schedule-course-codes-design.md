# Auto Schedule by Course Codes — Architectural Design Specification

| Field | Value |
|---|---|
| **Date** | 2026-10-04 |
| **Status** | Draft / Agreed |
| **Scope** | New "Auto Schedule by Course Codes" mode alongside existing manual mode |
| **Deferred** | Userscript (browser automation via Tampermonkey/etc.) is explicitly deferred to a future iteration. This spec covers only the in-app feature. |

---

## 1. Overview

### 1.1 Problem

The current app requires users to manually browse, filter, and check each theory and praktikum class one by one (TheoryStep.tsx, PraktikumStep.tsx). This is tedious when a student already knows their list of course codes (KodeMK) for the semester — they want to paste the codes and have the app auto-select all matching classes.

### 1.2 Solution

Add a **mode switcher** at the top of the wizard. When "Auto Schedule by Course Codes" mode is active:

- **Step 1** accepts an uploaded Labkom Excel file AND a smart multi-line text input for course codes. The uploaded Excel is parsed by the existing `theory.worker.ts` to produce `DataTeoriMentah[]`. The course codes input drives auto-selection.
- **Step 2** presents a **Class Picker** where each course code from the input is resolved to available class sections. A global "Apply-to-All" dropdown lets the user pick one class letter for all courses at once. Each course also has its own individual dropdown to override the global choice.
- **Step 3** is the existing `ResultStep`, reused as-is for rendering, conflict detection, and export.

### 1.3 Non-Goals (This Iteration)

- Userscript / Tampermonkey automation to scrape the portal directly.
- Automatic conflict-aware scheduling optimization (choosing the optimal combination of sections to avoid clashes). The user still picks manually via dropdowns.
- Backend server or API. Everything runs client-side with Web Workers.
- ICS export (deferred independently).

---

## 2. Current Architecture Reference

> This section documents the *actual* codebase structure (verified 2026-10-04), not the stale `AGENTS.md`.

### 2.1 Entry Point & Wizard

- **`src/main.tsx`** — inline `App` component. No `src/App.tsx` exists.
- 3-step wizard driven by store field `wizardStep: 1 | 2 | 3`.
- Conditional render: `wizardStep === 1 → TheoryStep`, `=== 2 → PraktikumStep`, `=== 3 → ResultStep`.
- Navigation via prop callbacks `onNext` / `onBack` calling `setWizardStep`.
- `WizardHeader` (`src/components/WizardHeader.tsx`) shows 3 steps: Teori / Praktikum / Selesai.

### 2.2 Store

- **`src/store/useJadwalStore.ts`** — Zustand + `persist` middleware.
- Key state fields:
  - `wizardStep`, `dataTeoriMentah`, `selectedTheoryRowIds`, `jadwalTeoriTerpilih`
  - `praktikumCandidates`, `selectedCandidateIds`, `praktikumRoomPrefixes`, `selectedRoomPrefix`
  - `praktikumFileData` (number[] — persisted file bytes for re-parse on prefix change)
  - `jadwalFinal` (dead code — never written; the real merge is a local `useMemo` in ResultStep)
- Key actions: `setWizardStep`, `setDataTeoriMentah`, `toggleTheoryRowId`, `setJadwalTeoriTerpilih`, `toggleCandidateId`, `reset`.

### 2.3 Data Types

```ts
// useJadwalStore.ts:4-16
interface DataTeoriMentah {
  id: string; KodeMK: string; MataKuliah: string; Kelas: string;
  SKS: string; SMT: string; DosenPengampuh: string;
  Hari: string; Jam: string; Ruang: string; Keterangan: string;
}

// useJadwalStore.ts:18-28
interface PraktikumCandidate {
  id: string; courseName: string; kelas: string; keterangan: string;
  dosen: string; semester: string; hari: string; jam: string; ruang: string;
}
```

### 2.4 Workers

- **`src/workers/theory.worker.ts`** — parses XLSX/PDF → `DataTeoriMentah[]`. Raw `postMessage` protocol: `{ type: 'PARSE_THEORY', fileBuffer, fileName }` → `{ type: 'RESULT', data }`.
- **`src/workers/praktikum.worker.ts`** — scans XLSX for room prefixes, then parses praktikum candidates. Protocol: `{ type: 'SCAN_XLSX', file }` → `{ type: 'SCAN_RESULT', data: { prefixes, matrix } }`, then `{ type: 'PARSE_PRAKTIKUM', file, roomPrefix }` → `{ type: 'PARSE_RESULT', data: { candidates, matrix, roomPrefix } }`.

### 2.5 Existing UI Patterns (Must Be Reused)

| Shared component | Path | Purpose |
|---|---|---|
| `FileDropZone` | `src/components/shared/FileDropZone.tsx` | Drag-and-drop file upload |
| `LoadingState` | `src/components/shared/LoadingState.tsx` | Worker log streaming display |
| `FileSummaryCard` | `src/components/shared/FileSummaryCard.tsx` | Post-upload summary with reset |
| `BottomNav` | `src/components/shared/BottomNav.tsx` | Fixed bottom bar with selected count + Next button |
| `ClassCard` | `src/components/ClassCard.tsx` | Class display card with toggle checkbox |
| `WizardHeader` | `src/components/WizardHeader.tsx` | 3-step progress indicator |
| `EditModal` | `src/components/EditModal.tsx` | Modal for editing class fields |

### 2.6 Known Anomalies (Relevant to This Feature)

These were identified during codebase exploration and should be addressed or worked around during implementation:

1. **KodeMK casing divergence**: PDF path produces uppercase codes; XLSX path is case-preserving (`/i` validation, raw storage). The auto-match feature MUST normalize codes case-insensitively before comparison.
2. **Practical entries have no KodeMK**: `PraktikumCandidate` has `courseName` only. Auto-by-codes mode applies to theory only in this iteration; praktikum remains manual or is matched by course name substring.
3. **`jadwalFinal` is dead code**: Do not wire into it. The merge stays as `ResultStep`'s local `useMemo`.
4. **`parseTimeToMinutes` only matches 2-digit hours** (`ResultStep.tsx:59`): times like `"8.00-9.40"` produce `null`, silently disabling merge and collision detection. The auto-feature should be aware that codes resolving to single-digit-hour slots may not merge correctly.
5. **Step navigation is unguarded + persisted**: A reload can land on step 2/3 with empty data. The mode switcher must handle this gracefully.

---

## 3. Mode Switcher

### 3.1 Design

A toggle control is added to `main.tsx` above the wizard content (or integrated into `WizardHeader`). It switches between:

| Mode | Label | Behavior |
|---|---|---|
| `manual` | "Manual" (default) | Current behavior — upload file, manually check each class card |
| `auto-codes` | "Auto by Course Codes" | New behavior — upload Labkom Excel + paste codes, auto-select via dropdowns |

### 3.2 Store Changes

```ts
// New fields in JadwalState interface
type ScheduleMode = 'manual' | 'auto-codes';
scheduleMode: ScheduleMode;
setScheduleMode: (mode: ScheduleMode) => void;

// Auto-codes specific state
courseCodeInput: string;           // raw textarea content (one code per line)
parsedCourseCodes: string[];       // normalized, deduplicated, uppercase
setCourseCodeInput: (input: string) => void;
setParsedCourseCodes: (codes: string[]) => void;

// Per-course class selections (auto mode)
// Maps KodeMK → chosen Kelas letter (e.g. "A", "B", "*")
courseClassSelections: Record<string, string>;
globalClassSelection: string;     // "" = no global override, or a letter like "A"
setCourseClassSelection: (kode: string, kelas: string) => void;
setGlobalClassSelection: (kelas: string) => void;
applyGlobalToAll: () => void;      // sets all individual selections to global value
```

### 3.3 Persistence

`scheduleMode`, `courseCodeInput`, `parsedCourseCodes`, `courseClassSelections`, and `globalClassSelection` are added to `partialize` for persistence across reloads.

### 3.4 Mode Switch Behavior

- Switching from `manual` → `auto-codes`: preserves uploaded `dataTeoriMentah` (the parsed theory data). Clears `selectedTheoryRowIds` (auto mode drives selection differently). Shows the course code input UI.
- Switching from `auto-codes` → `manual`: preserves `dataTeoriMentah`. Clears `courseClassSelections` and `globalClassSelection`. Restores manual checkbox UI. `selectedTheoryRowIds` remains whatever it was (user can continue manually).
- Switching mode does NOT reset `wizardStep`. If on step 3 and switching, user goes back to step 1 automatically (since the selection model changes).

### 3.5 UI Placement

The mode switcher renders as a segmented control:

```
┌─────────────────────────────────────────┐
│  [ Manual ]  [ Auto by Course Codes ]   │
└─────────────────────────────────────────┘
```

- Placed between `WizardHeader` and the step content in `main.tsx`.
- Styled with neubrutalism (border-2 border-black, bg-tertiary for active, bg-white for inactive).
- Only visible on steps 1 and 2. Hidden on step 3 (ResultStep) to avoid mid-result confusion.

---

## 4. Step 1: Upload Labkom Excel & Smart Course Code Input

### 4.1 Layout (auto-codes mode)

Two-column layout (same grid as existing parsed state: `lg:grid lg:grid-cols-12`):

**Left column (lg:col-span-4):**

1. **File upload** — reuse `FileDropZone` with accept=`.xlsx,.xls`. The file is parsed by `theory.worker.ts` exactly as in manual mode, producing `dataTeoriMentah`. Show `LoadingState` during parse, `FileSummaryCard` after.
2. **Course code input** — a `textarea` below the upload area (or replacing it after parse). Placeholder: "Masukkan Kode MK, satu per baris\nContoh:\nMI2113\nIF2104\nEK2201".
3. **Parse button** — "Parse Kode" button. On click, normalizes the textarea content into `parsedCourseCodes`.

**Right column (lg:col-span-8):**

Empty or a preview list of recognized course codes with match status:
- Green checkmark: code found in `dataTeoriMentah` (at least one row has matching `KodeMK`).
- Red X: code not found in parsed data.
- Warning: code found but all matching rows are praktikum (skipped by theory worker's `/prak|lab/i` filter — won't be in `dataTeoriMentah`).

### 4.2 Course Code Normalization

```ts
function normalizeCourseCodes(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)              // split on newlines, commas, semicolons
    .map(s => s.trim().toUpperCase().replace(/\s+/g, ''))  // trim, uppercase, remove spaces
    .filter(s => s.length > 0)     // remove empty
    .filter((s, i, arr) => arr.indexOf(s) === i);  // dedupe
}
```

**Normalization rules:**
- Uppercase all codes (fixes the casing divergence anomaly — XLSX stores case-preserving).
- Remove all internal whitespace (`"IF 1234"` → `"IF1234"`).
- Split on newlines, commas, semicolons (flexible paste input).
- Deduplicate.

### 4.3 Matching Logic

```ts
function findMatchingRows(codes: string[], data: DataTeoriMentah[]): Map<string, DataTeoriMentah[]> {
  const map = new Map<string, DataTeoriMentah[]>();
  for (const code of codes) {
    const matches = data.filter(row => normalizeCode(row.KodeMK) === code);
    map.set(code, matches);
  }
  return map;
}

function normalizeCode(kode: string): string {
  return kode.trim().toUpperCase().replace(/\s+/g, '');
}
```

The `normalizeCode` helper is also used at render time in ResultStep to ensure consistent comparison.

### 4.4 Navigation Guard

- **Next button (BottomNav)** is disabled until:
  - `dataTeoriMentah.length > 0` (file uploaded and parsed), AND
  - `parsedCourseCodes.length > 0` (at least one code entered and parsed), AND
  - At least one code has a match in `dataTeoriMentah`.
- If all codes have zero matches, show an error message: "Tidak ada kode MK yang cocok dengan file yang diunggah."

### 4.5 Behavior on File Change

If the user uploads a new file (re-parse), `parsedCourseCodes` is preserved but the match preview re-renders against the new `dataTeoriMentah`. `courseClassSelections` is cleared (old selections may not apply to new data).

---

## 5. Step 2: Class Picker with Apply-to-All & Individual Dropdowns

### 5.1 Layout (auto-codes mode)

This replaces the PraktikumStep content when in auto-codes mode. Same two-column layout.

**Left column (lg:col-span-4):**

- Summary card showing: file name, total codes entered, codes matched, codes unmatched.
- "Apply to All" global dropdown:
  ```
  ┌───────────────────────────────────┐
  │ Kelas untuk semua: [ ▼ ]          │
  │                    [ A ] [ B ]... │
  └───────────────────────────────────┘
  ```
  - Lists all unique `Kelas` values found across all matched rows, plus a "—" (no selection) option.
  - On change: calls `applyGlobalToAll()` which sets every `courseClassSelections[code]` to the chosen value.
  - A "Terapkan" (Apply) button confirms the global selection (or it applies immediately on change — TBD, prefer immediate for simplicity).

**Right column (lg:col-span-8):**

A scrollable list of course cards, one per parsed course code. Each card shows:

```
┌──────────────────────────────────────────────┐
│ MI2113  ✓ Found (3 sections)                 │
│ ┌──────────────────────────────────────────┐ │
│ │ Algoritma & Pemrograman                  │ │
│ │ Kelas: [ A ▼ ]  (global: A)              │ │
│ │ ─── Available sections ───               │ │
│ │ ☑ A — Senin 08.00-09.40 — R.201 — Budi  │ │
│ │ ☐ B — Senin 10.00-11.40 — R.202 — Sari  │ │
│ │ ☐ C — Rabu 13.00-14.40 — R.203 — Andi   │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

- **Course code badge** (e.g. "MI2113") with match status.
- **Individual Kelas dropdown** — defaults to the global selection. Changing it overrides just that course. Options are the available `Kelas` values for that specific course.
- **Section list** — all matching `DataTeoriMentah` rows for that code, showing Hari / Jam / Ruang / Dosen. The row matching the selected Kelas is highlighted/checked.
- If a course has only one section, the dropdown is disabled (auto-selected) and shows "Only 1 section".

### 5.2 Selection Logic

When a Kelas is chosen (globally or individually):

```ts
function selectByKodeAndKelas(codes: string[], selections: Record<string, string>, data: DataTeoriMentah[]): string[] {
  const selectedIds: string[] = [];
  for (const code of codes) {
    const kelas = selections[code];
    if (!kelas) continue;
    const matches = data.filter(row => normalizeCode(row.KodeMK) === code && row.Kelas === kelas);
    selectedIds.push(...matches.map(r => r.id));
  }
  return selectedIds;
}
```

This produces `selectedTheoryRowIds` which feeds into `jadwalTeoriTerpilih` on Next, exactly as the manual path does in `TheoryStep.tsx:290-291`.

### 5.3 Navigation

- **Next button**: enabled when at least one course has a Kelas selected (i.e., `Object.keys(courseClassSelections).filter(k => courseClassSelections[k]).length > 0`).
- On Next:
  1. Compute `selectedTheoryRowIds` from selections.
  2. Call `setJadwalTeoriTerpilih(chosen)` where `chosen = dataTeoriMentah.filter(r => selectedTheoryRowIds.includes(r.id))`.
  3. Call `setWizardStep(3)` to go to ResultStep.
- **Back button**: returns to step 1 (preserving course code input and file).

### 5.4 Unmatched Codes Handling

Codes with zero matches in `dataTeoriMentah` are shown as greyed-out cards with a warning icon and message: "Kode MK tidak ditemukan di file yang diunggah." These courses are simply skipped (no selection made).

### 5.5 Praktikum in Auto Mode

In this iteration, auto-codes mode does **not** auto-select praktikum. The user can still proceed to the existing PraktikumStep after ResultStep if they wish (or the flow can skip praktikum entirely in auto mode — TBD based on UX preference). The recommended approach: in auto-codes mode, **skip PraktikumStep** (go directly from step 2 → step 3). The user can add praktikum manually from ResultStep's edit functionality.

---

## 6. Step 3: ResultStep Integration

### 6.1 No Changes to ResultStep Core

`ResultStep` (`src/components/ResultStep.tsx`) reads from `jadwalTeoriTerpilih` and `praktikumCandidates`/`selectedCandidateIds`. Since auto-codes mode writes to `jadwalTeoriTerpilih` via the same store action, ResultStep works unchanged:

- `unified` useMemo (`ResultStep.tsx:113-126`) builds `UnifiedClass[]` from `jadwalTeoriTerpilih`.
- `mergeSequentialSlots` merges adjacent practical slots.
- `findCollisions` flags time overlaps.
- Copy-to-clipboard and PNG download work as-is.

### 6.2 KodeMK Display Consistency

Since auto-codes mode normalizes codes to uppercase and the XLSX path may store lowercase, the `kode` field in `UnifiedClass` (mapped from `r.KodeMK` at `ResultStep.tsx:115`) may display in mixed case. This is a cosmetic issue only — the badge display shows whatever was stored. For consistency, the normalization helper should be applied at the display layer too (future task, not blocking this feature).

### 6.3 Back Navigation from ResultStep

When the user clicks "Kembali" from ResultStep (`onBack` → `setWizardStep(2)`), they return to step 2. In auto-codes mode, step 2 restores the class picker with their previous selections intact (persisted in store). In manual mode, step 2 shows PraktikumStep as before.

---

## 7. Component Architecture

### 7.1 New Files

| File | Purpose |
|---|---|
| `src/components/ModeSwitcher.tsx` | Segmented toggle control for schedule mode |
| `src/components/AutoCourseCodeInput.tsx` | Textarea + parse button + match preview (step 1, auto mode) |
| `src/components/AutoClassPicker.tsx` | Course cards with dropdowns + apply-to-all (step 2, auto mode) |
| `src/components/AutoClassCard.tsx` | Individual course card with dropdown + section list |

### 7.2 Modified Files

| File | Changes |
|---|---|
| `src/main.tsx` | Add `ModeSwitcher` between `WizardHeader` and step content. Conditionally render `AutoClassPicker` (step 2, auto mode) instead of `PraktikumStep`. |
| `src/store/useJadwalStore.ts` | Add `scheduleMode`, `courseCodeInput`, `parsedCourseCodes`, `courseClassSelections`, `globalClassSelection`, and their setters. Add to `partialize`. |
| `src/components/WizardHeader.tsx` | Optionally show mode label next to step labels. |
| `src/components/TheoryStep.tsx` | Conditionally render `AutoCourseCodeInput` in the left column when `scheduleMode === 'auto-codes'`. Add parse-and-match logic. |

### 7.3 No Changes To

- `src/workers/theory.worker.ts` — reused as-is.
- `src/workers/praktikum.worker.ts` — not used in auto mode (this iteration).
- `src/components/ResultStep.tsx` — reused as-is.
- `src/components/ClassCard.tsx` — reused in manual mode.
- `src/components/EditModal.tsx` — reused as-is.
- All shared components (`FileDropZone`, `LoadingState`, `FileSummaryCard`, `BottomNav`).

---

## 8. State Flow Diagram

```
Mode: auto-codes

Step 1 (TheoryStep + AutoCourseCodeInput)
  ├── User uploads Labkom Excel → theory.worker → dataTeoriMentah (store)
  ├── User types course codes in textarea → courseCodeInput (store)
  ├── User clicks "Parse Kode" → normalizeCourseCodes → parsedCourseCodes (store)
  ├── Match preview renders: code → DataTeoriMentah[] mapping
  └── Next (BottomNav) → setWizardStep(2)
      Guard: dataTeoriMentah.length > 0 && parsedCourseCodes.length > 0 && ≥1 match

Step 2 (AutoClassPicker)
  ├── Renders one card per parsedCourseCode
  ├── Each card shows matching sections from dataTeoriMentah
  ├── "Apply to All" dropdown → globalClassSelection → applyGlobalToAll()
  ├── Individual dropdowns → courseClassSelections[code]
  └── Next (BottomNav) → selectByKodeAndKelas → selectedTheoryRowIds
      → setJadwalTeoriTerpilih(chosen) → setWizardStep(3)
      Guard: ≥1 course has a Kelas selected

Step 3 (ResultStep — unchanged)
  ├── Reads jadwalTeoriTerpilih → UnifiedClass[] (useMemo)
  ├── mergeSequentialSlots → findCollisions → render grouped by Hari
  ├── Copy to clipboard / Download PNG
  └── Back → setWizardStep(2) → AutoClassPicker (selections restored)
```

---

## 9. Edge Cases & Error Handling

### 9.1 Code Not Found

- Card shows "Kode MK tidak ditemukan di file yang diunggah."
- Possible reasons: code doesn't exist in the semester's schedule, code is for a praktikum-only course (filtered by `/prak|lab/i` in theory worker), code was mistyped.
- The code is skipped — no selection made, no error thrown.

### 9.2 Code with Single Section

- Dropdown is disabled, auto-selected to the only available Kelas.
- `courseClassSelections[code]` is set automatically.

### 9.3 Code with Multiple Sections, Same Kelas Letter

- If two rows have the same `KodeMK` AND same `Kelas` (e.g., a course that meets twice a week), both rows are selected. This is correct behavior — the student needs both sessions.

### 9.4 Empty File Upload in Auto Mode

- `dataTeoriMentah` is empty. All codes show as "not found." Next button is disabled.

### 9.5 Mode Switch Mid-Selection

- Switching from auto-codes to manual on step 2: `courseClassSelections` is cleared. `selectedTheoryRowIds` is cleared. User sees manual PraktikumStep.
- Switching from manual to auto-codes on step 1: `courseCodeInput` is preserved (if previously entered). `dataTeoriMentah` is preserved. User sees the auto input UI.

### 9.6 Reload on Step 2 in Auto Mode

- Store persistence restores `scheduleMode`, `parsedCourseCodes`, `courseClassSelections`, `dataTeoriMentah`. AutoClassPicker re-renders with all state intact.
- If `dataTeoriMentah` is empty (file wasn't persisted or was cleared), codes show as "not found" and user is directed to step 1.

### 9.7 KodeMK Casing

- User types `"mi2113"` → normalized to `"MI2113"`.
- XLSX has `"mi2113"` stored → `normalizeCode()` uppercases to `"MI2113"`.
- Match succeeds. Selection proceeds normally.

---

## 10. Acceptance Criteria

1. Mode switcher is visible on steps 1-2 and toggles between "Manual" and "Auto by Course Codes."
2. In auto mode, step 1 shows file upload + course code textarea. Parsing codes produces a normalized, deduplicated, uppercase array.
3. Match preview shows green/red status per code against uploaded data.
4. Next on step 1 is disabled until file is parsed, codes are parsed, and at least one match exists.
5. Step 2 shows one card per parsed code with available sections.
6. Global "Apply to All" dropdown sets all individual selections in one action.
7. Individual dropdowns override the global selection for that course only.
8. Next on step 2 computes `jadwalTeoriTerpilih` from selections and advances to step 3.
9. Step 3 (ResultStep) renders the auto-selected schedule identically to manual mode.
10. Back from step 3 returns to step 2 with selections restored.
11. Switching mode clears mode-specific state but preserves `dataTeoriMentah`.
12. Reloading the page in auto mode restores all persisted state.
13. No changes to `theory.worker.ts`, `ResultStep.tsx`, or shared components.

---

## 11. Deferred: Userscript

A Tampermonkey/userscript that automates scraping the course schedule from the campus portal is explicitly deferred. The userscript would:
- Navigate to the portal's jadwal page.
- Scrape the HTML table.
- Convert to XLSX format.
- Download for upload into this app.

This is out of scope for this spec. The in-app feature assumes the user already has the Labkom Excel file (downloaded manually from the portal).

---

## 12. Future Enhancements (Out of Scope)

- **Conflict-aware auto-selection**: automatically choose the combination of sections that avoids all time conflicts (NP-hard scheduling problem).
- **Praktikum auto-match**: match praktikum candidates by course name fuzzy matching to theory codes.
- **KodeMK display normalization**: apply `normalizeCode()` at the ResultStep render layer so badges are consistently uppercase.
- **Single-digit hour fix**: fix `parseTimeToMinutes` regex (`ResultStep.tsx:59`) to accept `\d{1,2}` instead of `\d{2}`.
- **Userscript for portal scraping** (see §11).
- **ICS calendar export**.
- **Dead code cleanup**: remove `jadwalFinal` and its orphaned mutators from the store.
