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

/* ------------------------------------------------- empty and unreadable days */

/*
 * The phantom-clash bug: every row whose day could not be read was bucketed
 * under one empty key, which put the whole schedule on a day it shared, so all
 * 17 rows were flagged as clashing with each other. An unreadable day is a
 * field we could not read, not a day everyone has in common: no verdict is the
 * only honest answer, and it is what the page must show.
 */

test('findCollisions never flags rows whose day is empty', () => {
  const undated = Array.from({ length: 17 }, (_, i) =>
    row('r' + i, { hari: '', jam: '0' + (8 + (i % 4)) + '.00-09.40' })
  );
  assert.deepEqual([...findCollisions(undated)], [], '17 unreadable days are not 17 clashes');
});

test('findCollisions never flags rows whose day is only whitespace', () => {
  const blank = [
    row('a', { hari: '   ', jam: '08.00-09.40' }),
    row('b', { hari: '\t', jam: '08.00-09.40' }),
  ];
  assert.deepEqual([...findCollisions(blank)], []);
});

test('an unreadable day cannot invent a clash with a real day', () => {
  // The row with no day must stay out of the Senin bucket, so only the two real
  // Senin rows are compared, and only the genuine overlap is flagged.
  const mixed = [
    row('a', { hari: 'Senin', jam: '08.00-09.40' }),
    row('b', { hari: 'Senin', jam: '10.00-11.40' }),
    row('c', { hari: '', jam: '08.30-10.00' }),
  ];
  assert.deepEqual([...findCollisions(mixed)], [], 'the undated row joins no day');
});

test('findCollisions compares days case- and form-insensitively', () => {
  // 'SENIN' and 'Senin' are one day: they used to sit in two buckets and the
  // real clash between them went unreported.
  const mixedCase = [
    row('a', { kode: 'IF184201', hari: 'SENIN', jam: '08.00-09.40' }),
    row('b', { kode: 'TI2019', hari: 'Senin', jam: '09.00-10.40' }),
  ];
  assert.deepEqual([...findCollisions(mixedCase)].sort(), ['a', 'b']);
});

test('sameSession treats differently cased days as one day', () => {
  const a = { kode: 'IF184201', kelas: 'A', hari: 'SENIN', jam: '08.00-09.40' };
  assert.equal(sameSession(a, { ...a, hari: 'Senin' }), true);
  assert.equal(sameSession(a, { ...a, hari: 'Selasa' }), false);
  assert.equal(sameSession(a, { ...a, hari: '' }), false);
});
