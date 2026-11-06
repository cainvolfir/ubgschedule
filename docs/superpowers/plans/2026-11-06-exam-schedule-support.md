# Exam Schedule (UTS/UAS) PDF Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable UBG Schedule to parse and display UTS and UAS exam schedule PDFs from Labkom UBG without regressing existing lecture timetable workflows.

**Architecture:** Implement a modular parser function `parseExamPdfTokens` in `src/utils/examPdf.ts` that detects exam schedule layouts, extracts metadata, times, rooms, courses, classes, lecturers, and dates into `DataTeoriMentah[]`. Wire this into `src/workers/theory.worker.ts` behind an automated format discriminator, keeping regular lecture parsing intact.

**Tech Stack:** TypeScript, React 19, Zustand, pdfjs-dist, Node.js test runner.

**Spec:** `docs/superpowers/specs/2026-11-06-exam-schedule-support-design.md`

## Global Constraints
- No external libraries added to `package.json`.
- Zero em dash or en dash characters in newly written code, comments, or documentation.
- Maintain full backwards compatibility for existing `.xlsx` and regular `.pdf` lecture files.
- Preserve 100% test pass rate across existing unit and component tests.

## Review Focus
1. Multi-week dates on identical day names (e.g. Senin 9 Nov vs Senin 16 Nov) must not trigger false collision flags.
2. Multiple lecturers on one course (e.g. quoted comma-separated names) must be normalized without dangling quotation marks.
3. Classes with asterisks or non-standard suffixes (e.g. `Kelas A*`) must keep their section identifier.
4. Non-exam PDFs must continue to route to the legacy parser without disruption.
5. Project or practical exam formats (e.g. `PROJECT`, `Project`) must be categorized cleanly in `Keterangan`.

---

### Task 1: Implement `parseExamPdfTokens` and `isExamPdfSchedule` in `src/utils/examPdf.ts` with Unit Tests

**Files:**
- Create: `src/utils/examPdf.ts`
- Test: `test/examPdf.test.mjs`

**Interfaces:**
- Produces:
  ```ts
  export function isExamPdfSchedule(tokens: string[]): boolean;
  export function parseExamPdfTokens(tokens: string[]): DataTeoriMentah[];
  ```

- [ ] **Step 1: Write the failing test**
  Create `test/examPdf.test.mjs` asserting that:
  - `isExamPdfSchedule` returns `true` for exam tokens and `false` for regular lecture tokens.
  - `parseExamPdfTokens` extracts all 177 rows from the real fixture `C:\Users\Cain\AppData\Local\hermes\attachments\Program_Studi_S1_Ilmu_Komputer_Teknik_pdf.pdf`.
  - Date and day formatting (e.g. `Senin, 9 Nov 2026`) is correctly attached.
  - Multi-lecturer rows strip excess quotes.
  - Rooms, course names, and class letters (including `A*`) match expected values.

- [ ] **Step 2: Run test to verify it fails**
  Run: `node --test test/examPdf.test.mjs`
  Expected: FAIL (module `src/utils/examPdf.ts` not found).

- [ ] **Step 3: Implement `src/utils/examPdf.ts`**
  Write pure functions:
  - `isExamPdfSchedule(tokens: string[]): boolean`: checks first 100 tokens for `/jadwal\s+ujian/i` or `/Prodi\s*\/\s*Semester\s*\/\s*Kelas/i`.
  - `parseExamPdfTokens(tokens: string[]): DataTeoriMentah[]`: iterates through tokens, scans backwards for time/day/room, scans forward for SKS/SMT/Kelas/Dosen/Metode, and mints `DataTeoriMentah` objects.

- [ ] **Step 4: Run test to verify it passes**
  Run: `node --test test/examPdf.test.mjs`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add src/utils/examPdf.ts test/examPdf.test.mjs
  git commit -m "feat(parser): add exam pdf parser helper and unit test"
  ```

---

### Task 2: Integrate Exam Parser into `src/workers/theory.worker.ts`

**Files:**
- Modify: `src/workers/theory.worker.ts`

**Interfaces:**
- Consumes:
  ```ts
  import { isExamPdfSchedule, parseExamPdfTokens } from '../utils/examPdf';
  ```

- [ ] **Step 1: Write an end-to-end test or check for worker routing**
  Add test cases in `test/examPdf.test.mjs` testing discrimination between regular PDF token stream and exam PDF token stream.

- [ ] **Step 2: Integrate into `src/workers/theory.worker.ts`**
  In `theory.worker.ts`, after `pdf.getPage` token accumulation:
  Check `isExamPdfSchedule(tokens)`.
  If true:
  Execute `const result = parseExamPdfTokens(tokens);`
  Post message with `type: 'RESULT'` and `data: result`.
  Return early.
  If false:
  Proceed with existing regular lecture PDF parsing loop.

- [ ] **Step 3: Run full test suite and build**
  Run: `npm test && npm run test:component && npm run test:kelas && npm run test:resultstep && npm run build`
  Expected: All checks pass and Vite build completes without type errors.

- [ ] **Step 4: Commit**
  ```bash
  git add src/workers/theory.worker.ts
  git commit -m "feat(worker): integrate exam pdf parsing into theory worker"
  ```

---

### Task 3: Verification & Visual Readiness

**Files:**
- Clean up: Remove temporary probe `test/probe_exam_pdf.mjs`.

- [ ] **Step 1: Clean up scratch probe files**
  Delete `test/probe_exam_pdf.mjs`.

- [ ] **Step 2: Run all checks**
  Run: `npm test && npm run lint && npm run build`
  Expected: 0 errors, all tests pass.

- [ ] **Step 3: Commit**
  ```bash
  git add -A
  git commit -m "test: clean up temporary fixtures and finalize exam schedule support"
  ```
