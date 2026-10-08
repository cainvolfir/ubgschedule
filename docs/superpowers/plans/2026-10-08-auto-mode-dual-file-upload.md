# Auto Mode Dual-File Upload & Legacy Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable dual-file upload (Teori + Praktikum) in Auto Mode alongside legacy format support (PDF theory, matrix spreadsheet practical), with automatic matching and lab sub-group selection.

**Architecture:** Extend Zustand store with `autoPraktikumRaw` and `courseLabGroupSelections`. Add a secondary optional dropzone in `TheoryStep.tsx` that routes to `praktikum.worker.ts` with auto-prefix discovery. Enhance `courseCode.ts` to match practical rows across both combined files and separate files via `KodeMK` and normalized course names. Update `AutoClassPicker` and `AutoClassCard` to render theory and practical slots, offer sub-group selection for lab groups, and pass unified selections to `ResultStep`.

**Tech Stack:** React 19, TypeScript, Zustand 5, Tailwind CSS v3, Web Workers (`pdfjs-dist`, `xlsx`), Node.js test runner for unit tests.

**Spec:** `docs/superpowers/specs/2026-10-08-auto-mode-dual-file-upload-design.md`

## Global Constraints

- **Platform:** Client-side React 19 PWA, Web Workers for file parsing.
- **Language / Locale:** UI text in Indonesian (Bumigora student conventions: SKS, Kelas, Teori, Praktikum/Lab).
- **Format Compatibility:**
  - Teori: `.pdf` (legacy), `.xlsx`/`.xls` (new portal & legacy Excel).
  - Praktikum: `.xlsx`/`.xls` (new portal format & legacy room-matrix format).
  - 1-File Combined: Preserved 100% backward compatibility when only 1 combined file is uploaded.
- **Non-Goals:** Do NOT touch ICS export (`ExportICS.tsx`), do NOT break Manual Mode.

---

### Task 1: Store & Matching Utilities Extension

**Files:**
- Modify: `src/store/useJadwalStore.ts`
- Modify: `src/utils/courseCode.ts`
- Create: `test/courseCode.test.mjs`

**Interfaces:**
- Consumes: `DataTeoriMentah`, `PraktikumCandidate` types from `src/store/useJadwalStore.ts`.
- Produces:
  - Store fields: `autoPraktikumRaw: PraktikumCandidate[]`, `courseLabGroupSelections: Record<string, string>`.
  - Store actions: `setAutoPraktikumRaw(candidates)`, `setCourseLabGroupSelection(kode, groupId)`, `clearAutoPraktikumRaw()`.
  - Utility functions: `normalizeCourseName(name: string): string`, `matchPraktikumForCourse(theoryRow, practicalCandidates): PraktikumCandidate[]`.

- [ ] **Step 1: Write the unit test for course matching and normalization**

Create `test/courseCode.test.mjs`:
```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCode,
  normalizeCourseCodes,
  normalizeCourseName,
  findMatchingRows,
  matchPraktikumForCourse,
} from '../src/utils/courseCode.ts';

test('normalizeCourseName strips lab suffixes and punctuation', () => {
  assert.equal(normalizeCourseName('PRAKTIKUM PEMROGRAMAN WEB'), 'pemrogramanweb');
  assert.equal(normalizeCourseName('Pemrograman Web (Lab)'), 'pemrogramanweb');
  assert.equal(normalizeCourseName('Struktur Data - Praktikum'), 'strukturdata');
  assert.equal(normalizeCourseName('BASIS DATA II'), 'basisdata2');
});

test('matchPraktikumForCourse matches by KodeMK or normalized course name and class letter', () => {
  const theory = {
    id: 't-1',
    KodeMK: 'IF1234',
    MataKuliah: 'Pemrograman Web',
    Kelas: 'A',
    SKS: '2',
    SMT: '3',
    DosenPengampuh: 'Dosen A',
    Hari: 'Senin',
    Jam: '08.00-09.40',
    Ruang: 'R.301',
    Keterangan: '',
  };

  const praktikumCandidates = [
    {
      id: 'p-1',
      courseName: 'Praktikum Pemrograman Web',
      kelas: 'A',
      keterangan: 'Kelompok A1',
      dosen: 'Asisten 1',
      semester: '3',
      hari: 'Selasa',
      jam: '10.00-11.40',
      ruang: 'LAB 1',
    },
    {
      id: 'p-2',
      courseName: 'Praktikum Pemrograman Web',
      kelas: 'A',
      keterangan: 'Kelompok A2',
      dosen: 'Asisten 2',
      semester: '3',
      hari: 'Rabu',
      jam: '10.00-11.40',
      ruang: 'LAB 2',
    },
    {
      id: 'p-3',
      courseName: 'Praktikum Pemrograman Web',
      kelas: 'B',
      keterangan: 'Kelompok B1',
      dosen: 'Asisten 1',
      semester: '3',
      hari: 'Kamis',
      jam: '10.00-11.40',
      ruang: 'LAB 1',
    },
  ];

  const matched = matchPraktikumForCourse(theory, praktikumCandidates);
  assert.equal(matched.length, 2);
  assert.equal(matched[0].id, 'p-1');
  assert.equal(matched[1].id, 'p-2');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types test/courseCode.test.mjs`
