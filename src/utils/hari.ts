/**
 * Day grouping, kept pure so the node suite can drive it without a DOM.
 *
 * A row's day arrives from three sources that disagree on shape: the XLSX
 * parser titles the name ('Senin'), the Labkom bridge carries whatever the
 * portal printed, and the edit modal lets the student type anything at all.
 *
 * The result step used to render `HARI_ORDER.map(...)` and nothing else, so a
 * row whose day was empty or unrecognised was NEVER drawn: the schedule simply
 * stopped, with no error and no hint, because the row was not one of the seven
 * keys the map looked up. Two rules replace that:
 *
 *   1. Every row lands in a group. An empty or unreadable day is grouped under
 *      FALLBACK_HARI rather than dropped, and an unknown non-empty day keeps
 *      its own label instead of being folded into a neighbour.
 *   2. dayGroups() is the one order every renderer walks: the seven canonical
 *      days first, then every other group in first-seen order.
 */

/** The row shape day grouping needs: a day, and a time to sort by. */
export interface UnifiedRow {
  hari: string;
  jam: string;
}

export const HARI_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'] as const;

export type HariName = (typeof HARI_ORDER)[number];

/** Group label for rows whose day could not be read at all. */
export const FALLBACK_HARI = 'Lainnya';

const HARI_UPPER: string[] = HARI_ORDER.map((d) => d.toUpperCase());

/**
 * A day name welded to whatever the source glued to it: textContent drops the
 * whitespace between sibling elements, so a heading reads 'SENIN159 Sesi ...'
 * and a bare cell reads 'Senin08.00-09.40'.
 */
const WELDED_HARI_RE = /^(?:\d+\.\s*)?(SENIN|SELASA|RABU|KAMIS|JUMAT|SABTU|MINGGU)(?=$|\d|\s)/i;

/**
 * Canonical Title Case Indonesian day for a raw day value, or '' when there is
 * none. A value that names no Indonesian day is returned trimmed and otherwise
 * untouched: guessing a day would move a row onto the wrong date.
 */
export function normalizeHari(hari: string): string {
  const raw = String(hari ?? '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  const exact = HARI_UPPER.indexOf(raw.toUpperCase());
  if (exact !== -1) return HARI_ORDER[exact];
  const welded = raw.match(WELDED_HARI_RE);
  if (welded) {
    const at = HARI_UPPER.indexOf(welded[1].toUpperCase());
    if (at !== -1) return HARI_ORDER[at];
  }
  return raw;
}

/** Sidebar heading shown for rows whose day could not be read. */
export const FALLBACK_HARI_LABEL = 'Jadwal Lainnya';

/** The visible label for a day group: the fallback group reads as prose. */
export function dayLabel(hari: string): string {
  return hari === FALLBACK_HARI ? FALLBACK_HARI_LABEL : hari;
}

/** Group rows by canonical day, sending an unreadable day to FALLBACK_HARI. */
export function groupByDay<T extends { hari: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = normalizeHari(row.hari) || FALLBACK_HARI;
    const bucket = map.get(key);
    if (bucket) bucket.push(row);
    else map.set(key, [row]);
  }
  return map;
}

/**
 * Every day group in the order the result page should show them: the seven
 * canonical days in week order, then every remaining group (the fallback and
 * any day outside the list) in first-seen order.
 *
 * Built from the rows themselves, so no row can be left out of the render.
 */
export function dayGroups<T extends { hari: string }>(rows: T[]): { hari: string; items: T[] }[] {
  const map = groupByDay(rows);
  const out: { hari: string; items: T[] }[] = [];
  for (const day of HARI_ORDER) {
    const items = map.get(day);
    if (items && items.length > 0) out.push({ hari: day, items });
  }
  for (const [hari, items] of map) {
    if ((HARI_ORDER as readonly string[]).includes(hari)) continue;
    if (items.length > 0) out.push({ hari, items });
  }
  return out;
}
