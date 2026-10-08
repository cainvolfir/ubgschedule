# Auto Mode Dual-File Upload & Legacy Format Support — Architectural Design Specification

| Field | Value |
|---|---|
| **Date** | 2026-10-08 |
| **Status** | Agreed / Ready for Planning |
| **Scope** | Dual-file upload (Teori + Praktikum) in Auto Mode, legacy file support (PDF theory, matrix spreadsheet praktikum), sub-group lab selection |
| **Non-Goals** | ICS export modifications, backend server/API, automated schedule clash solver |

---

## 1. Overview

### 1.1 Problem
Currently, Auto Mode (`scheduleMode: 'auto-codes'`) assumes a single XLSX file uploaded from the Labkom portal containing both theory and practical classes. However, in many academic periods at Universitas Bumigora (UBG):
1. Theory and practical schedules are published as two separate files (e.g., Theory in PDF or XLSX, and Praktikum in XLSX).
2. Students also hold legacy files from older semesters or systems:
   - Legacy Theory: `.pdf` timetable files parsed via PDF parser.
   - Legacy Praktikum: `.xlsx`/`.xls` matrix timetable spreadsheets with room prefixes (`LAB`, `A`, etc.).
3. When theory and praktikum are separated, practical classes often lack `KodeMK` (identifying courses only by name, such as "PEMROGRAMAN WEB A"), and may have multiple lab sub-groups (e.g., `A1` and `A2`) for the same theory class section.

### 1.2 Solution
Upgrade Auto Mode to support:
1. **Dual Dropzone in Step 1**:
   - Primary Dropzone: Jadwal Teori (`.pdf`, `.xlsx`, `.xls`). Detects whether the file already contains combined theory + lab data.
   - Secondary Dropzone (Optional): Jadwal Praktikum (`.xlsx`, `.xls`). Used when practical classes are in a separate file.
2. **Backward & Legacy Format Compatibility**:
   - Supports legacy PDF theory files via `theory.worker.ts`.
   - Supports legacy room-matrix practical spreadsheets via `praktikum.worker.ts` with automatic room detection (no manual prefix selection needed).
   - Preserves 100% compatibility for single combined files (if only the primary file is uploaded and contains lab rows).
3. **Smart Matching in Step 2 (`AutoClassPicker`)**:
   - Theory matched by `KodeMK`.
   - Praktikum matched by `KodeMK` (if present) or normalized course name similarity (`MataKuliah` $\leftrightarrow$ `courseName`) + class letter (`Kelas A` links to lab `A`, `A1`, `A2`).
   - Lab sub-group selector in `AutoClassCard` when multiple lab groups exist for the selected class section.

### 1.3 Non-Goals
- ICS export adjustments (explicitly skipped per user decision).
- Automatic schedule clash optimization (user chooses sections manually).
- Any breaking changes to Manual Mode.

---

## 2. User Experience & Component Architecture

### 2.1 Step 1: Dual Upload & Course Code Input (`TheoryStep.tsx`)
In `scheduleMode === 'auto-codes'`:
- **Left Column (Upload Section)**:
  - **Dropzone 1 (Jadwal Teori - Utama)**:
    - Accepts `.pdf`, `.xlsx`, `.xls`.
    - Handled by `theory.worker.ts`.
    - Once parsed, displays `FileSummaryCard` with file name, row count, and a badge if combined lab rows are detected (`File gabungan (Teori + Lab)`).
  - **Dropzone 2 (Jadwal Praktikum - Opsional)**:
    - Accepts `.xlsx`, `.xls`.
    - Visible alongside or directly below Dropzone 1.
    - Handled by `praktikum.worker.ts`.
    - Automatically scans and parses all lab candidates without requiring manual prefix selection.
    - Displays `FileSummaryCard` when uploaded, with option to remove or replace.
- **Right Column**:
  - `AutoCourseCodeInput` remains available (can be filled before or after file upload).
- **Navigation (BottomNav)**:
  - "Pilih Kelas" button is enabled once the theory file is parsed and at least one course code matches.

### 2.2 Step 2: Class & Lab Section Selection (`AutoClassPicker.tsx`)
- Resolves each input course code into:
  - Available Theory sections (e.g., `Kelas A`, `Kelas B`).
  - Associated Praktikum sections:
    - From combined file (`dataTeoriMentah` rows where `isPraktikum === true`).
    - OR from secondary practical file (`autoPraktikumRaw`).
