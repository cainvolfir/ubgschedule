# Exam Schedule (UTS/UAS) PDF Support: Architectural Design Specification

| Field | Value |
|---|---|
| **Date** | 2026-11-06 |
| **Status** | Approved by User |
| **Scope** | Automatic detection and parsing of UTS/UAS exam schedule PDFs in `theory.worker.ts`, chronological exam date grouping, and verification tests |
| **Non-Goals** | Backend changes, external API integrations, manual editing of PDF files |

---

## 1. Overview

### 1.1 Problem
Labkom UBG publishes Midterm Exam (UTS) and Final Exam (UAS) timetables as PDF documents (`Program_Studi_S1_Ilmu_Komputer_Teknik_pdf.pdf`). The existing PDF parser in `theory.worker.ts` assumes standard weekly lecture timetables with `.Perkuliahan Hari` headers and time ranges placed strictly after course codes. Consequently, attempting to parse an exam PDF produces zero entries because:
1. Session time (`08.15 - 09.45`) and room (`RUANG 1A`) appear before course codes (`IK1IW31006`).
2. Credit counts appear as badge tokens (`3 SKS`) rather than standalone single digits.
3. Semester and class letters are encoded in a single slash-separated line (`S1 Ilmu Komputer / Smt 1 / Kelas A`).
4. Timetables span multi-week periods (e.g. 9 November to 21 November 2026). Storing only the day name (`Senin`) would cause false collision warnings between week 1 and week 2 exams scheduled at the same hour.

### 1.2 Solution
1. **Auto-Detection in `src/workers/theory.worker.ts`**:
   - Inspect early tokens for exam indicators (`/jadwal\\s+ujian/i`, `/Prodi\\s*\\/\\s*Semester\\s*\\/\\s*Kelas/i`).
   - If present, route to `parseExamPdfTokens(tokens)`. Otherwise, fall back to the existing regular timetable parser.
2. **Field Extraction for `DataTeoriMentah`**:
   - `KodeMK`: Matched via `isCourseCode`.
   - `Jam`: Scanned backwards from `KodeMK` (lookback window of 25 tokens).
   - `Ruang`: Tokens between `RUANG` and `KodeMK` (e.g. `1A`, `GS1A`, `3AB(Extend)`).
   - `Hari`: Combines day and date (e.g. `Senin, 9 Nov 2026`) extracted from per-row date tokens or section headers (`DETAIL HARI UJIAN`), preventing false collision conflicts between weeks.
   - `MataKuliah`: Tokens between `KodeMK` and the `SKS` token.
   - `SKS`: Extracted from `/^(\\d+)\\s*SKS$/i`.
   - `SMT` & `Kelas`: Parsed from `Smt <N> / Kelas <Letter>`.
   - `DosenPengampuh`: Parsed after class information up to pengawas/dosen pengampu markers, with quotation marks cleaned.
   - `Keterangan`: Exam type and delivery method (e.g. `UTS (Offline)`, `UTS (Project)`).
3. **Compatibility**:
   - Both `auto-codes` mode and `manual` mode consume `DataTeoriMentah` transparently.
   - Day grouping and rendering in `ResultStep.tsx` and `ScheduleDaySections.tsx` already support arbitrary day labels and chronologically ordered sections.

---

## 2. Technical Architecture

### 2.1 Worker Flow
```
PDF Upload
    │
    ▼
Extract text tokens (pdfjs-dist)
    │
    ▼
Is exam schedule? ──Yes──► parseExamPdfTokens(tokens) ──► DataTeoriMentah[]
    │
    No
    ▼
parseLegacyPdfTokens(tokens) ──► DataTeoriMentah[]
```

### 2.2 Date and Collision Discipline
- Preserving specific dates in `Hari` (e.g. `Senin, 9 Nov 2026` vs `Senin, 16 Nov 2026`) ensures:
  1. No false collisions between week 1 and week 2 exams in `findCollisions()`.
  2. The schedule export clearly displays the exact calendar date of the exam.