Expected: FAIL (missing `normalizeCourseName` and `matchPraktikumForCourse`).

- [ ] **Step 3: Implement matching functions in `src/utils/courseCode.ts` and store updates in `src/store/useJadwalStore.ts`**

Update `src/utils/courseCode.ts`:
Add `normalizeCourseName` and `matchPraktikumForCourse`.

Update `src/store/useJadwalStore.ts`:
- Add `autoPraktikumRaw: PraktikumCandidate[]`
- Add `courseLabGroupSelections: Record<string, string>`
- Add actions:
  - `setAutoPraktikumRaw: (candidates: PraktikumCandidate[]) => void`
  - `setCourseLabGroupSelection: (kode: string, groupId: string) => void`
  - `clearAutoPraktikumRaw: () => void`
- Update `clearAutoCodesState`, `reset`, `setScheduleMode`, and `partialize`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types test/courseCode.test.mjs`
Expected: PASS.

- [ ] **Step 5: Verify build & commit**

Run: `npm run build`
Commit:
```bash
git add test/courseCode.test.mjs src/utils/courseCode.ts src/store/useJadwalStore.ts
git commit -m "feat(store): add autoPraktikumRaw state and course matching utilities"
```

---

### Task 2: Worker Support for Auto Praktikum & Combined Detection

**Files:**
- Modify: `src/workers/praktikum.worker.ts`
- Modify: `src/workers/theory.worker.ts`

**Interfaces:**
- Consumes: Worker message envelopes (`PARSE_THEORY`, `SCAN_XLSX`, `PARSE_PRAKTIKUM`, new action `AUTO_PARSE_PRAKTIKUM`).
- Produces:
  - `theory.worker.ts`: includes `isPraktikum` metadata or keep lab rows tagged in `DataTeoriMentah`.
  - `praktikum.worker.ts`: handles `{ type: 'AUTO_PARSE_PRAKTIKUM', file }` which automatically scans prefixes and parses all lab candidates without prompting for a room prefix.

- [ ] **Step 1: Update `praktikum.worker.ts` to handle `AUTO_PARSE_PRAKTIKUM`**

Add message handler in `src/workers/praktikum.worker.ts`:
When `type === 'AUTO_PARSE_PRAKTIKUM'`:
1. Load matrix.
2. If `isNewPortalFormat(matrix)`: parse portal praktikum with `roomPrefix = 'SEMUA LAB'`.
3. If legacy matrix format: extract room prefixes. If prefixes found, parse with the primary prefix (or scan all prefixes) and return all candidates.
4. Post `PARSE_RESULT` with candidates array.

- [ ] **Step 2: Check `theory.worker.ts` for PDF & combined XLSX support**

Verify that:
1. When PDF is uploaded, `theory.worker.ts` parses `dataTeoriMentah`.
2. When XLSX is uploaded, it preserves `Keterangan` with group info so combined files are identifiable.

- [ ] **Step 3: Run build to ensure worker TypeScript types are valid**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit worker changes**

```bash
git add src/workers/praktikum.worker.ts src/workers/theory.worker.ts
git commit -m "feat(workers): add AUTO_PARSE_PRAKTIKUM support and ensure dual format parsing"
```

---

### Task 3: Dual Dropzone in Step 1 (`TheoryStep.tsx`)

**Files:**
- Modify: `src/components/TheoryStep.tsx`

**Interfaces:**
- Consumes: `useJadwalStore` (`dataTeoriMentah`, `setDataTeoriMentah`, `autoPraktikumRaw`, `setAutoPraktikumRaw`, `clearAutoPraktikumRaw`, `scheduleMode`).
- Produces: Dual dropzones in left column of `TheoryStep`:
  - Dropzone 1 (Teori): accepts `.pdf,.xlsx,.xls`. Displays `FileSummaryCard` when parsed + badge if combined file is detected.
  - Dropzone 2 (Praktikum - Opsional): accepts `.xlsx,.xls`. Displays `FileSummaryCard` when parsed with reset button.

- [ ] **Step 1: Update drop handler and input accept in `TheoryStep.tsx` for Auto Mode**

In `TheoryStep.tsx`:
- Allow `.pdf,.xlsx,.xls` for Dropzone 1 in `scheduleMode === 'auto-codes'`.
- Add secondary worker reference `prakWorkerRef` and state:
  - `prakFileName: string`
  - `isPrakLoading: boolean`
  - `prakLoadingLog: string`
  - `prakError: string | null`
- Add `startParsingPraktikum(file: File)`:
  - Spawns worker from `../workers/praktikum.worker.ts`.
  - Sends `{ type: 'AUTO_PARSE_PRAKTIKUM', file: buffer }`.
  - On `PARSE_RESULT`, saves results to `setAutoPraktikumRaw`.

- [ ] **Step 2: Render Dropzone 2 in Auto Mode Left Column**

- Place Dropzone 2 directly below Dropzone 1.
- Add label: "Jadwal Praktikum (Opsional)" and subtitle "Unggah jika jadwal lab ada di file Excel terpisah".
- If combined file detected in Dropzone 1 (`dataTeoriMentah.some(r => /prak|lab/i.test(r.Keterangan || '') || /lab/i.test(r.Ruang || ''))`), display a helpful banner:
  *"File gabungan terdeteksi (memuat jadwal teori dan lab)"*.

- [ ] **Step 3: Run linter and verify build**

Run: `npm run lint && npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit Step 1 changes**