- **Global Dropdown ("Terapkan ke Semua")**:
  - Sets global class letter (e.g. `A`).
  - Automatically activates theory `A` and associated lab `A` (or default sub-group `A1`).
- **Individual Course Card (`AutoClassCard.tsx`)**:
  - Displays selected theory slot (Day, Time, Room, Lecturer) with `[Teori]` badge.
  - Displays linked practical slot with `[Lab]` badge.
  - If multiple lab sub-groups exist for the selected class (e.g. `Kelompok A1` and `Kelompok A2`):
    - Renders a sub-group selection control (radio/pills or select dropdown) allowing student to choose their lab group.

### 2.3 Step 3: Result Schedule (`ResultStep.tsx`)
- Unchanged interface.
- Receives selected theory rows + selected practical rows unified into `UnifiedClass`.
- Collision detection, canvas PNG export, and markdown/text copy function seamlessly.

---

## 3. Data Flow & Worker Pipeline

```
[User uploads File 1 (Teori: PDF/XLSX)]
       │
       ▼
theory.worker.ts ──► dataTeoriMentah[] (Teori + optional embedded Lab rows)
       │
[User uploads File 2 (Praktikum: XLSX, Opsional)]
       │
       ▼
praktikum.worker.ts ──► autoPraktikumRaw[] (Praktikum candidates from separate file)
       │
       ▼
AutoClassPicker: matchCourseData(parsedCourseCodes, dataTeoriMentah, autoPraktikumRaw)
       │
       ├─► Match Theory by KodeMK
       └─► Match Lab by:
             1. KodeMK (if available in lab row)
             2. OR normalizeCourseName(MataKuliah) == normalizeCourseName(lab.courseName)
                AND lab.kelas == selectedClassLetter
       │
       ▼
User confirms selection ──► jadwalTeoriTerpilih + selectedPraktikum ──► ResultStep
```

### 3.1 Course Name Normalization (`src/utils/courseCode.ts`)
To match legacy practical entries (which lack `KodeMK`) with theory entries:
```ts
export function normalizeCourseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(praktikum|prak\.|lab|laboratorium)\b/gi, '')
    .replace(/\b(i|ii|iii|iv|v|vi|vii|viii)\b/gi, (m) => romanToDigit(m))
    .replace(/[^a-z0-9]/g, '')
    .trim();
}
```

---

## 4. State Management (`src/store/useJadwalStore.ts`)

New & updated store state:
- `autoPraktikumRaw: PraktikumCandidate[]`: raw practical candidate rows parsed from the secondary file in Auto Mode.
- `courseLabGroupSelections: Record<string, string>`: maps `KodeMK` $\rightarrow$ chosen lab sub-group ID or keterangan (e.g. `"A1"` or row ID).
- Persistence migration: add new fields to `partialize`, maintain backward compatibility with version 3 state.

---

## 5. Backward Compatibility Matrix

| File Combination | Source | Expected Behavior |
|---|---|---|
| 1 file: Excel Portal Gabungan | Dropzone 1 | Teori & Lab parsed together, auto-detected, 100% identical to existing behavior |
| 2 files: Excel Teori + Excel Portal Praktikum | Dropzone 1 + 2 | Teori from file 1, Lab from file 2 matched via KodeMK/name |
| 2 files: PDF Teori (lama) + Excel Praktikum (baru/lama) | Dropzone 1 + 2 | PDF parsed via PDF worker, Lab parsed via XLSX worker, matched via name + class letter |
| 1 file: PDF Teori (tanpa praktikum) | Dropzone 1 | Teori parsed, user continues with theory only |

---

## 6. Verification & Quality Gates

- `npm run lint`: Zero ESLint errors or warnings.
- `npm run build`: Type-checks (`tsc -b`) and Vite production build pass without errors.
- Manual test cases:
  1. Upload single combined XLSX file $\rightarrow$ verifies existing auto flow works intact.
  2. Upload separate theory XLSX + practical XLSX $\rightarrow$ verifies dual file loading and matching.
  3. Upload PDF theory file in auto mode $\rightarrow$ verifies legacy PDF support in auto mode.
  4. Verify sub-group selection when a class has multiple lab groups.
