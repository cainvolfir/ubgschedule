import test from 'node:test';
import assert from 'node:assert/strict';

/*
 * Day grouping checks.
 *
 * Rows reach the result step with days from three places that disagree on
 * shape: the XLSX parser titles them, the Labkom bridge carries whatever the
 * portal printed, and the edit modal lets a student type anything. The result
 * step rendered `HARI_ORDER.map(...)` alone, so a row whose day was empty or
 * unrecognised matched none of the seven keys and was NEVER drawn: the schedule
 * stopped under its own heading with no error and no hint. These checks pin the
 * two rules that replaced it: every row lands in a group, and the group order
 * is HARI_ORDER followed by everything else.
 */
import {
  HARI_ORDER,
  FALLBACK_HARI,
  normalizeHari,
  groupByDay,
  dayGroups,
} from '../src/utils/hari.ts';

const row = (id, hari, jam = '08.00-09.40') => ({ id, hari, jam });

test('normalizeHari titles an untitled day and passes a real one through', () => {
  assert.equal(normalizeHari('SENIN'), 'Senin');
  assert.equal(normalizeHari('senin'), 'Senin');
  assert.equal(normalizeHari('Senin'), 'Senin');
  assert.equal(normalizeHari('  minggu  '), 'Minggu');
  assert.equal(normalizeHari('JUMAT'), 'Jumat');
});

test('normalizeHari reads a day heading welded to what follows it', () => {
  // textContent drops the whitespace between sibling elements, so a heading
  // reads 'SENIN159 Sesi Perkuliahan...' and a bare cell 'Senin08.00-09.40'.
  assert.equal(normalizeHari('SENIN159 Sesi Perkuliahan'), 'Senin');
  assert.equal(normalizeHari('Senin08.00-09.40'), 'Senin');
  assert.equal(normalizeHari('1. SENIN'), 'Senin');
  assert.equal(normalizeHari('KAMIS 13.00'), 'Kamis');
});

test('normalizeHari returns an empty day as empty, never as a guessed day', () => {
  assert.equal(normalizeHari(''), '');
  assert.equal(normalizeHari('   '), '');
  assert.equal(normalizeHari(null), '');
  assert.equal(normalizeHari(undefined), '');
});

test('normalizeHari keeps an unknown day as printed rather than inventing one', () => {
  // Guessing would move a row onto the wrong date; the raw label is honest.
  assert.equal(normalizeHari('SENINX'), 'SENINX');
  assert.equal(normalizeHari('Hari TBD'), 'Hari TBD');
});

test('groupByDay gives every row a group and no row is dropped', () => {
  const rows = [
    row('a', 'Senin'),
    row('b', ''),
    row('c', 'SENIN'),
    row('d', 'Minggu'),
    row('e', 'TBD'),
  ];
  const map = groupByDay(rows);
  assert.deepEqual([...map.keys()].sort(), ['Lainnya', 'Minggu', 'Senin', 'TBD']);
  assert.deepEqual(map.get('Senin').map((r) => r.id), ['a', 'c'], 'SENIN and Senin are one day');
  assert.deepEqual(map.get(FALLBACK_HARI).map((r) => r.id), ['b']);
  assert.equal([...map.values()].flat().length, rows.length, 'no row may be lost');
});

test('dayGroups puts the seven canonical days first, then everything else', () => {
  const groups = dayGroups([
    row('e', 'TBD'),
    row('b', ''),
    row('d', 'Rabu'),
    row('a', 'Senin'),
  ]);
  // Canonical days in week order, then the remaining groups in first-seen order.
  assert.deepEqual(groups.map((g) => g.hari), ['Senin', 'Rabu', 'TBD', 'Lainnya']);
});

test('dayGroups walks the week in order regardless of input order', () => {
  const rows = HARI_ORDER.map((day, i) => row('r' + i, day));
  assert.deepEqual(dayGroups([...rows].reverse()).map((g) => g.hari), [...HARI_ORDER]);
});

test('dayGroups keeps a schedule of unreadable days visible instead of blank', () => {
  // The exact symptom: 17 rows with no day on them rendered as nothing at all.
  const rows = Array.from({ length: 17 }, (_, i) => row('r' + i, ''));
  const groups = dayGroups(rows);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].hari, FALLBACK_HARI);
  assert.equal(groups[0].items.length, 17, 'every row is still there to be drawn');
});

test('dayGroups omits a canonical day with no rows and never an unknown one', () => {
  const groups = dayGroups([row('a', 'Senin'), row('b', 'X')]);
  assert.deepEqual(groups.map((g) => g.hari), ['Senin', 'X']);
  assert.ok(!groups.some((g) => g.hari === 'Selasa'));
});

test('dayGroups reads a day heading welded to a card count', () => {
  // A bridge payload whose Hari arrived as the whole section heading text.
  const groups = dayGroups([row('a', 'SENIN159 Sesi Perkuliahan'), row('b', 'Selasa')]);
  assert.deepEqual(groups.map((g) => g.hari), ['Senin', 'Selasa']);
});

test('dayGroups returns nothing for an empty schedule', () => {
  assert.deepEqual(dayGroups([]), []);
});
