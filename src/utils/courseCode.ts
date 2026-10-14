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
 * Whole-word lab markers used by the campus portal: 'Praktikum', 'Prak',
 * 'Lab', 'Laboratorium'. Both boundaries are required so the marker cannot
 * match the prefix of an unrelated theory word: 'Praktisi' (a practitioner
 * lecturer) and 'Praktek Peradilan' (a law theory course) must NOT match,
 * while 'Praktikum', 'Prak.' and 'Lab Komputer' must.
 */
const LAB_LABEL = /\b(?:praktikum|prak|laboratorium|labkom|lab)\b/i;

/** Explicit combined-portal row type for a real lab session: 'PRAKTIKUM LAB'. */
const PRACTICAL_ROW_TYPE = /\bpraktikum\s+lab\b/i;

/** Whole-cohort marker written into a Kelas cell, e.g. 'Kelas A - Semua Mhs'. */
const WHOLE_CLASS_LABEL = /(?:^|\s)(?:semua|all)(?:\s|$)/i;

/** Combined portal exports label pure theory rows 'TEORI' or 'Jadwal Teori (2T)...'. */
const THEORY_LABEL = /\bteori\b/i;

/** True when a Jenis cell, room name or course title carries a whole-word lab marker. */
export function isLabLabel(text: string): boolean {
  return LAB_LABEL.test(String(text || ''));
}

/**
 * True when a Kelas-cell group means the whole cohort rather than a lab sub-group.
 * 'Kelas A - Semua Mhs' says every student of section A, not a group of section A.
 */
export function isWholeClassGroup(group: string): boolean {
  return WHOLE_CLASS_LABEL.test(String(group || '').trim());
}

export interface KelasCell {
  /** Base section letter, e.g. 'A'. */
  kelas: string;
  /** Real sub-group label as written ('Kelompok A1', 'A1'); '' for whole-class cells. */
  group: string;
  /** True when the cell carries a whole-cohort marker. */
  wholeClass: boolean;
}

/**
 * Split a portal Kelas cell into its section letter and optional sub-group.
 * Handles 'Kelas A', 'A', 'Kelas A - Kelompok A1' and 'Kelas A - Semua Mhs'.
 */
export function parseKelasCell(rawKelas: string): KelasCell {
  const raw = String(rawKelas ?? '').trim();
  if (!raw) return { kelas: '', group: '', wholeClass: false };

  const match = raw.match(/^(?:kelas\s+)?([A-Z0-9*]+)(?:\s*-\s*(.+))?$/i);
  if (!match) {
    if (isWholeClassGroup(raw)) return { kelas: raw, group: '', wholeClass: true };
    const first = raw.split(/\s+/)[0] || '';
    const kelas = /^[A-Z0-9*]{1,4}$/i.test(first) ? first.toUpperCase() : raw;
    return { kelas, group: '', wholeClass: false };
  }

  const kelas = match[1].toUpperCase();
  const groupRaw = (match[2] || '').trim();
  const wholeClass = isWholeClassGroup(groupRaw);
  return { kelas, group: wholeClass ? '' : groupRaw, wholeClass };
}

export interface TheoryKeteranganParts {
  /** Raw 'Jenis' cell, e.g. 'TEORI' or 'PRAKTIKUM'. */
  jenis?: string;
  /** Raw 'Keterangan' cell, e.g. 'Jadwal Teori (2T) dari Akademik'. */
  keterangan?: string;
  /** Real sub-group label from the Kelas cell (whole-class markers already stripped). */
  group?: string;
}

/**
 * Compose the stored Keterangan from the portal's separate Jenis and Keterangan
 * cells plus a real lab group. A whole-cohort marker is never stored: it says
 * nothing about the section and used to poison lab detection for the whole file.
 */