```bash
git add src/components/TheoryStep.tsx
git commit -m "feat(ui): add dual dropzone and legacy PDF support in TheoryStep auto mode"
```

---

### Task 4: AutoClassPicker & AutoClassCard Multi-Source Matching & Lab Sub-Group Selection

**Files:**
- Modify: `src/components/AutoClassCard.tsx`
- Modify: `src/components/AutoClassPicker.tsx`

**Interfaces:**
- Consumes:
  - `dataTeoriMentah`, `autoPraktikumRaw`, `parsedCourseCodes`, `courseClassSelections`, `courseLabGroupSelections`.
- Produces:
  - `AutoClassCard`: Renders theory row + linked praktikum row(s). If multiple lab sub-groups exist (e.g., `A1` vs `A2`), renders sub-group selector.
  - `AutoClassPicker`: When proceeding to Step 3 (`handleNext`), collects selected theory rows into `jadwalTeoriTerpilih` AND linked praktikum rows into `praktikumCandidates` + `selectedCandidateIds` so `ResultStep` renders both.

- [ ] **Step 1: Enhance `AutoClassCard.tsx` with lab rows and sub-group selector**

- Pass `linkedPraktikum: PraktikumCandidate[]` into `AutoClassCard`.
- Pass `selectedLabGroup: string` and `onSelectLabGroup: (groupId: string) => void`.
- When a class letter (e.g. `Kelas A`) is selected:
  - Find all lab entries linked to class `A`.
  - If 1 lab entry: display it with `[Lab]` badge and details (Day, Time, Room).
  - If multiple lab sub-groups (e.g. `Kelompok A1`, `Kelompok A2`): display a selector (dropdown or segmented buttons) allowing the user to pick their specific group.

- [ ] **Step 2: Update `AutoClassPicker.tsx` to resolve practical candidates and merge on Next**

- In `AutoClassPicker.tsx`:
  - For each course code, gather theory matches from `dataTeoriMentah`.
  - For each theory match, find matching practical rows from either embedded lab rows in `dataTeoriMentah` OR `autoPraktikumRaw` using `matchPraktikumForCourse`.
  - In `handleNext`:
    - Collect selected theory rows into `setJadwalTeoriTerpilih(chosenTheory)`.
    - Collect selected practical rows (from `autoPraktikumRaw` or embedded lab rows) and set them into `setPraktikumCandidates` and `setSelectedCandidateIds`.

- [ ] **Step 3: Run linter and verify build**

Run: `npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit Step 2 & 3 changes**

```bash
git add src/components/AutoClassCard.tsx src/components/AutoClassPicker.tsx
git commit -m "feat(ui): support linked praktikum display and lab sub-group selection in AutoClassPicker"
```

---

### Task 5: End-to-End Verification & Edge Cases

**Files:**
- Test: `test/courseCode.test.mjs`
- Manual verification script or automated tests

- [ ] **Step 1: Run comprehensive tests**

Run: `node --experimental-strip-types test/courseCode.test.mjs`
Expected: PASS.

- [ ] **Step 2: Verify production build and linting**

Run: `npm run lint`
Run: `npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit final plan verification and cleanup**

```bash
git add test/courseCode.test.mjs
git commit -m "test: add test coverage for auto mode dual-file matching"
```
