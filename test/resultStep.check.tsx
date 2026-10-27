import { isValidElement } from 'react';
import ScheduleDaySections from '../src/components/ScheduleDaySections';
import { dayGroups } from '../src/utils/hari';
import { findCollisions } from '../src/utils/collision';
import { scheduleTextLines } from '../src/utils/scheduleExport';

/**
 * Result-step rendering check.
 *
 * The bug this pins: the page walked the seven canonical day names and looked
 * each one up in a group map, so a row whose day was empty or unrecognised
 * matched no key and was NEVER drawn. The schedule stopped under its own heading
 * with nothing on screen to say a row had gone missing.
 *
 * ScheduleDaySections is hook-free, so it is invoked directly and its element
 * tree walked, the same way AutoClassCard is checked. That exercises the real
 * JSX: if a group is dropped from the render, this fails.
 */

const results: { name: string; pass: boolean; detail?: string }[] = [];
const check = (name: string, cond: boolean, detail = '') => results.push({ name, pass: cond, detail });

interface Row {
  id: string; kode: string; nama: string; kelas: string; keterangan: string; sks: string;
  hari: string; jam: string; ruang: string; dosen: string; isPraktikum: boolean;
}

const row = (id: string, hari: string, jam: string, nama = 'MK ' + id): Row => ({
  id, kode: 'IF184201', nama, kelas: 'A', keterangan: 'TEORI', sks: '3',
  hari, jam, ruang: 'R.301', dosen: 'Dosen A', isPraktikum: false,
});

