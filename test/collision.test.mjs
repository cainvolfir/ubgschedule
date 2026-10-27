import test from 'node:test';
import assert from 'node:assert/strict';

/*
 * Collision detection checks.
 *
 * The result page flags a row as 'Bentrok!' when it overlaps another row on the
 * same day. Two faults fed an inflated count: duplicate rows for one session
 * (same code, class, day, time) always overlap each other exactly, so each pair
 * of duplicates added two phantom conflicts. findCollisions() must never count a
 * row as colliding with a duplicate of itself, while still flagging real clashes.
 */
import {
  parseTimeToMinutes,
  timesOverlap,
  sameSession,
  findCollisions,
} from '../src/utils/collision.ts';

const row = (id, overrides = {}) => ({
  id,
  kode: 'IF184201',
  kelas: 'A',
  hari: 'Senin',
  jam: '08.00-09.40',
  ...overrides,
});

test('parseTimeToMinutes reads both . and : separators and the en dash', () => {
  assert.deepEqual(parseTimeToMinutes('08.00-09.40'), { start: 480, end: 580 });
  assert.deepEqual(parseTimeToMinutes('13:00-14:40'), { start: 780, end: 880 });
  assert.deepEqual(parseTimeToMinutes('08.00\u201309.40'), { start: 480, end: 580 });
  assert.equal(parseTimeToMinutes('no time here'), null);
});

test('timesOverlap flags intersecting ranges and spares touching ones', () => {
  assert.equal(timesOverlap('08.00-09.40', '09.00-10.40'), true);
  assert.equal(timesOverlap('08.00-09.40', '09.40-11.20'), false, 'touching edges do not overlap');
  assert.equal(timesOverlap('08.00-09.40', '10.00-11.40'), false);
  assert.equal(timesOverlap('garbage', '08.00-09.40'), false, 'an unparsable range overlaps nothing');
});

test('sameSession compares code, class, day and time but not the room', () => {
  const a = { kode: 'IF184201', kelas: 'A', hari: 'Senin', jam: '08.00-09.40' };
  assert.equal(sameSession(a, { ...a }), true);
  assert.equal(sameSession(a, { ...a, kelas: 'B' }), false);
  assert.equal(sameSession(a, { ...a, hari: 'Selasa' }), false);
  assert.equal(sameSession(a, { ...a, jam: '10.00-11.40' }), false);
  assert.equal(sameSession(a, { ...a, kode: 'TI2019' }), false);
});

test('findCollisions never flags a row against a duplicate of itself', () => {
  // The exact symptom: one session rendered twice produced two phantom clashes.
  const dupes = [
    row('a', { hari: 'Senin', jam: '08.00-09.40' }),
    row('b', { hari: 'Senin', jam: '08.00-09.40' }),
  ];
  assert.deepEqual([...findCollisions(dupes)], [], 'a session is not in conflict with its own copy');
});

test('findCollisions still flags a genuine overlap between two sessions', () => {
  const clash = [
    row('a', { kode: 'IF184201', kelas: 'A', hari: 'Senin', jam: '08.00-09.40' }),
    row('b', { kode: 'TI2019', kelas: 'B', hari: 'Senin', jam: '09.00-10.40' }),
  ];
  assert.deepEqual([...findCollisions(clash)].sort(), ['a', 'b']);
});

test('findCollisions ignores two sessions on different days', () => {
  const split = [
    row('a', { hari: 'Senin', jam: '08.00-09.40' }),
    row('b', { kode: 'TI2019', kelas: 'B', hari: 'Selasa', jam: '08.00-09.40' }),
  ];
  assert.deepEqual([...findCollisions(split)], [], 'the same slot on another day is not a clash');
});

test('a duplicate session does not hide a real clash beside it', () => {
  // Two copies of session A plus a genuinely overlapping session C: only the
  // real pair (A<->C) is flagged; A<->A is skipped, but A is still marked.
  const mixed = [
    row('a', { hari: 'Senin', jam: '08.00-09.40' }),
    row('a2', { hari: 'Senin', jam: '08.00-09.40' }),
    row('c', { kode: 'TI2019', kelas: 'B', hari: 'Senin', jam: '08.30-10.00' }),
  ];
  assert.deepEqual([...findCollisions(mixed)].sort(), ['a', 'a2', 'c']);
});

test('findCollisions reports an empty set for an empty schedule', () => {
  assert.equal(findCollisions([]).size, 0);
});