export function buildTheoryKeterangan({
  jenis = '',
  keterangan = '',
  group = '',
}: TheoryKeteranganParts): string {
  const parts: string[] = [];
  const jenisVal = String(jenis || '').trim();
  const ketVal = String(keterangan || '').trim();
  if (jenisVal) parts.push(jenisVal);
  // Keep the academic source note only when it adds something beyond the jenis cell.
  if (ketVal && ketVal.toLowerCase() !== jenisVal.toLowerCase()) parts.push(ketVal);

  const groupVal = String(group || '').trim();
  if (groupVal && !isWholeClassGroup(groupVal)) {
    parts.push(/kelompok/i.test(groupVal) ? groupVal : `Kelompok ${groupVal}`);
  }
  return parts.length > 0 ? parts.join(' - ') : '-';
}

/**
 * True when a Keterangan names a real practical sub-group ('Kelompok A1', 'A1').
 * 'Kelompok Semua Mhs' is a whole-cohort marker and is explicitly not a group.
 */
export function hasGroupLabel(keterangan: string): boolean {
  const text = String(keterangan || '')
    .replace(/kelompok\s+semua\s+mhs/gi, ' ')
    .replace(/\bsemua\s+mhs\b/gi, ' ');
  if (/^[a-z]{1,2}\d{1,2}$/i.test(text.trim())) return true;
  const match = text.match(/kelompok\s+([a-z0-9][a-z0-9.-]*)/i);
  return !!match && !/^(?:semua|all)$/i.test(match[1]);
}

/**
 * Detect whether a raw theory row is actually an embedded praktikum/lab row.
 * Combined portal exports interleave theory and lab rows in one file.
 *
 * Precedence is explicit-label-first, longest-handle-first:
 *  1. An explicit 'PRAKTIKUM LAB' row type, or a lab room, is decisive even when
 *     a stale whole-cohort marker ('Kelompok Semua Mhs') sits in the Keterangan.
 *  2. An explicit 'TEORI' / 'Jadwal Teori' label outranks every generic marker,
 *     so a practitioner lecturer ('Praktisi'), a law theory course
 *     ('Praktek Peradilan') or a leftover group marker cannot flip it to lab.
 *  3. With no explicit type, a real 'Kelompok A1' sub-group or a lab-marked
 *     course title decides the row.
 */
export function isLabRow(
  row: Pick<DataTeoriMentah, 'Keterangan' | 'Ruang' | 'MataKuliah'>
): boolean {
  const keterangan = String(row.Keterangan || '').trim();
  if (PRACTICAL_ROW_TYPE.test(keterangan)) return true;
  if (isLabLabel(row.Ruang || '')) return true;
  if (THEORY_LABEL.test(keterangan)) return false;
  if (hasGroupLabel(keterangan)) return true;
  return isLabLabel(row.MataKuliah || '');
}

/**
 * Row-shape predicate for the result page. A result row carries the same
 * signals as a raw theory row plus an explicit `isPraktikum` flag.
 *
 * It delegates straight to isLabRow so the result page and the picker can
 * never disagree on what a praktikum is: an explicit 'PRAKTIKUM LAB' row type
 * or a real lab room wins, otherwise a 'TEORI' label outranks every generic
 * marker (so 'Praktisi' and 'Praktek Peradilan' stay theory).
 */
export function isPraktikumClass(item: {
  keterangan?: string;
  nama?: string;
  ruang?: string;
  kelas?: string;
  isPraktikum?: boolean;
}): boolean {
  if (item.isPraktikum) return true;
  return isLabRow({
    Keterangan: String(item.keterangan || '').trim(),
    Ruang: String(item.ruang || '').trim(),
    MataKuliah: String(item.nama || '').trim(),
  });
}

/**
 * Sub-group label ('A1', 'B2') carried by a candidate's keterangan, or ''.
 * The whole-cohort marker never renders as a group.
 */
export function practicalGroupLabel(keterangan: string): string {
  const text = String(keterangan || '').trim();
  if (!text) return '';
  const named = text.match(/kelompok\s+([a-z0-9][a-z0-9.-]*)/i);
  if (named && !/^(?:semua|all)$/i.test(named[1])) return named[1].toUpperCase();
  const bare = text.match(/(?:^|[\s\-•(])([a-z]{1,2}\d{1,2})(?=\s|$|[)\-•])/i);
  return bare ? bare[1].toUpperCase() : '';
}

