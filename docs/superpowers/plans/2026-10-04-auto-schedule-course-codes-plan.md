# Implementation Plan: Auto Schedule by Course Codes

| Field | Value |
|---|---|
| **Date** | 2026-10-04 |
| **Spec** | `docs/superpowers/specs/2026-10-04-auto-schedule-course-codes-design.md` |
| **Goal** | Add an "Auto by Course Codes" mode to the existing 3-step wizard that lets users paste course codes and auto-select matching theory classes via dropdowns. |
| **Verification** | `npm run lint` and `npm run build` must pass with zero errors after every step group. |

---

## Prerequisites

- The spec document exists at `docs/superpowers/specs/2026-10-04-auto-schedule-course-codes-design.md`.
- The codebase uses Vite + React + TypeScript + Zustand + Tailwind CSS + Phosphor Icons.
- Entry point is `src/main.tsx` (no `src/App.tsx`).
- Store is `src/store/useJadwalStore.ts` (Zustand + `persist`).
- Shared components live in `src/components/shared/`.
- Workers live in `src/workers/`.

---

## Step 1: Add store state and actions for auto-codes mode

**File:** `src/store/useJadwalStore.ts`

### 1.1 Add the `ScheduleMode` type and new state fields to the `JadwalState` interface

Insert after line 49 (`isParsing: boolean;`) and before line 51 (`setWizardStep`):

```ts
type ScheduleMode = 'manual' | 'auto-codes';
```

Add this block to the `JadwalState` interface, right after the `isParsing: boolean;` field (line 49):

```ts
  // --- Auto-codes mode state ---
  scheduleMode: ScheduleMode;
  courseCodeInput: string;
  parsedCourseCodes: string[];
  courseClassSelections: Record<string, string>;
  globalClassSelection: string;
```

### 1.2 Add new action signatures to the `JadwalState` interface

Insert after `setIsParsing: (v: boolean) => void;` (line 68) and before `addJadwalRow` (line 69):

```ts
  setScheduleMode: (mode: ScheduleMode) => void;
  setCourseCodeInput: (input: string) => void;
  setParsedCourseCodes: (codes: string[]) => void;
  setCourseClassSelection: (kode: string, kelas: string) => void;
  setGlobalClassSelection: (kelas: string) => void;
  applyGlobalToAll: () => void;
  clearAutoCodesState: () => void;
```

### 1.3 Add initial state values

In the `initialState` object (starts at line 76), add after `isParsing: false,` (line 90):

```ts
  scheduleMode: 'manual' as ScheduleMode,
  courseCodeInput: '',
  parsedCourseCodes: [],
  courseClassSelections: {},
  globalClassSelection: '',
```

### 1.4 Add action implementations

In the `create<JadwalState>()(persist((set) => ({ ...` block, add after `setIsParsing: (v) => set({ isParsing: v }),` (line 154) and before `addJadwalRow` (line 156):

```ts
      setScheduleMode: (mode) =>
        set((state) => {
          if (mode === 'manual') {
            return {
              scheduleMode: 'manual',
              courseClassSelections: {},
              globalClassSelection: '',
              selectedTheoryRowIds: [],
            };
          }
          // Switching to auto-codes: clear manual selection state
          return {
            scheduleMode: 'auto-codes',
            selectedTheoryRowIds: [],
            wizardStep: state.wizardStep === 3 ? 1 : state.wizardStep,
          };
        }),

      setCourseCodeInput: (input) => set({ courseCodeInput: input }),

      setParsedCourseCodes: (codes) => set({ parsedCourseCodes: codes }),

      setCourseClassSelection: (kode, kelas) =>
        set((state) => ({
          courseClassSelections: { ...state.courseClassSelections, [kode]: kelas },
        })),

      setGlobalClassSelection: (kelas) => set({ globalClassSelection: kelas }),

      applyGlobalToAll: () =>
        set((state) => {
          if (!state.globalClassSelection) return {};
          const next: Record<string, string> = {};
          for (const code of state.parsedCourseCodes) {
            next[code] = state.globalClassSelection;
          }
          return { courseClassSelections: next };
        }),

      clearAutoCodesState: () =>
        set({
          courseCodeInput: '',
          parsedCourseCodes: [],
          courseClassSelections: {},
          globalClassSelection: '',
        }),
```

### 1.5 Add new fields to `partialize`

In the `partialize` function (line 181), add these lines after `praktikumFileData: state.praktikumFileData,` (line 192) and before the closing `},`:

```ts
        scheduleMode: state.scheduleMode,
        courseCodeInput: state.courseCodeInput,
        parsedCourseCodes: state.parsedCourseCodes,
        courseClassSelections: state.courseClassSelections,
        globalClassSelection: state.globalClassSelection,
```

### 1.6 Bump the persist version

Change `version: 1` (line 180) to `version: 2`. Zustand's `persist` will discard old persisted state, which is acceptable here since the feature is new.

### Verification

```bash
npm run lint
npm run build
```

**Expected:** No TypeScript errors. The new fields and actions compile cleanly. The existing app behavior is unchanged because `scheduleMode` defaults to `'manual'`.

---

## Step 2: Create `normalizeCode` and `normalizeCourseCodes` utility functions

**File (new):** `src/utils/courseCode.ts`

### 2.1 Create the utility file

Create the directory `src/utils/` if it does not exist, then create `src/utils/courseCode.ts`:

