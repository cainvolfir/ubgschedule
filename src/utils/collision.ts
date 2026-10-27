/**
 * Schedule collision detection, kept pure so the node suite can drive it
 * without a DOM.
 *
 * Two rows "collide" when they fall on the same day and their time ranges
 * overlap. That is the definition the result page shows as 'Bentrok!'.
 *
 * The one thing this module refuses to flag is a row colliding with ITSELF.
 * The same session can reach the result step twice (a re-imported bridge
 * payload, a doubled export, a practical and a theory row for one meeting), and
 * two boxes drawn from one session overlap perfectly by construction. Counting
 * those as conflicts inflates the total and points the student at a clash that
 * does not exist, so a pair that is the same session is never a collision.
 */

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

/**
 * Are two rows the same session? Same course code, class, day and time. The
 * room is deliberately excluded: a room change on the same slot is still the
 * one session, not a conflict with itself.
 */
export function sameSession(a: SessionIdentity, b: SessionIdentity): boolean {
  return a.kode === b.kode && a.kelas === b.kelas && a.hari === b.hari && a.jam === b.jam;
}

/**
 * Ids of every row that overlaps another row on the same day.
 * A pair that is the same session (by `sameSession`) is skipped: one session is
 * not in conflict with a duplicate of itself.
 */
export function findCollisions(classes: (SessionIdentity & { id: string })[]): Set<string> {
  const collided = new Set<string>();
  const byDay: Record<string, (SessionIdentity & { id: string })[]> = {};
  for (const c of classes) {
    (byDay[c.hari] ||= []).push(c);
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