/**
 * Human-meaningful note left in a Keterangan once the portal noise
 * ('Jadwal Teori (2T) dari Akademik', 'Kelompok A1', a bare row type) is stripped.
 * Bracketed annotations such as '[Team Teaching]' survive.
 */
export function keteranganNote(keterangan: string): string {
  const text = String(keterangan || '').trim();
  if (!text) return '';
  const brackets = Array.from(text.matchAll(/\[([^\]]+)\]/g))
    .map((m) => m[1].trim())
    .filter(Boolean);
  const head = text.replace(/\[[^\]]*\]/g, ' ');
  const notes = head
      .split(/\s+-\s+|\s*[•|]\s*/)
      .map((part) => part.replace(/^[\s\-–—•|]+|[\s\-–—•|]+$/g, '').trim())
      .filter((part) => {
        if (!part) return false;
        if (/^[-–—.]+$/.test(part)) return false;
        if (/^(?:teori|praktikum|prak|lab|laboratorium)$/i.test(part)) return false;
        if (/^jadwal\s+(?:teori|praktikum)/i.test(part)) return false;
        if (/^kelompok\s/i.test(part)) return false;
        if (/^(?:semua|all)\s+mhs$/i.test(part)) return false;
        if (/^\d+\s*[a-z]+$/i.test(part)) return false;
        return true;
      });
  return [...notes, ...brackets].join(' ').trim();
}

/**
 * Resolve the portal's 'Jenis' (row type: TEORI / PRAKTIKUM) and 'Keterangan'
 * (source note: 'Jadwal Teori (2T) dari Akademik') columns.
 * The two must be matched independently with their own patterns. Matching
 * 'keterangan' first (as the old fall-through did) made the source note the row
 * type, which hid every class section behind one identical label.
 */
