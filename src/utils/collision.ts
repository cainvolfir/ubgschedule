/**
 * Schedule collision detection, kept pure so the node suite can drive it
 * without a DOM.
 *
 * Two rows "collide" when they fall on the same day and their time ranges
 * overlap. That is the definition the result page shows as 'Bentrok!'.
 *
 * Two things this module refuses to flag. A row never collides with ITSELF:
 * the same session can reach the result step twice (a re-imported bridge
 * payload, a doubled export, a practical and a theory row for one meeting), and
 * two boxes drawn from one session overlap perfectly by construction. And a row
 * whose day could not be read never collides with ANYTHING: grouping unreadable
 * rows under one empty key puts every one of them on a phantom shared day, so a
 * whole schedule of rows with no day on them was reported as mutually clashing.
 * An unknown day is not a day everyone shares; it is a field we could not read,
 * and the honest answer there is no verdict at all.
 */

/*
 * The '.ts' extension is load-bearing: the node suite imports this module
 * directly, and node's own resolver does not guess extensions.
 */
import { normalizeHari } from './hari.ts';

/** The fields that make two rows the SAME session. */
export interface SessionIdentity {
  kode: string;
  kelas: string;
  hari: string;
  jam: string;
}

/** Parse an 'HH.MM-HH.MM' / 'HH:MM-HH:MM' range into minutes since midnight. */
export function parseTimeToMinutes(jam: string): { start: number; end: number } | null {
  const m = jam.match(/(\d{2})[.:](\d{2})\s*[-\u2013]\s*(\d{2})[.:](\d{2})/);
  if (!m) return null;
  return {
    start: parseInt(m[1]) * 60 + parseInt(m[2]),
    end: parseInt(m[3]) * 60 + parseInt(m[4]),
  };
}

/** Do two time ranges overlap? An unparsable range overlaps nothing. */
export function timesOverlap(a: string, b: string): boolean {
  const ta = parseTimeToMinutes(a);
  const tb = parseTimeToMinutes(b);
  if (!ta || !tb) return false;
  return ta.start < tb.end && tb.start < ta.end;
}

/** Ascending by start time; an unparsable range sorts last. */
export function byStartTime(a: { jam: string }, b: { jam: string }): number {
  return (parseTimeToMinutes(a.jam)?.start ?? 0) - (parseTimeToMinutes(b.jam)?.start ?? 0);
}

/**
 * Are two rows the same session? Same course code, class, day and time. The
 * room is deliberately excluded: a room change on the same slot is still the
 * one session, not a conflict with itself.
 *
 * Both days are compared through normalizeHari(), so 'SENIN' and 'Senin' are one
 * day rather than two, and a day that normalises to '' is the same unread field
 * on both sides.
 */
export function sameSession(a: SessionIdentity, b: SessionIdentity): boolean {
  return (
    a.kode === b.kode &&
    a.kelas === b.kelas &&
    normalizeHari(a.hari) === normalizeHari(b.hari) &&
    a.jam === b.jam
  );
}

/**
 * Ids of every row that overlaps another row on the same day.
 *
 * A pair that is the same session (by `sameSession`) is skipped: one session is
 * not in conflict with itself. A row whose day cannot be read is skipped too:
 * with no day there is no shared day to clash on, and bucketing every such row
 * under one key invented a day the whole schedule had in common.
 */
export function findCollisions(classes: (SessionIdentity & { id: string })[]): Set<string> {
  const collided = new Set<string>();
  const byDay: Record<string, (SessionIdentity & { id: string })[]> = {};
  for (const c of classes) {
    // An unreadable day is not a day. It gets no bucket, so it is never
    // compared against anything and never flagged.
    const day = normalizeHari(c.hari);
    if (!day) continue;
    (byDay[day] ||= []).push(c);
  }
  for (const dayClasses of Object.values(byDay)) {
    for (let i = 0; i < dayClasses.length; i++) {
      for (let j = i + 1; j < dayClasses.length; j++) {
        const a = dayClasses[i];
        const b = dayClasses[j];
        if (sameSession(a, b)) continue;
        if (timesOverlap(a.jam, b.jam)) {
          collided.add(a.id);
          collided.add(b.id);
        }
      }
    }
  }
  return collided;
}