```ts
import type { DataTeoriMentah } from '../store/useJadwalStore';

/**
 * Normalize a single KodeMK string: trim, uppercase, remove all internal whitespace.
 * Handles the casing divergence between PDF (uppercase) and XLSX (case-preserving) paths.
 */
export function normalizeCode(kode: string): string {
  return kode.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Parse raw textarea input into a normalized, deduplicated, uppercase array of course codes.
 * Splits on newlines, commas, and semicolons.
 */
export function normalizeCourseCodes(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim().toUpperCase().replace(/\s+/g, ''))
    .filter((s) => s.length > 0)
    .filter((s, i, arr) => arr.indexOf(s) === i);
}

/**
 * Build a Map from normalized course code → matching DataTeoriMentah rows.
 */
export function findMatchingRows(
  codes: string[],
  data: DataTeoriMentah[]
): Map<string, DataTeoriMentah[]> {
  const map = new Map<string, DataTeoriMentah[]>();
  for (const code of codes) {
    const matches = data.filter((row) => normalizeCode(row.KodeMK) === code);
    map.set(code, matches);
  }
  return map;
}

/**
 * Compute selectedTheoryRowIds from the course-class selections map.
 * Returns row IDs for all rows matching (KodeMK, Kelas) pairs.
 */
export function selectByKodeAndKelas(
  codes: string[],
  selections: Record<string, string>,
  data: DataTeoriMentah[]
): string[] {
  const selectedIds: string[] = [];
  for (const code of codes) {
    const kelas = selections[code];
    if (!kelas) continue;
    const matches = data.filter(
      (row) => normalizeCode(row.KodeMK) === code && row.Kelas === kelas
    );
    selectedIds.push(...matches.map((r) => r.id));
  }
  return selectedIds;
}
```

### Verification

```bash
npm run lint
npm run build
```

**Expected:** No errors. The file is new and not yet imported anywhere, but it must compile.

---

## Step 3: Create the `ModeSwitcher` component

**File (new):** `src/components/ModeSwitcher.tsx`

### 3.1 Write the component

```tsx
import { ArrowsDownUp } from '@phosphor-icons/react';
import { useJadwalStore } from '../store/useJadwalStore';
import type { ScheduleMode } from '../store/useJadwalStore';

const MODES: { value: ScheduleMode; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'auto-codes', label: 'Auto by Course Codes' },
];

interface ModeSwitcherProps {
  /** Hide the switcher (e.g. on step 3 ResultStep) */
  hidden?: boolean;
}

export default function ModeSwitcher({ hidden }: ModeSwitcherProps) {
  const { scheduleMode, setScheduleMode } = useJadwalStore();

  if (hidden) return null;

  return (
    <div className="bg-white border-b-2 border-black px-4 py-3 flex justify-center">
      <div className="inline-flex border-2 border-black rounded-none overflow-hidden">
        {MODES.map((mode, i) => {
          const isActive = scheduleMode === mode.value;
          return (
            <button
              key={mode.value}
              type="button"
              onClick={() => setScheduleMode(mode.value)}
              className={
                'px-4 md:px-6 py-2 font-bold text-sm uppercase tracking-wide transition-all flex items-center gap-2 ' +
                (isActive
                  ? 'bg-tertiary text-white shadow-[3px_3px_0px_#000000] -translate-x-0.5 -translate-y-0.5'
                  : 'bg-white text-black hover:bg-gray-100') +
                (i > 0 ? ' border-l-2 border-black' : '')
              }
            >
              <ArrowsDownUp weight="bold" size={16} />
              {mode.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

### 3.2 Export `ScheduleMode` from the store

In `src/store/useJadwalStore.ts`, add `export` to the type declaration so it can be imported:

Change:
```ts
type ScheduleMode = 'manual' | 'auto-codes';
```
To:
```ts
export type ScheduleMode = 'manual' | 'auto-codes';
```

### Verification

```bash
npm run lint
npm run build
```

**Expected:** No errors. `ModeSwitcher` compiles and `ScheduleMode` is exported.

---

## Step 4: Create the `AutoCourseCodeInput` component (Step 1 auto mode)

**File (new):** `src/components/AutoCourseCodeInput.tsx`

### 4.1 Write the component

```tsx
import { useMemo } from 'react';
import { CheckCircle, XCircle, Warning, ListChecks } from '@phosphor-icons/react';
import { useJadwalStore, type DataTeoriMentah } from '../store/useJadwalStore';
import { normalizeCourseCodes, findMatchingRows } from '../utils/courseCode';