export function resolveJenisKeteranganColumns(rawHeaders: string[]): {
  jenis: number;
  keterangan: number;
} {
  const headers = rawHeaders.map((h) =>
    String(h ?? '').replace(/^\.\s*/, '').trim().toLowerCase()
  );
  const find = (...patterns: RegExp[]): number => {
    for (const p of patterns) {
      const idx = headers.findIndex((h) => p.test(h));
      if (idx !== -1) return idx;
    }
    return -1;
  };
  return {
    jenis: find(/^jenis$/i, /^tipe$/i, /jenis\s*(?:kuliah|mk)/i),
    keterangan: find(/^keterangan$/i, /^ket\.?$/i, /keterangan/i),
  };
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

export function normalizeKelasLabel(kelas: string): string {
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

/** Theory (non-lab) rows belonging to a course code; falls back to all rows. */
export function collectTheoryRows(
  code: string,
  data: DataTeoriMentah[]
): DataTeoriMentah[] {
  const matches = data.filter((row) => normalizeCode(row.KodeMK) === code);
  const theoryRows = matches.filter((row) => !isLabRow(row));
  return theoryRows.length > 0 ? theoryRows : matches;
}

/** Distinct class letters offered by a course, sorted ascending. */
export function uniqueKelasOf(rows: DataTeoriMentah[]): string[] {
  return [...new Set(rows.map((r) => r.Kelas).filter(Boolean))].sort();
}

/** Natural section order: 'A' before 'B' before 'C', 'A2' before 'A10'. */
export function compareKelas(a: string, b: string): number {
  const left = String(a || '').trim().toUpperCase();
  const right = String(b || '').trim().toUpperCase();
  if (left === right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.localeCompare(right, 'id', { numeric: true, sensitivity: 'base' });
}

/** Sort rows by class section (and then by day/time) so one section reads together. */
export function sortRowsByKelas<T extends { Kelas?: string; Hari?: string; Jam?: string }>(
  rows: T[]
): T[] {
  return [...rows].sort(
    (a, b) =>
      compareKelas(a.Kelas || '', b.Kelas || '') ||
      String(a.Hari || '').localeCompare(String(b.Hari || ''), 'id') ||
      String(a.Jam || '').localeCompare(String(b.Jam || ''), 'id')
  );
}

/** Sort practical candidates by section then sub-group then day/time. */
export function sortCandidatesByKelas<T extends { kelas?: string; keterangan?: string }>(
  candidates: T[]
): T[] {
  return [...candidates].sort(
    (a, b) =>
      compareKelas(a.kelas || '', b.kelas || '') ||
      practicalGroupLabel(a.keterangan || '').localeCompare(
        practicalGroupLabel(b.keterangan || ''),
        'id',
        { numeric: true }
      )
  );
}

export interface KelasGroup<T> {
  /** Class section label ('A', 'B', 'C'); 'Tanpa Kelas' when the cell was blank. */
  kelas: string;
  rows: T[];
}

/**
 * Bucket rows by their class section so each section renders as one labelled
 * block. Sections come out in natural order ('A', 'B', 'C', 'A2' before 'A10'),
 * with an unlabelled bucket last. Rows keep their incoming order within a bucket,
 * so callers can pre-sort by day/time and still read one section top to bottom.
 */
export function groupRowsByKelas<T>(
  rows: T[],
  getKelas: (row: T) => string = (row) => (row as { Kelas?: string }).Kelas || ''
): KelasGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = String(getKelas(row) || '').trim() || 'Tanpa Kelas';
    const bucket = map.get(key);
    if (bucket) bucket.push(row);
    else map.set(key, [row]);
  }
  return [...map.entries()]
    .map(([kelas, groupRows]) => ({ kelas, rows: groupRows }))
    .sort((a, b) => compareKelas(a.kelas, b.kelas));
}

/**
 * Every practical candidate linked to a course code.
 * Combines embedded lab rows (from the theory file) with an optional separate
 * praktikum pool, deduped so both sources can coexist.
 */
export function collectLabCandidates(
  code: string,
  data: DataTeoriMentah[],
  pool: PraktikumCandidate[] = []
): PraktikumCandidate[] {
  const matches = data.filter((row) => normalizeCode(row.KodeMK) === code);
  const theoryRows = matches.filter((row) => !isLabRow(row));
  const sourceRows = theoryRows.length > 0 ? theoryRows : matches;

  // Embedded lab rows belong to this course by construction; always offer them.
  const embedded = matches.filter((row) => isLabRow(row)).map(theoryRowToPraktikumCandidate);
  // Pool candidates must prove they belong (kode MK or normalized name + class letter).
  const linked = sourceRows.flatMap((row) => matchPraktikumForCourse(row, pool));

  return dedupeById([...embedded, ...linked]);
}

/**
 * Select theory rows and practical candidates whose class letter matches the
 * requested section (e.g. 'A' also pulls sub-groups 'A1', 'A2').
 */
export function selectByKelas(
  kelas: string,
  theoryRows: DataTeoriMentah[],
  labCandidates: PraktikumCandidate[]
): { theoryIds: string[]; labIds: string[] } {
  const target = (kelas || '').trim().toUpperCase();
  if (!target) return { theoryIds: [], labIds: [] };
  const theoryIds = theoryRows
    .filter((r) => (r.Kelas || '').trim().toUpperCase() === target)
    .map((r) => r.id);
  const labIds = filterPraktikumByKelas(labCandidates, target).map((c) => c.id);
  return { theoryIds, labIds };
}

/**
 * Auto-select every section for courses that offer exactly one class letter.
 * Used by the course-code input step so single-section courses are pre-committed.
 */
export function buildSingleSectionSelections(
  codes: string[],
  data: DataTeoriMentah[],
  pool: PraktikumCandidate[] = []
): {
  theorySelections: Record<string, string[]>;
  labSelections: Record<string, string[]>;
} {
  const theorySelections: Record<string, string[]> = {};
  const labSelections: Record<string, string[]> = {};
  for (const code of codes) {
    const theoryRows = collectTheoryRows(code, data);
    if (theoryRows.length === 0) continue;
    if (uniqueKelasOf(theoryRows).length !== 1) continue;
    theorySelections[code] = theoryRows.map((r) => r.id);
    const labIds = collectLabCandidates(code, data, pool).map((c) => c.id);
    if (labIds.length > 0) labSelections[code] = labIds;
  }
  return { theorySelections, labSelections };
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
