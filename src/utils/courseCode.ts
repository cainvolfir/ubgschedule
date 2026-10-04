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