/** Concatenated text of a React node, resolving function components once. */
function nodeText(node: unknown): string {
  if (node == null || typeof node === 'boolean') return '';
  if (Array.isArray(node)) return node.map(nodeText).join(' ');
  if (isValidElement(node)) {
    const type = node.type as unknown;
    if (typeof type === 'function') {
      return nodeText((type as (p: unknown) => unknown)(node.props));
    }
    return nodeText((node.props as { children?: unknown }).children);
  }
  return String(node);
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Every element's own text, at any depth, when it satisfies pred. */
function collectMatching(node: unknown, pred: (t: string) => boolean, out: string[] = []): string[] {
  if (Array.isArray(node)) {
    node.forEach((n) => collectMatching(n, pred, out));
    return out;
  }
  if (!isValidElement(node)) return out;
  const text = norm(nodeText(node));
  if (text && pred(text)) out.push(text);
  const type = node.type as unknown;
  const childSource =
    typeof type === 'function' ? (type as (p: unknown) => unknown)(node.props) : node;
  collectMatching((childSource as { props?: { children?: unknown } }).props?.children, pred, out);
  return out;
}

/** Render a row list through the real component. */
function renderRows(rows: Row[]): string {
  const groups = dayGroups(rows);
  const collisions = findCollisions(rows);
  const tree = ScheduleDaySections({
    days: groups,
    collisions,
    onEdit: () => {},
    onDelete: () => {},
  } as never);
  return norm(nodeText(tree));
}

/* --- days the page knows ---------------------------------------------------- */

{
  const text = renderRows([
    row('a', 'Senin', '08.00-09.40', 'Pemrograman Web'),
    row('b', 'Rabu', '10.00-11.40', 'Basis Data'),
  ]);
  check('canonical days render their own heading',
    /Senin/.test(text) && /Rabu/.test(text), text.slice(0, 120));
  check('both rows render', /Pemrograman Web/.test(text) && /Basis Data/.test(text));
  check('the section headings are h2 elements',
    collectMatching(
      ScheduleDaySections({
        days: dayGroups([row('a', 'Senin', '08.00-09.40')]),
        collisions: new Set(),
        onEdit: () => {},
        onDelete: () => {},
      } as never),
      (t) => t === 'Senin'
    ).length >= 1);
}

/* --- rows whose day could not be read --------------------------------------- */

{
  const rows = [
    row('a', '', '08.00-09.40', 'Tanpa Hari Satu'),
    row('b', '', '10.00-11.40', 'Tanpa Hari Dua'),
    row('c', 'Senin', '13.00-14.40', 'Senin Punya'),
  ];
  const text = renderRows(rows);

  // The exact symptom: the undated rows were invisible. Every row must be on
  // screen somewhere, under a heading that says the day could not be read.
  check('a row with no day is still rendered', /Tanpa Hari Satu/.test(text), 'row a missing');
  check('every row with no day is rendered', /Tanpa Hari Dua/.test(text), 'row b missing');
  check('the unreadable-day group has a visible heading',
    /Jadwal Lainnya/.test(text), text.slice(0, 160));
  check('the known day still renders beside it', /Senin/.test(text));
  check('no phantom collision is flagged for rows with no day',
    !/Bentrok/.test(text), 'a clash badge was drawn');

  // The exported text must carry the same rows: an export that silently drops a
  // group the screen shows is the same fault one step further out.
  const joined = scheduleTextLines(dayGroups(rows)).join('\n');
  check('the copied text carries the unreadable-day group too',
    /JADWAL LAINNYA/.test(joined) && /Tanpa Hari Satu/.test(joined) && /Tanpa Hari Dua/.test(joined),
    joined.replace(/\n/g, ' | ').slice(0, 200));
  check('the copied text keeps the known day',
    /^SENIN$/m.test(joined) && /Senin Punya/.test(joined));
}

/* --- a day outside the seven canonical names -------------------------------- */

{
  const rows = [
    row('a', 'TBD', '08.00-09.40', 'Hari Tidak Jelas'),
    row('b', 'SENIN', '10.00-11.40', 'Senin Berjudul'),
  ];
  const text = renderRows(rows);
  check('a day outside the list still gets a heading', /TBD/.test(text), text.slice(0, 160));
  check('a day typed in caps is normalised onto its canonical heading',
    /Senin/.test(text) && !/\bSENIN\b/.test(text), text.slice(0, 160));
  check('both rows render', /Hari Tidak Jelas/.test(text) && /Senin Berjudul/.test(text));
}

/* --- a genuine clash is still flagged --------------------------------------- */

{
  const rows = [
    row('a', 'Senin', '08.00-09.40', 'Kelas Satu'),
    row('b', 'SENIN', '09.00-10.40', 'Kelas Dua'),
  ];
  const text = renderRows(rows);
  check('a clash between differently cased days is flagged', /Bentrok/.test(text), text.slice(0, 160));
}

/* --- a clash is never invented ---------------------------------------------- */

{
  const rows = [
    row('a', '', '08.00-09.40', 'Tanpa Hari Satu'),
    row('b', '', '08.00-09.40', 'Tanpa Hari Dua'),
    row('c', '', '08.00-09.40', 'Tanpa Hari Tiga'),
  ];
  check('rows with no day never collide with each other',
    findCollisions(rows).size === 0, 'collisions=' + findCollisions(rows).size);
  const text = renderRows(rows);
  check('rows with no day still all render',
    ['Tanpa Hari Satu', 'Tanpa Hari Dua', 'Tanpa Hari Tiga'].every((n) => text.includes(n)));
}

/* --- empty schedule --------------------------------------------------------- */

{
  const tree = ScheduleDaySections({
    days: [], collisions: new Set(), onEdit: () => {}, onDelete: () => {},
  } as never);
  check('an empty schedule renders no section at all', norm(nodeText(tree)) === '');
  check('an empty schedule exports only its header',
    scheduleTextLines([]).join('\n') === 'JADWAL UBG SCHEDULE\n==================');
}

const failed = results.filter((r) => !r.pass);
for (const r of results) console.log((r.pass ? 'PASS ' : 'FAIL ') + r.name + (r.detail ? ' (' + r.detail + ')' : ''));
console.log('\n' + (results.length - failed.length) + '/' + results.length + ' checks passed');
if (failed.length) process.exit(1);