export default function AutoCourseCodeInput() {
  const {
    courseCodeInput,
    setCourseCodeInput,
    parsedCourseCodes,
    setParsedCourseCodes,
    dataTeoriMentah,
    courseClassSelections,
    setCourseClassSelection,
  } = useJadwalStore();

  const handleParse = () => {
    const codes = normalizeCourseCodes(courseCodeInput);
    setParsedCourseCodes(codes);
    // Auto-select single-section courses
    if (dataTeoriMentah.length > 0 && codes.length > 0) {
      const matchMap = findMatchingRows(codes, dataTeoriMentah);
      for (const code of codes) {
        const matches = matchMap.get(code) || [];
        const uniqueKelas = [...new Set(matches.map((r) => r.Kelas))];
        if (uniqueKelas.length === 1) {
          setCourseClassSelection(code, uniqueKelas[0]);
        }
      }
    }
  };

  const matchMap = useMemo(
    () => findMatchingRows(parsedCourseCodes, dataTeoriMentah),
    [parsedCourseCodes, dataTeoriMentah]
  );

  const matchedCount = parsedCourseCodes.filter(
    (c) => (matchMap.get(c) || []).length > 0
  ).length;
  const unmatchedCount = parsedCourseCodes.length - matchedCount;

  return (
    <div className="w-full space-y-4">
      {/* Textarea */}
      <div>
        <label className="block font-extrabold text-sm uppercase mb-2 tracking-tight">
          Masukkan Kode MK
        </label>
        <p className="text-xs font-semibold text-gray-600 mb-2">
          Satu kode per baris (atau pisahkan dengan koma/titik koma).
        </p>
        <textarea
          value={courseCodeInput}
          onChange={(e) => setCourseCodeInput(e.target.value)}
          placeholder={'MI2113\nIF2104\nEK2201'}
          rows={6}
          className="w-full border-2 border-black rounded-none p-3 font-mono text-sm bg-white focus:outline-none focus:shadow-brutal transition-shadow resize-y"
        />
      </div>

      {/* Parse button */}
      <button
        type="button"
        onClick={handleParse}
        disabled={!courseCodeInput.trim()}
        className={
          'w-full py-3 rounded-none border-2 border-black font-extrabold uppercase text-sm transition-all flex items-center justify-center gap-2 ' +
          (courseCodeInput.trim()
            ? 'bg-tertiary text-white shadow-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal active:translate-x-0 active:translate-y-0 active:shadow-none'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed')
        }
      >
        <ListChecks weight="bold" size={18} />
        Parse Kode
      </button>

      {/* Match preview */}
      {parsedCourseCodes.length > 0 && (
        <div className="border-2 border-black rounded-none bg-white p-4">
          <div className="flex justify-between items-center mb-3 border-b-2 border-black pb-2">
            <span className="font-extrabold text-sm uppercase">Hasil Pencocokan</span>
            <span className="text-xs font-bold">
              <span className="text-green-600">{matchedCount} cocok</span>
              {' / '}
              <span className="text-red-600">{unmatchedCount} tidak</span>
            </span>
          </div>
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {parsedCourseCodes.map((code) => {
              const matches = matchMap.get(code) || [];
              const found = matches.length > 0;
              return (
                <li
                  key={code}
                  className={
                    'flex items-center gap-2 text-sm font-bold border-2 border-black px-2 py-1.5 rounded-none ' +
                    (found ? 'bg-green-50' : 'bg-red-50')
                  }
                >
                  {found ? (
                    <CheckCircle weight="fill" className="text-green-600 shrink-0" />
                  ) : (
                    <XCircle weight="fill" className="text-red-600 shrink-0" />
                  )}
                  <span className="font-mono">{code}</span>
                  {found && (
                    <span className="text-xs text-gray-600 ml-auto">
                      {matches.length} kelas
                    </span>
                  )}
                  {!found && dataTeoriMentah.length === 0 && (
                    <Warning weight="fill" className="text-yellow-600 ml-auto" size={14} />
                  )}
                </li>
              );
            })}
          </ul>
          {unmatchedCount === parsedCourseCodes.length &&
            parsedCourseCodes.length > 0 &&
            dataTeoriMentah.length > 0 && (
              <p className="mt-3 text-xs font-bold text-red-600 text-center">
                Tidak ada kode MK yang cocok dengan file yang diunggah.
              </p>
            )}
        </div>
      )}
    </div>
  );
}
```

### Verification

```bash
npm run lint
npm run build
```

**Expected:** No errors. Component compiles but is not yet wired into `TheoryStep`.

---

## Step 5: Wire `AutoCourseCodeInput` into `TheoryStep` (Step 1)

**File:** `src/components/TheoryStep.tsx`

### 5.1 Add the import

At the top of the file, after the existing imports (after line 12 `import BottomNav from './shared/BottomNav';`), add:

```ts
import AutoCourseCodeInput from './AutoCourseCodeInput';
```

### 5.2 Pull `scheduleMode` from the store

In the `useJadwalStore()` destructure at line 26-30, add `scheduleMode`:

Change:
```ts
  const {
    dataTeoriMentah, setDataTeoriMentah,
    selectedTheoryRowIds, toggleTheoryRowId,
    setJadwalTeoriTerpilih, reset,
  } = useJadwalStore();
```
To:
```ts
  const {
    dataTeoriMentah, setDataTeoriMentah,
    selectedTheoryRowIds, toggleTheoryRowId,
    setJadwalTeoriTerpilih, reset,
    scheduleMode, parsedCourseCodes,
  } = useJadwalStore();
```

### 5.3 Compute the auto-mode Next guard

After the `selectedCount` declaration (line 134 `const selectedCount = selectedTheoryRowIds.length;`), add:

```ts
  // Auto-mode: check if at least one parsed code has a match
  const autoHasMatch = useMemo(
    () => {
      if (scheduleMode !== 'auto-codes' || parsedCourseCodes.length === 0 || dataTeoriMentah.length === 0) return false;
      return dataTeoriMentah.some((r) =>
        parsedCourseCodes.some((c) => c === r.KodeMK.trim().toUpperCase().replace(/\s+/g, ''))
      );
    },
    [scheduleMode, parsedCourseCodes, dataTeoriMentah]
  );

  const autoNextDisabled = scheduleMode === 'auto-codes' && !autoHasMatch;
```

Add `useMemo` to the React import at line 1 if not already present (it is already imported).

### 5.4 Render `AutoCourseCodeInput` in the left column when in auto mode

Find the block that renders after `isParsed` is true (the section starting around line 197 with `{!isParsed ? (`). Inside the `isParsed === true` branch (the `<>` fragment starting around line 198), after the `FileSummaryCard` closing tag (line 214), add the auto-codes input conditionally:

Find this exact code block (around lines 206-215):

```tsx
                <FileSummaryCard
                  fileName={fileName}
                  defaultFileName="jadwal.pdf"
                  totalCount={dataTeoriMentah.length}
                  statusText="Berhasil diproses!"
                  resetLabel="Upload Ulang"
                  resetClassName="hover:bg-red-50"
                  onReset={handleReset}
                />
```

After the closing `/>` of `FileSummaryCard`, add:

```tsx
                {scheduleMode === 'auto-codes' && (
                  <div className="mt-6 border-t-2 border-black pt-6">
                    <AutoCourseCodeInput />
                  </div>
                )}
```

### 5.5 Update the BottomNav Next handler and disabled guard

Find the `BottomNav` at the bottom of the file (around lines 284-295):

```tsx
      {isParsed && (
        <BottomNav
          selectedCount={selectedCount}
          nextLabel="Praktikum"
          nextIcon={<ArrowRight weight="bold" />}
          onNext={() => {
            const chosen = dataTeoriMentah.filter(r => selectedTheoryRowIds.includes(r.id));
            setJadwalTeoriTerpilih(chosen); onNext?.();
          }}
          nextDisabled={selectedCount === 0}
        />
      )}
```

Replace the entire block with:

```tsx
      {isParsed && (
        <BottomNav
          selectedCount={scheduleMode === 'auto-codes' ? parsedCourseCodes.length : selectedCount}
          nextLabel={scheduleMode === 'auto-codes' ? 'Pilih Kelas' : 'Praktikum'}
          nextIcon={<ArrowRight weight="bold" />}
          onNext={() => {
            if (scheduleMode === 'auto-codes') {
              onNext?.();
            } else {
              const chosen = dataTeoriMentah.filter(r => selectedTheoryRowIds.includes(r.id));
              setJadwalTeoriTerpilih(chosen); onNext?.();
            }
          }}
          nextDisabled={scheduleMode === 'auto-codes' ? autoNextDisabled : selectedCount === 0}
        />
      )}
```

**Key difference:** In auto-codes mode, step 1 Next does NOT call `setJadwalTeoriTerpilih` — that happens on step 2 Next instead. Step 1 just advances to step 2.

### Verification

```bash
npm run lint
npm run build
```

**Expected:** No errors. In manual mode, the app behaves identically to before. In auto-codes mode, the textarea and match preview appear after file parse.

---

## Step 6: Create the `AutoClassCard` component (individual course card for Step 2)

**File (new):** `src/components/AutoClassCard.tsx`

### 6.1 Write the component

```tsx
import { CaretDown, CheckCircle, XCircle, Warning } from '@phosphor-icons/react';
import type { DataTeoriMentah } from '../store/useJadwalStore';
import { normalizeCode } from '../utils/courseCode';

interface AutoClassCardProps {
  code: string;
  matches: DataTeoriMentah[];
  selectedKelas: string;
  globalKelas: string;
  onSelectKelas: (kelas: string) => void;
}

export default function AutoClassCard({
  code,
  matches,
  selectedKelas,
  globalKelas,
  onSelectKelas,
}: AutoClassCardProps) {
  const found = matches.length > 0;
  const uniqueKelas = [...new Set(matches.map((r) => r.Kelas))].sort();
  const singleSection = uniqueKelas.length === 1;
  const effectiveKelas = selectedKelas || globalKelas;

  // Highlighted rows: those matching the effective kelas
  const highlightedRows = effectiveKelas
    ? matches.filter((r) => r.Kelas === effectiveKelas)
    : [];

  if (!found) {
    return (
      <div className="border-2 border-black rounded-none p-4 bg-gray-100 opacity-70">
        <div className="flex items-center gap-2 mb-2">
          <XCircle weight="fill" className="text-red-500 shrink-0" />
          <span className="font-mono font-extrabold text-sm bg-black text-white px-2 py-0.5 border-2 border-black rounded-none">
            {code}
          </span>
        </div>
        <p className="text-sm font-bold text-gray-500 flex items-center gap-1">
          <Warning weight="fill" size={14} />
          Kode MK tidak ditemukan di file yang diunggah.
        </p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black rounded-none p-4 bg-white shadow-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000000] active:translate-x-0 active:translate-y-0 active:shadow-brutal transition-transform">
      {/* Header: code + section count */}
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle weight="fill" className="text-green-600 shrink-0" />
        <span className="font-mono font-extrabold text-sm bg-black text-white px-2 py-0.5 border-2 border-black rounded-none">
          {code}
        </span>
        <span className="text-xs font-bold text-gray-600 ml-auto">
          {matches.length} kelas • {uniqueKelas.length} pilihan
        </span>
      </div>

      {/* Course name (from first match) */}
      <h4 className="font-extrabold text-lg uppercase leading-tight mb-3">
        {matches[0]?.MataKuliah || code}
      </h4>

      {/* Kelas dropdown */}
      <div className="mb-3">
        <label className="block font-bold text-xs uppercase mb-1">
          Kelas {singleSection && '(otomatis — 1 kelas)'}
        </label>
        <div className="relative">
          <select
            value={selectedKelas || globalKelas}
            onChange={(e) => onSelectKelas(e.target.value)}
            disabled={singleSection}
            className={
              'w-full appearance-none bg-secondary rounded-none border-2 border-black pl-3 pr-8 py-2 font-bold text-sm cursor-pointer focus:outline-none focus:shadow-brutal-sm hover:shadow-brutal-sm transition-shadow text-black ' +
              (singleSection ? 'opacity-60 cursor-not-allowed' : '')
            }
          >
            <option value="">— Pilih Kelas —</option>
            {uniqueKelas.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <CaretDown
            weight="bold"
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-lg"
          />
        </div>
        {selectedKelas && globalKelas && selectedKelas !== globalKelas && (
          <p className="text-xs font-bold text-yellow-600 mt-1">
            Override global (global: {globalKelas})
          </p>
        )}
      </div>

      {/* Section list */}
      <div className="border-t-2 border-dashed border-gray-400 pt-3">
        <p className="text-xs font-bold uppercase text-gray-500 mb-2">Kelas Tersedia</p>
        <ul className="space-y-1">
          {matches.map((row) => {
            const isSelected = effectiveKelas === row.Kelas;
            return (
              <li
                key={row.id}
                className={
                  'flex items-center gap-2 text-xs font-semibold border-2 border-black rounded-none px-2 py-1.5 ' +
                  (isSelected ? 'bg-tertiary text-white' : 'bg-gray-50 text-black')
                }
              >
                <span className="font-mono font-bold w-6 text-center">{row.Kelas}</span>
                <span>—</span>
                <span>{row.Hari}</span>
                <span>{row.Jam}</span>
                <span className="ml-auto truncate">{row.Ruang}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
```

### Verification

```bash
npm run lint
npm run build
```

**Expected:** No errors. `AutoClassCard` compiles but is not yet rendered.

---

## Step 7: Create the `AutoClassPicker` component (Step 2 auto mode)

**File (new):** `src/components/AutoClassPicker.tsx`

### 7.1 Write the component

```tsx
import { useMemo, useCallback } from 'react';
import { ArrowLeft, ArrowRight, CaretDown, MagicWand } from '@phosphor-icons/react';
import WizardHeader from './WizardHeader';
import AutoClassCard from './AutoClassCard';
import { useJadwalStore } from '../store/useJadwalStore';
import { findMatchingRows, selectByKodeAndKelas } from '../utils/courseCode';
import BottomNav from './shared/BottomNav';

interface AutoClassPickerProps {
  onBack?: () => void;
  onNext?: () => void;
}

export default function AutoClassPicker({ onBack, onNext }: AutoClassPickerProps) {
  const {
    dataTeoriMentah,
    parsedCourseCodes,
    courseClassSelections,
    setCourseClassSelection,
    globalClassSelection,
    setGlobalClassSelection,
    applyGlobalToAll,
    setJadwalTeoriTerpilih,
    setSelectedTheoryRowIds,
  } = useJadwalStore();

  const matchMap = useMemo(
    () => findMatchingRows(parsedCourseCodes, dataTeoriMentah),
    [parsedCourseCodes, dataTeoriMentah]
  );

  // All unique kelas values across all matched rows (for the global dropdown)
  const allKelas = useMemo(() => {
    const set = new Set<string>();
    for (const code of parsedCourseCodes) {
      const matches = matchMap.get(code) || [];
      matches.forEach((r) => {
        if (r.Kelas) set.add(r.Kelas);
      });
    }
    return Array.from(set).sort();
  }, [parsedCourseCodes, matchMap]);

  const matchedCount = parsedCourseCodes.filter(
    (c) => (matchMap.get(c) || []).length > 0
  ).length;
  const unmatchedCount = parsedCourseCodes.length - matchedCount;

  const handleGlobalChange = useCallback(
    (kelas: string) => {
      setGlobalClassSelection(kelas);
      if (kelas) {
        // Apply immediately to all codes that have matches
        for (const code of parsedCourseCodes) {
          const matches = matchMap.get(code) || [];
          if (matches.length > 0) {
            // Only set if this kelas exists for this course, otherwise leave unset
            const hasKelas = matches.some((r) => r.Kelas === kelas);
            if (hasKelas) {
              setCourseClassSelection(code, kelas);
            }
          }
        }
      }
    },
    [parsedCourseCodes, matchMap, setGlobalClassSelection, setCourseClassSelection]
  );

  const handleNext = useCallback(() => {
    const selectedIds = selectByKodeAndKelas(
      parsedCourseCodes,
      courseClassSelections,
      dataTeoriMentah
    );
    const chosen = dataTeoriMentah.filter((r) => selectedIds.includes(r.id));
    setJadwalTeoriTerpilih(chosen);
    setSelectedTheoryRowIds(selectedIds);
    onNext?.();
  }, [parsedCourseCodes, courseClassSelections, dataTeoriMentah, setJadwalTeoriTerpilih, setSelectedTheoryRowIds, onNext]);

  const selectedCourseCount = Object.keys(courseClassSelections).filter(
    (k) => courseClassSelections[k]
  ).length;

  return (
    <div className="bg-background">
      <WizardHeader currentStep={2} />
      <main className="p-4 md:p-8 pb-32">
        <div className="w-full max-w-7xl mx-auto lg:grid lg:grid-cols-12 gap-8 lg:gap-12">
          {/* LEFT: Summary + Global dropdown */}
          <section className="w-full lg:col-span-4 mb-8 lg:mb-0">
            <div className="mb-6 text-center lg:text-left">
              <h1 className="text-4xl lg:text-5xl font-extrabold uppercase leading-tight mb-2 tracking-tight">
                Pilih Kelas
                <span className="block text-base font-bold text-gray-600 mt-2 normal-case">
                  Mode: Auto by Course Codes
                </span>
              </h1>
              <p className="font-semibold text-lg max-w-md mx-auto lg:mx-0 mt-4">
                Pilih kelas untuk semua mata kuliah sekaligus atau per mata kuliah.
              </p>
            </div>

            {/* Summary card */}
            <div className="bg-white border-2 border-black rounded-none shadow-none p-6 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-full bg-background border-2 border-black p-3 text-sm font-bold flex justify-between items-center rounded-none">
                Total Kode:<span className="bg-black text-white px-2 rounded">{parsedCourseCodes.length}</span>
              </div>
              <div className="w-full bg-background border-2 border-black p-3 text-sm font-bold flex justify-between items-center rounded-none">
                Cocok:<span className="bg-green-600 text-white px-2 rounded">{matchedCount}</span>
              </div>
              {unmatchedCount > 0 && (
                <div className="w-full bg-background border-2 border-black p-3 text-sm font-bold flex justify-between items-center rounded-none">
                  Tidak cocok:<span className="bg-red-600 text-white px-2 rounded">{unmatchedCount}</span>
                </div>
              )}
            </div>

            {/* Apply-to-All global dropdown */}
            {allKelas.length > 0 && (
              <div className="mt-4 bg-white border-2 border-black rounded-none p-4">
                <label className="block font-extrabold text-sm uppercase mb-1">
                  Kelas untuk Semua
                </label>
                <p className="text-xs font-semibold text-gray-600 mb-2">
                  Pilih satu kelas untuk semua mata kuliah yang cocok.
                </p>
                <div className="relative w-full">
                  <select
                    value={globalClassSelection}
                    onChange={(e) => handleGlobalChange(e.target.value)}
                    className="w-full appearance-none bg-secondary rounded-none border-2 border-black pl-3 pr-8 py-2 font-bold text-sm cursor-pointer focus:outline-none focus:shadow-brutal-sm hover:shadow-brutal-sm transition-shadow text-black"
                  >
                    <option value="">— Tidak ada global —</option>
                    {allKelas.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                  <CaretDown
                    weight="bold"
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-lg"
                  />
                </div>
              </div>
            )}
          </section>

          {/* RIGHT: Course cards */}
          <section className="w-full lg:col-span-8">
            <div className="bg-white border-2 border-black shadow-none h-full flex flex-col rounded-none overflow-hidden">
              <div className="border-b-2 border-black p-4 bg-tertiary text-white rounded-none flex justify-between items-center">
                <div className="font-extrabold text-xl uppercase">Pilih Kelas per Kode MK</div>
                <div className="font-bold text-sm">
                  {selectedCourseCount} / {matchedCount} dipilih
                </div>
              </div>
              <div className="p-4 md:p-6 flex-1 overflow-y-auto bg-background flex flex-col gap-4">
                {parsedCourseCodes.map((code) => {
                  const matches = matchMap.get(code) || [];
                  return (
                    <AutoClassCard
                      key={code}
                      code={code}
                      matches={matches}
                      selectedKelas={courseClassSelections[code] || ''}
                      globalKelas={globalClassSelection}
                      onSelectKelas={(kelas) => setCourseClassSelection(code, kelas)}
                    />
                  );
                })}
                {parsedCourseCodes.length === 0 && (
                  <div className="text-center py-8 font-bold text-gray-500">
                    Belum ada kode MK yang diparse. Kembali ke langkah 1.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Fixed bottom nav */}
      <BottomNav
        selectedCount={selectedCourseCount}
        leftContent={
          <button
            onClick={onBack}
            className="bg-white rounded-none border-2 border-black px-3 py-2 font-bold transition-all inline-flex items-center gap-2 shadow-none hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal active:translate-x-0 active:translate-y-0 active:shadow-none text-sm"
          >
            <ArrowLeft weight="bold" />
            <span className="hidden md:inline">Kembali</span>
          </button>
        }
        rightContent={
          <button
            disabled={selectedCourseCount === 0}
            onClick={handleNext}
            className={
              'rounded-none border-2 border-black px-4 py-3 font-extrabold uppercase transition-all inline-flex items-center gap-2 ' +
              (selectedCourseCount > 0
                ? 'bg-tertiary text-white shadow-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed')
            }
          >
            <span className="hidden md:inline">Lihat Hasil</span>
            <MagicWand weight="bold" />
          </button>
        }
      />
    </div>
  );
}
```

### Verification

```bash
npm run lint
npm run build
```

**Expected:** No errors. `AutoClassPicker` compiles but is not yet wired into `main.tsx`.

---

## Step 8: Wire `ModeSwitcher` and `AutoClassPicker` into `main.tsx`

**File:** `src/main.tsx`

### 8.1 Add imports

After line 7 (`import ResultStep from './components/ResultStep';`), add:

```ts
import ModeSwitcher from './components/ModeSwitcher';
import AutoClassPicker from './components/AutoClassPicker';
```

### 8.2 Pull `scheduleMode` from the store

Change line 21:
```ts
  const { wizardStep, setWizardStep } = useJadwalStore();
```
To:
```ts
  const { wizardStep, setWizardStep, scheduleMode } = useJadwalStore();
```

### 8.3 Update the render block

Replace the entire `return` block (lines 40-46):

```tsx
  return (
    <StrictMode>
      {wizardStep === 1 && <TheoryStep onNext={() => setWizardStep(2)} />}
      {wizardStep === 2 && <PraktikumStep onBack={() => setWizardStep(1)} onNext={() => setWizardStep(3)} />}
      {wizardStep === 3 && <ResultStep onBack={() => setWizardStep(2)} />}
    </StrictMode>
  );
```

With:

```tsx
  return (
    <StrictMode>
      {wizardStep !== 3 && <ModeSwitcher />}
      {wizardStep === 1 && <TheoryStep onNext={() => setWizardStep(2)} />}
      {wizardStep === 2 && scheduleMode === 'auto-codes' && (
        <AutoClassPicker onBack={() => setWizardStep(1)} onNext={() => setWizardStep(3)} />
      )}
      {wizardStep === 2 && scheduleMode === 'manual' && (
        <PraktikumStep onBack={() => setWizardStep(1)} onNext={() => setWizardStep(3)} />
      )}
      {wizardStep === 3 && <ResultStep onBack={() => setWizardStep(2)} />}
    </StrictMode>
  );
```

### Verification

```bash
npm run lint
npm run build
```

**Expected:** No errors. The full app builds. The `ModeSwitcher` appears on steps 1-2. In manual mode, behavior is identical to before. In auto-codes mode, step 2 renders `AutoClassPicker` instead of `PraktikumStep`.

---

## Step 9: Handle auto-select for single-section courses on parse

**File:** `src/components/AutoCourseCodeInput.tsx`

This was already included in Step 4.1's `handleParse` function — when the user clicks "Parse Kode", single-section courses are auto-assigned their only `Kelas` value in `courseClassSelections`. No additional step is needed here; this section is a verification checkpoint.

### Verification

```bash
npm run lint
npm run build
```

**Expected:** No errors. The `handleParse` function in `AutoCourseCodeInput` correctly calls `setCourseClassSelection` for single-section courses.

---

## Step 10: Clear `courseClassSelections` on file re-upload in auto mode

**File:** `src/components/TheoryStep.tsx`

### 10.1 Pull `clearAutoCodesState`-adjacent action

The store already has `courseClassSelections` and `setCourseClassSelection`. We need to clear selections when a new file is uploaded. In the `useJadwalStore()` destructure (line 26, already modified in Step 5.2), we already pulled `scheduleMode` and `parsedCourseCodes`. We do not need a new store action — we can clear `courseClassSelections` by calling the existing pattern. However, to keep it clean, the store's `setDataTeoriMentah` action should also clear stale selections. 

**Alternative approach (simpler, no store change needed):** In `TheoryStep.tsx`, inside the `startParsing` callback (line 48), clear `courseClassSelections` before parsing. This requires pulling `setCourseClassSelection` or a dedicated clear function.

Since the store already has `clearAutoCodesState` (added in Step 1.4), pull it into `TheoryStep.tsx`:

Update the destructure (from Step 5.2) to also include `clearAutoCodesState`:

```ts
  const {
    dataTeoriMentah, setDataTeoriMentah,
    selectedTheoryRowIds, toggleTheoryRowId,
    setJadwalTeoriTerpilih, reset,
    scheduleMode, parsedCourseCodes,
    courseClassSelections,
    setCourseClassSelection,
  } = useJadwalStore();
```

Wait — `clearAutoCodesState` clears ALL auto state including `courseCodeInput` and `parsedCourseCodes`. We only want to clear `courseClassSelections` on re-upload. The simplest fix: add a targeted store action.

### 10.2 Add `clearCourseClassSelections` to the store

**File:** `src/store/useJadwalStore.ts`

Add to the `JadwalState` interface (after `clearAutoCodesState: () => void;`):

```ts
  clearCourseClassSelections: () => void;
```

Add the implementation (after `clearAutoCodesState`):

```ts
      clearCourseClassSelections: () => set({ courseClassSelections: {} }),
```

### 10.3 Call it in `TheoryStep.tsx` on file upload

In `TheoryStep.tsx`, pull `clearCourseClassSelections` from the store:

Update the destructure to:

```ts
  const {
    dataTeoriMentah, setDataTeoriMentah,
    selectedTheoryRowIds, toggleTheoryRowId,
    setJadwalTeoriTerpilih, reset,
    scheduleMode, parsedCourseCodes,
    clearCourseClassSelections,
  } = useJadwalStore();
```

In the `startParsing` callback (line 48), add the clear call as the first line inside the callback body:

```ts
  const startParsing = useCallback((file: File) => {
    clearCourseClassSelections();
    setFileName(file.name); setIsLoading(true); setLoadingLog(''); setErrorMessage(null);
    // ... rest of existing code
  }, [setDataTeoriMentah, clearCourseClassSelections]);
```

Update the dependency array of `startParsing` to include `clearCourseClassSelections`.

### Verification

```bash
npm run lint
npm run build
```

**Expected:** No errors. Re-uploading a file clears stale class selections.

---

## Step 11: Final integration test and verification

### 11.1 Full build check

```bash
npm run lint
npm run build
```

**Expected:** Both pass with zero errors and zero warnings.

### 11.2 Manual checklist (if dev server is available)

Start the dev server:

```bash
npm run dev
```

Then verify each acceptance criterion from the spec:

1. [ ] Mode switcher is visible on steps 1-2. Toggling between "Manual" and "Auto by Course Codes" works.
2. [ ] In auto mode, step 1 shows file upload + course code textarea. Typing codes and clicking "Parse Kode" produces a normalized, uppercase, deduplicated list.
3. [ ] Match preview shows green checkmarks for found codes and red X for unfound codes.
4. [ ] Next on step 1 is disabled until file is parsed AND at least one code has a match.
5. [ ] Step 2 shows one `AutoClassCard` per parsed code.
6. [ ] Global "Apply to All" dropdown sets all individual selections in one action.
7. [ ] Individual dropdowns override the global selection for that course only.
8. [ ] Next on step 2 computes `jadwalTeoriTerpilih` from selections and advances to step 3.
9. [ ] Step 3 (ResultStep) renders the auto-selected schedule identically to manual mode.
10. [ ] Back from step 3 returns to step 2 with selections restored.
11. [ ] Switching mode clears mode-specific state but preserves `dataTeoriMentah`.
12. [ ] Reloading the page in auto mode restores all persisted state.
13. [ ] No changes to `theory.worker.ts`, `ResultStep.tsx`, or shared components — confirmed by `git diff`.

### 11.3 Git diff verification

```bash
git diff --stat HEAD
```

**Expected changed files:**

| File | Change type |
|---|---|
| `src/main.tsx` | Modified — added imports, `scheduleMode` pull, conditional render |
| `src/store/useJadwalStore.ts` | Modified — new state, actions, partialize, version bump |
| `src/components/TheoryStep.tsx` | Modified — auto-codes input, Next guard, clear on re-upload |
| `src/components/ModeSwitcher.tsx` | **New** |
| `src/components/AutoCourseCodeInput.tsx` | **New** |
| `src/components/AutoClassPicker.tsx` | **New** |
| `src/components/AutoClassCard.tsx` | **New** |
| `src/utils/courseCode.ts` | **New** |

**Expected NOT changed:**

| File | Reason |
|---|---|
| `src/workers/theory.worker.ts` | Reused as-is |
| `src/workers/praktikum.worker.ts` | Not used in auto mode |
| `src/components/ResultStep.tsx` | Reused as-is |
| `src/components/PraktikumStep.tsx` | Only used in manual mode (unchanged) |
| `src/components/ClassCard.tsx` | Only used in manual mode (unchanged) |
| `src/components/EditModal.tsx` | Reused as-is |
| `src/components/WizardHeader.tsx` | Reused as-is |
| `src/components/shared/*.tsx` | All shared components reused as-is |

---

## Summary of all new and modified files

### New files (6)

| # | Path | Purpose |
|---|---|---|
| 1 | `src/utils/courseCode.ts` | `normalizeCode`, `normalizeCourseCodes`, `findMatchingRows`, `selectByKodeAndKelas` |
| 2 | `src/components/ModeSwitcher.tsx` | Segmented toggle: Manual / Auto by Course Codes |
| 3 | `src/components/AutoCourseCodeInput.tsx` | Textarea + parse button + match preview (step 1) |
| 4 | `src/components/AutoClassCard.tsx` | Individual course card with dropdown + section list (step 2) |
| 5 | `src/components/AutoClassPicker.tsx` | Full step 2 layout: summary + global dropdown + card list + BottomNav |
| 6 | (none — `AutoCourseCodeInput` is the step-1 piece, `AutoClassPicker` is step 2) | — |

### Modified files (3)

| # | Path | Changes |
|---|---|---|
| 1 | `src/store/useJadwalStore.ts` | Add `ScheduleMode` type, 5 new state fields, 8 new actions, `partialize` additions, version bump |
| 2 | `src/main.tsx` | Add `ModeSwitcher` + conditional `AutoClassPicker` rendering |
| 3 | `src/components/TheoryStep.tsx` | Render `AutoCourseCodeInput` in auto mode, update Next guard, clear selections on re-upload |

### Unchanged files (verified)

All workers, `ResultStep`, `PraktikumStep`, `ClassCard`, `EditModal`, `WizardHeader`, and all shared components remain untouched.

---

## Execution order dependency graph

```
Step 1 (store) ─────┬──→ Step 2 (utils) ──┬──→ Step 3 (ModeSwitcher) ───────→ Step 8 (main.tsx wiring)
                    │                      │
                    ├──→ Step 4 (AutoCourseCodeInput) ──→ Step 5 (TheoryStep wiring)
                    │                                              │
                    │                                              ↓
                    │                                         Step 10 (clear on re-upload)
                    │
                    └──→ Step 6 (AutoClassCard) ──→ Step 7 (AutoClassPicker) ──┘

Step 9 is a verification checkpoint (already implemented in Step 4).
Step 11 is final verification.
```

All steps must be executed in order. Each step group ends with `npm run lint && npm run build`.
