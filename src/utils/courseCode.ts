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

    // 2. Course identity check (KodeMK if available, or course name similarity)
    const candCode =
      cand.kodeMk ||
      (cand as unknown as { KodeMK?: string }).KodeMK;

    if (candCode && normTheoryCode) {
      if (normalizeCode(candCode) === normTheoryCode) {
        return true;
      }
    }

    const normCandName = normalizeCourseName(cand.courseName || '');
    if (normTheoryName && normCandName && normTheoryName === normCandName) {
      return true;
    }

    return false;
  });
}
