import type { DataTeoriMentah, PraktikumCandidate } from '../store/useJadwalStore';

/**
 * Normalize a single KodeMK string: trim, uppercase, remove all internal whitespace.
 * Handles the casing divergence between PDF (uppercase) and XLSX (case-preserving) paths.
 */
export function normalizeCode(kode: string): string {
  return kode.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Convert Roman numerals (I - X) to Arabic digit strings.
 */
export function romanToDigit(roman: string): string {
  const map: Record<string, string> = {
    i: '1',
    ii: '2',
    iii: '3',
    iv: '4',
    v: '5',
    vi: '6',
    vii: '7',
    viii: '8',
    ix: '9',
    x: '10',
  };
  return map[roman.toLowerCase()] ?? roman;
}

/**
 * Normalize course names by lowercasing, stripping practical/lab keywords,
 * converting Roman numerals to digits, and removing all non-alphanumeric characters.
 */
export function normalizeCourseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(praktikum|prak\b\.?|lab|laboratorium)\b/gi, '')
    .replace(/\b(x|ix|viii|vii|vi|v|iv|iii|ii|i)\b/gi, (m) => romanToDigit(m))
    .replace(/[^a-z0-9]/g, '')
    .trim();
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

/**
 * Detect whether a raw theory row is actually an embedded praktikum/lab row.
 * Combined portal exports interleave theory and lab rows in one file; lab rows are
 * identifiable via the Jenis/Keterangan label, a lab room, or a course title keyword.
 */
export function isLabRow(
  row: Pick<DataTeoriMentah, 'Keterangan' | 'Ruang' | 'MataKuliah'>
): boolean {
  return (
    /prak|lab|kelompok/i.test(row.Keterangan || '') ||
    /\blab\b|laboratorium/i.test(row.Ruang || '') ||
    /prak|lab/i.test(row.MataKuliah || '')
  );
}

/**
 * Convert an embedded lab row (stored in DataTeoriMentah) into a PraktikumCandidate
 * so it can flow through the same praktikum selection/result pipeline as a
 * separately-uploaded praktikum file.
 */
export function theoryRowToPraktikumCandidate(row: DataTeoriMentah): PraktikumCandidate {
  return {
    id: row.id,
    courseName: row.MataKuliah,
    kelas: row.Kelas,
    keterangan: row.Keterangan || '',
    dosen: row.DosenPengampuh,
    semester: row.SMT,
    hari: row.Hari,
    jam: row.Jam,
    ruang: row.Ruang,
    kodeMk: row.KodeMK,
  };
}

function normalizeKelasLabel(kelas: string): string {
  return (kelas || '').replace(/^(kelas|kelompok)\s*/i, '').trim().toUpperCase();
}

/**
 * Filter practical candidates down to a single theory class selection.
 * Accepts both exact section letters ('A') and sub-group labels ('A1', 'A2'),
 * so a theory class 'A' links to every lab sub-group belonging to that section.
 */
export function filterPraktikumByKelas(
  candidates: PraktikumCandidate[],
  kelas: string
): PraktikumCandidate[] {
  const target = normalizeKelasLabel(kelas);
  if (!target) return [];
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const exact = new RegExp(`^${escaped}$`);
  const subGroup = new RegExp(`^${escaped}[-\\s.]?\\d+$`);
  return candidates.filter((c) => {
    const label = normalizeKelasLabel(c.kelas);
    return exact.test(label) || subGroup.test(label);
  });
}

/** Deduplicate candidates by id, preserving first-seen order. */
export function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

/**
 * Match practical candidates for a given theory row.
 * Matches by KodeMK (if available in candidate) or normalized course name similarity,
 * and verifies class letter compatibility (e.g. Kelas 'A' links to 'A', 'A1', 'A2').
 */
export function matchPraktikumForCourse(
  theoryRow: Pick<DataTeoriMentah, 'MataKuliah' | 'Kelas'> & Partial<DataTeoriMentah>,
  practicalCandidates: PraktikumCandidate[]
): PraktikumCandidate[] {
  const normTheoryName = normalizeCourseName(theoryRow.MataKuliah || '');
  const normTheoryCode = theoryRow.KodeMK ? normalizeCode(theoryRow.KodeMK) : '';
  const theoryClass = (theoryRow.Kelas || '').replace(/^KELAS\s+/i, '').trim().toUpperCase();

  const escapedTheoryClass = theoryClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const subGroupPattern = theoryClass.length > 0 ? new RegExp(`^${escapedTheoryClass}[-\\s.]?\\d+$`) : null;

  return practicalCandidates.filter((cand) => {
    // 1. Class section check
    const candClass = (cand.kelas || '').replace(/^KELAS\s+/i, '').trim().toUpperCase();
    const classMatches =
      candClass === theoryClass ||
      (subGroupPattern !== null && subGroupPattern.test(candClass));

    if (!classMatches) return false;

    // 2. Course identity check:
    // If BOTH theory and practical candidate have KodeMK, they MUST match by code!
    // NEVER fall back to course name if both have codes and the codes differ.
    const rawCandCode =
      cand.kodeMk ||
      (cand as unknown as { KodeMK?: string }).KodeMK;
    const candCode = rawCandCode ? normalizeCode(rawCandCode) : '';

    if (candCode && normTheoryCode) {
      return candCode === normTheoryCode;
    }

    // Only if at least one side lacks a course code, fall back to normalized name similarity:
    if (!candCode || !normTheoryCode) {
      const normCandName = normalizeCourseName(cand.courseName || '');
      if (normTheoryName && normCandName && normTheoryName === normCandName) {
        return true;
      }
    }

    return false;
  });
}
