import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

/*
 * Userscript checks.
 *
 * ubg-labkom-helper.user.js is a browser IIFE with a documented test seam: at
 * the end of the IIFE it assigns its pure helpers to `module.exports` when a
 * CommonJS `module` is present. This repo is "type": "module", so a bare
 * `require()` would load the file as ESM and `module` would be undefined.
 * Running the source in a vm context with our own `module` (and a minimal DOM
 * stub) is what keeps the seam usable from node.
 *
 * document.readyState is 'loading' on purpose: the script then defers init() to
 * a DOMContentLoaded listener the stub never fires, so no panel is built and
 * only the pure helpers run.
 */
const scriptPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../ubg-labkom-helper.user.js'
);

const sandbox = {
  module: { exports: {} },
  console: { log() {}, warn() {}, error() {} },
  setTimeout,
  clearTimeout,
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
};
sandbox.window = { location: { href: '' }, open: () => null };
sandbox.document = {
  readyState: 'loading',
  body: null,
  head: null,
  documentElement: null,
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({
    style: { setProperty() {}, removeProperty() {} },
    classList: { add() {}, remove() {}, contains: () => false },
    appendChild() {},
    addEventListener() {},
    setAttribute() {},
  }),
  addEventListener() {},
};
sandbox.Event = class Event {
  constructor(type, opts) {
    this.type = type;
    Object.assign(this, opts);
  }
};
sandbox.MutationObserver = class MutationObserver {
  observe() {}
  disconnect() {}
};
sandbox.GM_getValue = () => null;
sandbox.GM_setValue = () => {};
sandbox.globalThis = sandbox;
sandbox.self = sandbox;

vm.createContext(sandbox);
vm.runInContext(readFileSync(scriptPath, 'utf8'), sandbox, { filename: scriptPath });

/*
 * Objects the script returns were built with the vm context's own intrinsics, so
 * their prototypes are not the host realm's and assert.deepStrictEqual would
 * reject otherwise identical values. Crossing them back through JSON gives plain
 * host objects, which is what the assertions compare.
 */
const plain = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));
const raw = sandbox.module.exports;
const us = {
  ...raw,
  parseBatch: (t) => plain(raw.parseBatch(t)),
  normaliseCourse: (c, k) => plain(raw.normaliseCourse(c, k)),
  scrapeCard: (c) => plain(raw.scrapeCard(c)),
  buildPayloadFromCards: (c) => plain(raw.buildPayloadFromCards(c)),
  evaluateCardEntries: (e, o) => plain(raw.evaluateCardEntries(e, o)),
  matchSaved: (t, c) => plain(raw.matchSaved(t, c)),
};

// The card text shape the portal prints, flattened by textContent.
function cardText({ title, code, kelas, hari, jam, ruang, dosen, sks, smt, keterangan }) {
  return [
    title,
    code ? `KODE MK: ${code}` : '',
    kelas ? `KELAS: ${kelas}` : '',
    sks ? `SKS: ${sks}` : '',
    smt ? `SMT: ${smt}` : '',
    dosen ? `DOSEN: ${dosen}` : '',
    hari ? `HARI: ${hari}` : '',
    jam ? `JAM: ${jam}` : '',
    ruang ? `RUANG: ${ruang}` : '',
    keterangan ? `KETERANGAN: ${keterangan}` : '',
  ].filter(Boolean).join(' ');
}

function entry(spec) {
  return { title: spec.title || 'Pemrograman Web', text: cardText(spec) };
}

/* ------------------------------------------------------------- resolveDayForCard */

/*
 * The portal does NOT print the day on a card. It heads each day with a heading
 * inside a section container and puts that day's cards below it:
 *
 *   <div class="bg-white rounded-2xl ...">      <- day section
 *     <h4>SENIN</h4> ... '159 Sesi Perkuliahan'  (welded by textContent)
 *     <div> ...card... </div>
 *   </div>
 *
 * So the day lives on an ancestor. Reading the card's own text alone returned ''
 * for every card, which put the whole schedule on one empty day: 17 rows, no day
 * on any of them, all bucketed together and reported as clashing.
 */
function makeDaySection(day, cards) {
  const cardNodes = cards.map((card) =>
    makeNode({
      children: [
        makeNode({ tag: 'h4', text: card.title }),
        makeNode({ text: card.meta }),
      ],
    })
  );
  // The heading is a sibling of the cards inside the section, and textContent
  // welds it to the section's own count: 'SENIN' + '159' -> 'SENIN159'.
  const section = makeNode({
    text: day ? day + '159 Sesi Perkuliahan' : '159 Sesi Perkuliahan',
    children: cardNodes,
  });
  return { section, cardNodes };
}

test('resolveDayForCard reads the day off the card section ancestor', () => {
  const { cardNodes } = makeDaySection('SENIN', [
    { title: 'Pemrograman Web', meta: 'KODE MK: IF184201 JAM: 08.00-09.40' },
    { title: 'Basis Data', meta: 'KODE MK: TI2019 JAM: 10.00-11.40' },
  ]);
  for (const card of cardNodes) {
    assert.equal(us.resolveDayForCard(card), 'Senin');
  }
});

test('resolveDayForCard reads every day name the section may head with', () => {
  const days = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];
  for (const day of days) {
    const { cardNodes } = makeDaySection(day, [
      { title: 'MK', meta: 'KODE MK: IF184201 JAM: 08.00-09.40' },
    ]);
    const expected = day.charAt(0) + day.slice(1).toLowerCase();
    assert.equal(us.resolveDayForCard(cardNodes[0]), expected, day);
  }
});

test('resolveDayForCard prefers the day printed on the card itself', () => {
  // A card that prints its own day is authoritative; the section may head a
  // different day if the portal ever nests cards under the wrong heading.
  const { section, cardNodes } = makeDaySection('SENIN', [
    { title: 'Pemrograman Web', meta: 'KODE MK: IF184201 HARI: Jumat JAM: 08.00-09.40' },
  ]);
  assert.equal(us.resolveDayForCard(cardNodes[0]), 'Jumat');
  assert.ok(section.textContent.includes('SENIN'));
});

test('resolveDayForCard returns an empty day when no ancestor names one', () => {
  const card = makeNode({ children: [makeNode({ tag: 'h4', text: 'MK' })] });
  makeNode({ text: '159 Sesi Perkuliahan', children: [card] });
  assert.equal(us.resolveDayForCard(card), '');
  assert.equal(us.resolveDayForCard(null), '');
  assert.equal(us.resolveDayForCard(undefined), '');
});

test('resolveDayForCard never climbs as far as <body>', () => {
  // The page body lists every day at once. Reaching it would answer 'Senin' for
  // a Tuesday card, which is worse than answering nothing.
  const card = makeNode({ children: [makeNode({ tag: 'h4', text: 'MK' })] });
  const grid = makeNode({ text: '159 Sesi Perkuliahan', children: [card] });
  const body = makeNode({ text: 'SENIN SELASA RABU', children: [grid] });
  sandbox.document.body = body;
  sandbox.document.documentElement = body;
  try {
    assert.equal(us.resolveDayForCard(card), '', 'body must not lend its own day');
  } finally {
    sandbox.document.body = null;
    sandbox.document.documentElement = null;
  }
});

test('resolveDayForCard does not read a day out of a longer word', () => {
  const { cardNodes } = makeDaySection('KELASSENINX', [
    { title: 'MK', meta: 'KODE MK: IF184201 JAM: 08.00-09.40' },
  ]);
  assert.equal(us.resolveDayForCard(cardNodes[0]), '', 'SENINX is not Senin');
});

test('hariFromHeading titles the day and refuses a glued word', () => {
  assert.equal(us.hariFromHeading('SENIN159 Sesi Perkuliahan'), 'Senin');
  assert.equal(us.hariFromHeading('SENIN 159 Sesi Perkuliahan'), 'Senin');
  assert.equal(us.hariFromHeading('Rabu'), 'Rabu');
  assert.equal(us.hariFromHeading('KELASSENINX 08.00'), '');
  assert.equal(us.hariFromHeading('159 Sesi Perkuliahan'), '');
});

test('scrapeCard takes the day from the card element when it has one', () => {
  // End to end through the scraper: the section supplies the day the card box
  // does not print, and the row arrives dated instead of empty.
  const { cardNodes } = makeDaySection('SELASA', [
    { title: 'Pemrograman Web', meta: 'KODE MK: IF184201 KELAS: A JAM: 08.00-09.40 RUANG: R.301' },
  ]);
  const row = us.scrapeCard({
    el: cardNodes[0],
    title: 'Pemrograman Web',
    text: cardNodes[0].textContent.replace(/\s+/g, ' ').trim(),
    matches: courses,
  });
  assert.equal(row.Hari, 'Selasa');
  assert.equal(row.Jam, '08.00-09.40');
});

/* ----------------------------------------------------------- card detection */

/**
 * Minimal DOM node for the card-detection tests.
 *
 * getCardElement() only ever touches parentElement, querySelectorAll('h4') and
 * textContent, so this implements exactly that surface. A real DOM library would
 * add a dependency for no extra coverage.
 */
function makeNode({ tag = 'div', text = '', children = [] } = {}) {
  const node = {
    tagName: tag.toUpperCase(),
    text,
    children,
    parentElement: null,
    querySelectorAll(selector) {
      if (selector !== 'h4') return [];
      const found = [];
      const walk = (n) => {
        for (const child of n.children) {
          if (child.tagName === 'H4') found.push(child);
          walk(child);
        }
      };
      walk(node);
      return found;
    },
    get textContent() {
      return [node.text, ...node.children.map((c) => c.textContent)].filter(Boolean).join(' ');
    },
  };
  for (const child of children) child.parentElement = node;
  return node;
}

/** Build a grid of cards, each <div><h4>title</h4><span>meta</span></div>. */
function makeGrid(cards) {
  const cardNodes = cards.map((card) =>
    makeNode({
      children: [
        makeNode({ tag: 'h4', text: card.title }),
        makeNode({ text: card.meta }),
      ],
    })
  );
  return { grid: makeNode({ children: cardNodes }), cardNodes };
}

test('getCardElement stops at the card that owns the <h4>', () => {
  const { grid, cardNodes } = makeGrid([
    { title: 'Pemrograman Web', meta: 'KODE MK: IF184201 HARI: Senin JAM: 08.00-09.40' },
    { title: 'Basis Data', meta: 'KODE MK: TI2019 HARI: Selasa JAM: 10.00-11.40' },
  ]);
  const h4 = cardNodes[0].querySelectorAll('h4')[0];

  const resolved = us.getCardElement(h4);
  assert.equal(resolved, cardNodes[0], 'the card, not the grid');
  assert.notEqual(resolved, grid, 'must never return the shared grid');
  // The resolved card holds exactly one <h4>: its own title.
  assert.equal(resolved.querySelectorAll('h4').length, 1);
});

test('getCardElement never climbs into an ancestor with a second <h4>', () => {
  // Both cards sit inside one grid; each card must resolve to itself.
  const { cardNodes } = makeGrid([
    { title: 'A', meta: 'JAM: 08.00-09.40' },
    { title: 'B', meta: 'JAM: 10.00-11.40' },
    { title: 'C', meta: 'JAM: 13.00-14.40' },
  ]);
  for (const card of cardNodes) {
    const h4 = card.querySelectorAll('h4')[0];
    assert.equal(us.getCardElement(h4), card);
  }
});

test('getCardElement scopes each card so siblings never share a container', () => {
  const { cardNodes } = makeGrid([
    { title: 'A', meta: 'JAM: 08.00-09.40' },
    { title: 'B', meta: 'JAM: 10.00-11.40' },
  ]);
  const first = us.getCardElement(cardNodes[0].querySelectorAll('h4')[0]);
  const second = us.getCardElement(cardNodes[1].querySelectorAll('h4')[0]);
  assert.notEqual(first, second, 'two cards must not resolve to one element');
  // Each card's own text must carry only its own course.
  assert.ok(first.textContent.includes('A'));
  assert.ok(!first.textContent.includes('B'), 'a card must not swallow its sibling');
});

test('getCardElement returns null when the <h4> sits in the shared grid itself', () => {
  // A degenerate shape: the headings are direct children of the grid, so there is
  // no per-card container to resolve. Returning null keeps the card hidden rather
  // than filtering the whole grid as if it were one course.
  const h4 = makeNode({ tag: 'h4', text: 'Pemrograman Web' });
  const grid = makeNode({
    text: 'JAM: 08.00-09.40',
    children: [h4, makeNode({ tag: 'h4', text: 'Basis Data' })],
  });
  assert.equal(grid.querySelectorAll('h4').length, 2);
  assert.equal(us.getCardElement(h4), null);
});

/* ------------------------------------------------------------------ parseBatch */

test('parseBatch reads CODE, CODE,CLASS and CODE CLASS into the same pair', () => {
  const expected = [{ code: 'IF184201', kelas: 'A' }];
  for (const input of ['IF184201, A', 'IF184201,A', 'IF184201 A', '  IF184201 ,  a  ']) {
    assert.deepEqual(us.parseBatch(input), expected, `input: ${JSON.stringify(input)}`);
  }
});

test('parseBatch keeps a bare code bare and splits comma-separated codes', () => {
  assert.deepEqual(us.parseBatch('IF184201'), [{ code: 'IF184201', kelas: '' }]);
  assert.deepEqual(us.parseBatch('IF184201,TI2019'), [
    { code: 'IF184201', kelas: '' },
    { code: 'TI2019', kelas: '' },
  ]);
});

test('parseBatch trims whitespace, newlines and semicolons around entries', () => {
  assert.deepEqual(us.parseBatch('  IF184201,A ;\n TI2019 ,  B1  '), [
    { code: 'IF184201', kelas: 'A' },
    { code: 'TI2019', kelas: 'B1' },
  ]);
});

test('parseBatch accepts the 5 and 6 character codes the portal issues', () => {
  assert.deepEqual(us.parseBatch('TI201, A'), [{ code: 'TI201', kelas: 'A' }]);
  assert.deepEqual(us.parseBatch('IF1234, B2'), [{ code: 'IF1234', kelas: 'B2' }]);
  assert.deepEqual(us.parseBatch('IK1IW33005'), [{ code: 'IK1IW33005', kelas: '' }]);
});

test('parseBatch rejects noise words and code labels without digits', () => {
  assert.deepEqual(us.parseBatch('KELAS TEORI DOSEN SENIN'), []);
  assert.deepEqual(us.parseBatch('ABCDEF'), []);
});

test('parseBatch never writes the same course twice from one paste', () => {
  assert.deepEqual(us.parseBatch('IF184201,A IF184201,A IF184201, A'), [
    { code: 'IF184201', kelas: 'A' },
  ]);
});

test('parseBatch only treats a class token as a class, not any trailing word', () => {
  // 'Pemrograman' is not a class label, so both words are read as codes (and
  // the word without a digit is rejected).
  assert.deepEqual(us.parseBatch('IF184201 Pemrograman'), [{ code: 'IF184201', kelas: '' }]);
  // A section letter past L is not a valid class label, so it is read as a code
  // and rejected (no digit).
  assert.deepEqual(us.parseBatch('IF184201, Z'), [{ code: 'IF184201', kelas: '' }]);
});

/* --------------------------------------------------------------- classMatches */

test('classMatches accepts the labelled forms of the saved section', () => {
  assert.equal(us.classMatches('KELAS A', 'A'), true);
  assert.equal(us.classMatches('KELOMPOK A', 'A'), true);
  assert.equal(us.classMatches('KEL. A', 'A'), true);
  assert.equal(us.classMatches('KELAS A1', 'A'), true, 'sub-group of section A is section A');
  assert.equal(us.classMatches('KELOMPOK A1', 'A1'), true);
  assert.equal(us.classMatches('KELOMPOK 1', 'A1'), true, 'group number alone matches');
});

test('classMatches rejects a different section', () => {
  assert.equal(us.classMatches('KELAS B', 'A'), false);
  assert.equal(us.classMatches('KELOMPOK B1', 'A'), false);
  assert.equal(us.classMatches('KELAS B1', 'A1'), false);
});

test('classMatches rejects a section letter beyond L', () => {
  assert.equal(us.classMatches('KELAS Z', 'A'), false);
  assert.equal(us.classMatches('KELOMPOK M1', 'A'), false);
  assert.equal(us.classMatches('KELAS A KELAS Z', 'A'), false, 'any stray out-of-range section rejects');
});

test('classMatches rejects an invalid saved label outright', () => {
  assert.equal(us.classMatches('KELAS A', 'Z'), false);
  assert.equal(us.classMatches('KELAS A', 'AA'), false);
  assert.equal(us.classMatches('KELAS A', '12'), false);
});

test('classMatches does not let a room bleed into the class', () => {
  // 'LAB A1' is a room. Saved class 'A' must not be satisfied by it.
  assert.equal(us.classMatches('RUANG LAB A1', 'A'), false);
  assert.equal(us.classMatches('RUANG R.A1', 'A'), false);
  assert.equal(us.classMatches('LAB A1 KELAS B', 'A'), false);
  // A bare room token WITHOUT digits is the sharpest case: 'LAB A' is a room
  // named A, and nothing else on the card looks like a class, so saved 'A' would
  // match it unless the room marker is honoured.
  assert.equal(us.classMatches('LAB A', 'A'), false);
  assert.equal(us.classMatches('RUANG A', 'A'), false);
  assert.equal(us.classMatches('LABKOM B', 'B'), false);
  assert.equal(us.classMatches('RUANGAN A', 'A'), false);
  // The lab sub-group label is still readable when it IS a class label.
  assert.equal(us.classMatches('KELAS A LAB A1', 'A'), true);
  assert.equal(us.classMatches('KELOMPOK A1 RUANG LAB A1', 'A1'), true);
  assert.equal(us.classMatches('LAB A KELAS A', 'A'), true, 'a real class label wins over the room');
});

test('classMatches lets an explicit KELAS outrank a KELOMPOK sub-group', () => {
  // A practical card names its section (KELAS) and its sub-group (KELOMPOK)
  // separately. When they disagree, the KELOMPOK belongs to a different section
  // and must not make that card look like the saved section.
  assert.equal(
    us.classMatches('KELAS: B KETERANGAN: Praktikum Kelompok A2', 'A'),
    false,
    'section B with kelompok A2 is section B, not A'
  );
  assert.equal(us.classMatches('KELAS: A KETERANGAN: Praktikum Kelompok A2', 'A'), true);
  // With no explicit KELAS field, the KELOMPOK alone decides.
  assert.equal(us.classMatches('KELOMPOK A1', 'A'), true);
  assert.equal(us.classMatches('KELOMPOK B1', 'A'), false);
});

test('classMatches with no explicit label needs an exact standalone token', () => {
  assert.equal(us.classMatches('A', 'A'), true);
  assert.equal(us.classMatches('IF184201 A 08.00-09.40', 'A'), true);
  assert.equal(us.classMatches('A1', 'A'), false, 'a bare sub-group is not section A');
  assert.equal(us.classMatches('A1', 'A1'), true);
  assert.equal(us.classMatches('B', 'A'), false);
});

test('classMatches is not fooled by incidental letters inside words', () => {
  // The old substring logic matched the 'A1' inside 'R.301'/'TAG1'.
  assert.equal(us.classMatches('RUANG R.301', 'A1'), false);
  assert.equal(us.classMatches('SKS 3', 'A'), false);
  assert.equal(us.classMatches('DOSEN ADI', 'A'), false);
});

/* ---------------------------------------------------------------- hasCodeToken */

test('hasCodeToken requires whole-token equality, never a substring', () => {
  assert.equal(us.hasCodeToken('KODE MK: IF184201 KELAS A', 'IF184201'), true);
  assert.equal(us.hasCodeToken('KODE MK: IF184201 KELAS A', 'IF1842'), false, 'prefix must not match');
  assert.equal(us.hasCodeToken('KODE MK: IF184201 KELAS A', '184201'), false, 'suffix must not match');
  assert.equal(us.hasCodeToken('KODE MK: IF184201 KELAS A', 'IF18420'), false);
});

test('hasCodeToken recovers a code the DOM glued to its label', () => {
  assert.equal(us.hasCodeToken('IF184201KELAS A', 'IF184201'), true);
  assert.equal(us.hasCodeToken('IF184201SKS 3', 'IF184201'), true);
  assert.equal(us.hasCodeToken('IF184201KELAS A', 'IF1842'), false);
});

test('hasCodeToken accepts punctuation-separated and multi-token codes', () => {
  assert.equal(us.hasCodeToken('KODE:IK1IW33005;KELAS:A', 'IK1IW33005'), true);
  assert.equal(us.hasCodeToken('(IF184201)', 'IF184201'), true);
  assert.equal(us.hasCodeToken('', 'IF184201'), false);
  assert.equal(us.hasCodeToken('anything', ''), false);
});

/* --------------------------------------------- hasCodeToken: glued prodi+code */
/*
 * The real card textContent from labkom.ubg.ac.id. Sibling <span>s carry no
 * whitespace between them, so the prodi, the KodeMK and the semester marker
 * arrive welded into single alphanumeric runs. These are the four cards the
 * user's DevTools dump printed with `matched=0`.
 */
const GLUED_CARDS = [
  {
    prodi: 'S1 SASTRA INGG',
    code: 'SSKI3214',
    title: 'Speaking for Global Context',
    text: '08:00 - 09:40 WITAKuliah TeoriS1SASTRAINGGRISSSKI3214 \u2022 Semester 3Speaking for Global Context',
  },
  {
    prodi: 'S1 BISNIS DIGITAL',
    code: 'BDKI1303',
    title: 'Pengantar Manajemen dan Bisnis',
    text: '08:00 - 10:30 WITAKuliah TeoriS1BISNISDIGITALBDKI1303 \u2022 Semester 1Pengantar Manajemen dan Bisnis',
  },
  {
    prodi: 'S1 HUKUM',
    code: 'HKKI230025',
    title: 'Hukum Hak Kekayaan Intelektual',
    text: '08:00 - 09:40 WITAKuliah TeoriS1HUKUMHKKI230025 \u2022 Semester 3Hukum Hak Kekayaan Intelektual',
  },
  {
    prodi: 'S1 TI',
    code: 'TI1UW3103',
    title: 'Dasar Pemrograman Mobile',
    text: '08:00 - 08:50 WITAKuliah TeoriS1TITI1UW3103 \u2022 Semester 1Dasar Pemrograman Mobile',
  },
];

test('hasCodeToken matches a code glued onto the end of a prodi name', () => {
  for (const card of GLUED_CARDS) {
    assert.equal(
      us.hasCodeToken(card.text.toUpperCase(), card.code),
      true,
      `${card.code} must match inside '${card.prodi}${card.code}'`
    );
  }
});

test('hasCodeToken matches a glued prodi+code whatever the programme name', () => {
  // The programme name before the code is unnamed in textContent, so the rule
  // cannot lean on a list of prodi names. Any S1/D3/D4 prefix followed by
  // letters must work, including the long ones the portal issues.
  const prodi = [
    'S1ILMUKOMPUTER', 'S1TEKNIKINFORMATIKA', 'S1SISTEMINFORMASI',
    'S1TEKNIKELEKTRO', 'S1AKUNTANSI', 'S1MANAJEMEN', 'D3MANAJEMENINFORMATIKA',
    'D4TEKNOLOGIREKAYASAINTERNET',
  ];
  for (const p of prodi) {
    assert.equal(us.hasCodeToken(`${p}TI1UW3103 KELAS A`, 'TI1UW3103'), true, p);
  }
});

test('hasCodeToken still refuses a code welded to a longer code', () => {
  // The widening must not become a substring match. TI101 must not be
  // satisfied by a card carrying TI10199 or TI1012, because the character
  // after the saved code continues a longer code rather than ending one.
  assert.equal(us.hasCodeToken('TI10199', 'TI101'), false, 'digit continues the code');
  assert.equal(us.hasCodeToken('TI1012', 'TI101'), false);
  assert.equal(us.hasCodeToken('TI101A', 'TI101'), false, 'letter continues the code');
  assert.equal(us.hasCodeToken('S1TI10199', 'TI101'), false, 'glued prodi does not excuse a longer code');
  assert.equal(us.hasCodeToken('S1TITI10199', 'TI101'), false);
  // A code followed by a real delimiter or a label word is complete.
  assert.equal(us.hasCodeToken('S1TITI101 KELAS A', 'TI101'), true, 'whitespace ends it');
  assert.equal(us.hasCodeToken('S1TITI101\u2022KELAS A', 'TI101'), true, 'bullet ends it');
  assert.equal(us.hasCodeToken('S1TITI101KELAS A', 'TI101'), true, 'label word ends it');
  assert.equal(us.hasCodeToken('S1TITI101-KELAS A', 'TI101'), true, 'dash ends it');
  assert.equal(us.hasCodeToken('TI101(REGULER)', 'TI101'), true);
  assert.equal(us.hasCodeToken('TI101/SMT3', 'TI101'), true);
});

test('hasCodeToken needs a prodi marker on the left of a glued code', () => {
  // Without a prodi marker the code is sitting inside an arbitrary longer
  // identifier, which must never match: the left boundary is what makes the
  // widening safe rather than a plain substring search.
  assert.equal(us.hasCodeToken('XXTI101 KELAS A', 'TI101'), false);
  assert.equal(us.hasCodeToken('FOOTI101 KELAS A', 'TI101'), false);
  assert.equal(us.hasCodeToken('184201', 'IF184201'), false, 'suffix still refused');
  // A jenjang marker must be followed by a programme name to read as a prodi:
  // 'S1TI101' has only 'S1' to its left, which is the marker alone, so the code
  // is treated as part of one longer run and refused. Every prodi the portal
  // prints carries letters after the jenjang ('S1TI', 'D3MI').
  assert.equal(us.hasCodeToken('S1TI101 KELAS A', 'TI101'), false, 'marker alone is not a prodi');
  assert.equal(us.hasCodeToken('S1MITI101 KELAS A', 'TI101'), true, 'marker plus a name is');
});

test('hasCodeToken reads the real cards the DevTools dump showed', () => {
  // End to end through the pure filter core: the same cards that produced
  // `matched=0` in the browser must now match, with their time range intact.
  const saved = GLUED_CARDS.map((c) => ({ code: c.code, kelas: '' }));
  const results = us.evaluateCardEntries(
    GLUED_CARDS.map((c) => ({ title: c.title, text: c.text })),
    { filtering: true, courses: saved }
  );
  for (let i = 0; i < GLUED_CARDS.length; i++) {
    assert.equal(results[i].parsed, true, `${GLUED_CARDS[i].code} must parse`);
    assert.equal(results[i].matched, true, `${GLUED_CARDS[i].code} must match`);
    assert.equal(results[i].visible, true, `${GLUED_CARDS[i].code} must be visible`);
  }
});

/* ------------------------------------------------------- fail-closed filtering */

const courses = [{ code: 'IF184201', kelas: 'A' }];

test('evaluateCardEntries matches a fully parseable card', () => {
  const [result] = us.evaluateCardEntries(
    [entry({ code: 'IF184201', kelas: 'A', hari: 'Senin', jam: '08.00-09.40', ruang: 'R.301' })],
    { filtering: true, courses }
  );
  assert.equal(result.parsed, true);
  assert.equal(result.matched, true);
  assert.equal(result.visible, true);
  assert.equal(result.matches.length, 1);
});

test('evaluateCardEntries fails closed on a card that does not match', () => {
  const [result] = us.evaluateCardEntries(
    [entry({ code: 'ZZ999999', kelas: 'A', hari: 'Senin', jam: '08.00-09.40' })],
    { filtering: true, courses }
  );
  assert.equal(result.parsed, true);
  assert.equal(result.matched, false);
  assert.equal(result.visible, false, 'an unmatched card must be hidden');
});

test('evaluateCardEntries fails closed on a card with no time range', () => {
  const [result] = us.evaluateCardEntries(
    [{ title: 'Pemrograman Web', text: 'KODE MK: IF184201 KELAS: A' }],
    { filtering: true, courses }
  );
  assert.equal(result.parsed, false, 'no time range means unparsable');
  assert.equal(result.visible, false, 'an unparsable card must be hidden');
});

test('evaluateCardEntries fails closed on a card with no title', () => {
  const [result] = us.evaluateCardEntries(
    [{ title: '', text: 'KODE MK: IF184201 KELAS: A 08.00-09.40' }],
    { filtering: true, courses }
  );
  assert.equal(result.parsed, false);
  assert.equal(result.visible, false);
});

test('evaluateCardEntries fails closed on empty and whitespace-only cards', () => {
  const results = us.evaluateCardEntries([{ text: '', title: '' }, { text: '   ', title: '   ' }], {
    filtering: true,
    courses,
  });
  assert.deepEqual(results.map((r) => r.parsed), [false, false]);
  assert.deepEqual(results.map((r) => r.visible), [false, false]);
});

test('evaluateCardEntries shows everything when filtering is off', () => {
  const results = us.evaluateCardEntries(
    [
      entry({ code: 'IF184201', kelas: 'A', hari: 'Senin', jam: '08.00-09.40' }),
      entry({ code: 'ZZ999999', kelas: 'B', hari: 'Selasa', jam: '10.00-11.40' }),
    ],
    { filtering: false, courses }
  );
  assert.deepEqual(results.map((r) => r.visible), [true, true]);
  assert.deepEqual(results.map((r) => r.matched), [true, false]);
});

test('evaluateCardEntries hides every card when filtering is on and nothing matches', () => {
  const results = us.evaluateCardEntries(
    [
      entry({ code: 'ZZ999999', kelas: 'A', hari: 'Senin', jam: '08.00-09.40' }),
      entry({ code: 'IF184201', kelas: 'B', hari: 'Selasa', jam: '10.00-11.40' }),
    ],
    { filtering: true, courses }
  );
  assert.deepEqual(results.map((r) => r.visible), [false, false]);
});

/* ------------------------------------------------------------- bridge scraping */

test('scrapeCard pulls every field the app stores', () => {
  const card = {
    title: 'Pemrograman Web',
    text: cardText({
      code: 'IF184201',
      kelas: 'A',
      sks: '3',
      smt: '3',
      dosen: 'Dosen Satu',
      hari: 'Senin',
      jam: '08.00-09.40',
      ruang: 'R.301',
      keterangan: 'TEORI',
    }),
    matches: courses,
  };
  const row = us.scrapeCard(card);
  assert.equal(row.MataKuliah, 'Pemrograman Web');
  assert.equal(row.KodeMK, 'IF184201');
  assert.equal(row.Kelas, 'A');
  assert.equal(row.SKS, '3');
  assert.equal(row.SMT, '3');
  assert.equal(row.Dosen, 'Dosen Satu');
  assert.equal(row.Hari, 'Senin');
  assert.equal(row.Jam, '08.00-09.40');
  assert.equal(row.Ruang, 'R.301');
});

test('scrapeCard normalises the time range the portal prints', () => {
  const card = {
    title: 'Pemrograman Web',
    text: 'KODE MK: IF184201 KELAS: A HARI: Senin JAM: 8:00 - 9:40 WITA',
    matches: courses,
  };
  assert.equal(us.scrapeCard(card).Jam, '08.00-09.40');
});

test('extractCardFields keeps a field whole when a repeated label follows it', () => {
  // The portal prints a 'Semester 3' badge next to the code and an explicit
  // 'SMT: 3' field on the same card. The first label to claim the field wins,
  // but the second must still end the value before it: SKS reads '3', not
  // '3 SMT: 3'.
  const fields = us.extractCardFields(
    'KODE MK: IF184201 KELAS: A SKS: 3 Semester 3 SMT: 3 DOSEN: Dosen Satu KETERANGAN: TEORI'
  );
  assert.equal(fields.smt, '3');
  assert.equal(fields.sks, '3', 'SKS must not run through the later SMT label');
  assert.equal(fields.dosen, 'Dosen Satu');
  assert.equal(fields.keterangan, 'TEORI');
});

test('extractCardFields never cuts a value at a label word inside it', () => {
  // Label words are matched case-insensitively, so a value that happens to
  // contain one would cut itself off if a bare repeat were a boundary: the
  // lecturer here is literally named 'Dosen Satu'. Only a label written as a
  // field (followed by a colon) ends a value.
  const fields = us.extractCardFields(
    'DOSEN: Dosen Satu KETERANGAN: TEORI RUANG: LAB 1'
  );
  assert.equal(fields.dosen, 'Dosen Satu', 'the word Dosen inside the name is prose');
  assert.equal(fields.keterangan, 'TEORI');
  assert.equal(fields.ruang, 'LAB 1');
});

test('extractCardFields reads both the group and the section of a practical card', () => {
  // A practical card names its section twice: 'KELAS: A1' as a field and
  // 'Kelompok A1' inside the Keterangan. The field wins the section, and the
  // Keterangan keeps its group name intact for the app to display.
  const fields = us.extractCardFields(
    'KELAS: A1 KETERANGAN: PRAKTIKUM - Kelompok A1 RUANG: LABKOM 2'
  );
  assert.equal(fields.kelas, 'A1');
  assert.equal(fields.keterangan, 'PRAKTIKUM - Kelompok A1');
  assert.equal(fields.ruang, 'LABKOM 2');
});

test('buildPayloadFromCards separates theory from practical rows', () => {
  const payload = us.buildPayloadFromCards([
    {
      title: 'Pemrograman Web',
      text: cardText({
        code: 'IF184201', kelas: 'A', hari: 'Senin', jam: '08.00-09.40',
        ruang: 'R.301', keterangan: 'TEORI',
      }),
      matches: courses,
    },
    {
      title: 'Praktikum Pemrograman Web',
      text: cardText({
        code: 'IF184201', kelas: 'A', hari: 'Rabu', jam: '10.00-11.40',
        ruang: 'LAB 1', keterangan: 'PRAKTIKUM - Kelompok A1',
      }),
      matches: courses,
    },
  ]);

  assert.equal(payload.theory.length, 1);
  assert.equal(payload.praktikum.length, 1);
  assert.equal(payload.theory[0].id, 'bridge-theory-0');
  assert.equal(payload.praktikum[0].id, 'bridge-lab-0');
  assert.equal(payload.praktikum[0].ruang, 'LAB 1');
  assert.equal(payload.praktikum[0].keterangan, 'PRAKTIKUM - Kelompok A1');
});

test('buildPayloadFromCards treats a lab room as practical without a lab label', () => {
  const payload = us.buildPayloadFromCards([
    {
      title: 'Jaringan Komputer',
      text: cardText({
        code: 'TI2019', kelas: 'A', hari: 'Kamis', jam: '13.00-14.40', ruang: 'LABKOM 2',
      }),
      matches: courses,
    },
  ]);
  assert.equal(payload.theory.length, 0);
  assert.equal(payload.praktikum.length, 1);
  assert.equal(payload.praktikum[0].ruang, 'LABKOM 2');
});

test('extractCardFields reads an SKS badge written before the word', () => {
  // The portal prints the credit count as a badge: '3 SKS' (and the glued
  // '3SKS'), which leaves no value after the label word. The count must still
  // be recovered from the badge.
  assert.equal(us.extractCardFields('KODE MK: IF184201 KELAS: A 3 SKS').sks, '3');
  assert.equal(us.extractCardFields('KODE MK: IF184201 KELAS: A 3SKS').sks, '3');
  assert.equal(us.extractCardFields('IF184201 2 SKS HARI: Senin').sks, '2');
  // case-insensitive, as the portal mixes casing
  assert.equal(us.extractCardFields('IF184201 2 sks').sks, '2');
  // An explicit 'SKS:' field still wins over the badge.
  assert.equal(us.extractCardFields('KELAS: A SKS: 4 3 SKS').sks, '4');
});

test('extractCardFields keeps the credit count out of the class value', () => {
  // 'KELAS: A 3 SKS' must read the class as 'A', not fold the badge into it.
  const fields = us.extractCardFields('KODE MK: IF184201 KELAS: A 3 SKS HARI: Senin');
  assert.equal(fields.kelas, 'A');
  assert.equal(fields.sks, '3');
});

test('scrapeCard reads a badge SKS from a card with no SKS field', () => {
  const row = us.scrapeCard({
    title: 'Pemrograman Web',
    text: 'KODE MK: IF184201 KELAS: A 3 SKS HARI: Senin JAM: 08.00-09.40 RUANG: R.301 KETERANGAN: TEORI',
    matches: courses,
  });
  assert.equal(row.SKS, '3');
  assert.equal(row.Kelas, 'A');
});

test('buildPayloadFromCards deduplicates cards that describe one session', () => {
  // A re-rendered grid can hand the same session twice; the payload must carry
  // it once or the result page draws two boxes and counts a phantom clash.
  const card = (jam) => ({
    title: 'Pemrograman Web',
    text: `KODE MK: IF184201 KELAS: A HARI: Senin JAM: ${jam} RUANG: R.301 KETERANGAN: TEORI`,
    matches: courses,
  });
  const payload = us.buildPayloadFromCards([card('08.00-09.40'), card('08.00-09.40')]);
  assert.equal(payload.theory.length, 1, 'an exact repaint collapses to one row');
  assert.equal(payload.theory[0].id, 'bridge-theory-0', 'ids stay contiguous');
  // A genuinely different session (another time) is kept.
  const two = us.buildPayloadFromCards([card('08.00-09.40'), card('10.00-11.40')]);
  assert.equal(two.theory.length, 2);
});

test('buildPayloadFromCards keeps practical duplicates out too', () => {
  const card = {
    title: 'Praktikum Pemrograman Web',
    text: 'KODE MK: IF184201 KELAS: A HARI: Rabu JAM: 10.00-11.40 RUANG: LAB 1 KETERANGAN: PRAKTIKUM - Kelompok A1',
    matches: courses,
  };
  const payload = us.buildPayloadFromCards([card, card]);
  assert.equal(payload.praktikum.length, 1);
  assert.equal(payload.praktikum[0].id, 'bridge-lab-0');
});

test('buildPayloadFromCards mints unique ids per index in each array', () => {
  const cards = [1, 2, 3].map((i) => ({
    title: 'MK ' + i,
    text: `KODE MK: IF18420${i} KELAS: A HARI: Senin JAM: 08.00-09.40 RUANG: R.301`,
    matches: courses,
  }));
  const payload = us.buildPayloadFromCards(cards);
  assert.deepEqual(payload.theory.map((r) => r.id), [
    'bridge-theory-0', 'bridge-theory-1', 'bridge-theory-2',
  ]);
});

test('buildPayloadFromCards skips a card with no course name', () => {
  const payload = us.buildPayloadFromCards([
    { title: '', text: 'KODE MK: IF184201 HARI: Senin JAM: 08.00-09.40', matches: courses },
  ]);
  assert.equal(payload.theory.length + payload.praktikum.length, 0);
});

test('isPraktikumCard only fires on whole-word lab markers', () => {
  assert.equal(us.isPraktikumCard('R.301', 'TEORI', 'Pemrograman Web'), false);
  assert.equal(us.isPraktikumCard('LAB 1', '', 'Pemrograman Web'), true);
  assert.equal(us.isPraktikumCard('R.301', 'Praktikum - Kelompok A1', 'Pemrograman Web'), true);
  // 'Praktisi' is a lecturer descriptor, not a practical.
  assert.equal(us.isPraktikumCard('R.301', '', 'Kuliah Praktisi'), false);
});

test('extractKodeMk ignores numbers, day names and label words', () => {
  assert.equal(us.extractKodeMk('SKS 3 SMT 4 SENIN JAM 08.00-09.40'), '');
  assert.equal(us.extractKodeMk('KODE MK: IF184201 KELAS A'), 'IF184201');
  assert.equal(us.extractKodeMk('IK1IW33005 KELAS A'), 'IK1IW33005');
});

test('extractKodeMk refuses to guess a code out of a glued prodi run', () => {
  // 'S1TITI1UW3103' holds both the prodi and the code with no separator, so
  // where one ends and the other begins is not knowable from the text. Returning
  // a fragment would mint a code that does not exist, so the caller is left to
  // fall back to the saved course's own code.
  assert.equal(us.extractKodeMk('Kuliah TeoriS1TITI1UW3103 \u2022 Semester 1'), '');
  assert.equal(us.extractKodeMk('Kuliah TeoriS1SASTRAINGGRISSSKI3214 \u2022 Semester 3'), '');
  assert.equal(us.extractKodeMk('Kuliah TeoriS1HUKUMHKKI230025 \u2022 Semester 3'), '');
  // The same run with the code separated still reads.
  assert.equal(us.extractKodeMk('Kuliah TeoriS1TI TI1UW3103 \u2022 Semester 1'), 'TI1UW3103');
});

test('stripCardTitle removes the course name that textContent folds in', () => {
  const text = 'Semester 3Speaking for Global Context';
  assert.equal(us.stripCardTitle(text, 'Speaking for Global Context'), 'Semester 3');
  // No title: the text is returned untouched.
  assert.equal(us.stripCardTitle(text, ''), text);
  // Every occurrence goes, not just the first.
  assert.equal(us.stripCardTitle('A x A', 'A'), ' x ');
  // Regex metacharacters in a course name are matched literally.
  assert.equal(us.stripCardTitle('Semester 1Rekayasa (Web)/Mobile', 'Rekayasa (Web)/Mobile'), 'Semester 1');
});

test('extractHari reads a day heading glued to the element after it', () => {
  assert.equal(us.extractHari('Senin08:00 - 09:40 WITAKuliah Teori'), 'Senin');
  assert.equal(us.extractHari('Rabu10.00-11.40'), 'Rabu');
  assert.equal(us.extractHari('HARI: Rabu JAM 10.00-11.40'), 'Rabu');
  // A day name inside a longer word is not a day.
  assert.equal(us.extractHari('KELASSENINX 08.00-09.00'), '');
  assert.equal(us.extractHari('no day here'), '');
});

test('cardRowType reads the row type the card prints', () => {
  assert.equal(us.cardRowType('Kuliah TeoriS1TITI1UW3103 \u2022 Semester 1'), 'TEORI');
  assert.equal(us.cardRowType('Kuliah PraktikumS1TITI1UW3103'), 'PRAKTIKUM');
  assert.equal(us.cardRowType('JENIS: TEORI'), 'TEORI');
  assert.equal(us.cardRowType('Praktikum'), 'PRAKTIKUM');
  assert.equal(us.cardRowType('no type here'), '');
  // 'Praktisi' is a lecturer descriptor, not a row type.
  assert.equal(us.cardRowType('Kuliah Praktisi'), '');
});

/* --------------------------------------------------------------- scrapeCard: glued */

test('scrapeCard reads a real glued card without bleeding the title into a field', () => {
  const card = GLUED_CARDS[0];
  const row = us.scrapeCard({
    title: card.title,
    text: card.text,
    matches: [{ code: card.code, kelas: '' }],
  });
  assert.equal(row.MataKuliah, card.title);
  assert.equal(row.KodeMK, card.code, 'the saved code supplies what the glue hid');
  assert.equal(row.Jam, '08.00-09.40');
  assert.equal(row.SMT, '3', 'the title must not bleed into the semester');
  assert.equal(row.SKS, '');
  assert.equal(row.Keterangan, 'TEORI', 'the card states its own row type');
  assert.ok(!/Speaking/.test(row.SMT), 'no part of the course name may reach a field');
});

test('buildPayloadFromCards files a glued theory card as theory', () => {
  const payload = us.buildPayloadFromCards(
    GLUED_CARDS.map((c) => ({
      title: c.title,
      text: c.text,
      matches: [{ code: c.code, kelas: '' }],
    }))
  );
  assert.equal(payload.theory.length, GLUED_CARDS.length);
  assert.equal(payload.praktikum.length, 0, '"Kuliah Teori" is never a practical');
  assert.deepEqual(payload.theory.map((r) => r.KodeMK), GLUED_CARDS.map((c) => c.code));
});

/* ------------------------------------------------------------- payload encoding */

test('encodePayload produces a URL-safe base64 the app can decode', () => {
  const payload = { version: 1, theory: [{ MataKuliah: 'Pemrograman Web', Keterangan: 'A1' }], praktikum: [] };
  const encoded = us.encodePayload(JSON.stringify(payload));
  assert.match(encoded, /^[A-Za-z0-9_-]+$/, 'no +, / or = may survive');
  const decoded = JSON.parse(
    decodeURIComponent(escape(Buffer.from(encoded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('binary')))
  );
  assert.deepEqual(decoded, payload);
});

test('encodePayload survives non-ASCII course names', () => {
  const payload = { theory: [{ MataKuliah: 'Pemrograman Berorientasi Objek — Praktik' }] };
  const encoded = us.encodePayload(JSON.stringify(payload));
  const decoded = JSON.parse(
    decodeURIComponent(escape(Buffer.from(encoded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('binary')))
  );
  assert.deepEqual(decoded, payload);
});

/* --------------------------------------------------------- handoff target */

test('the shipped copy of the userscript matches the source at the repo root', () => {
  // public/userscripts/ is what the built site serves for direct install; the
  // root copy is what the suite and reviewers read. They drift silently if the
  // public copy is not refreshed, so compare the bytes.
  const rootPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../ubg-labkom-helper.user.js');
  const publicPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../public/userscripts/ubg-labkom-helper.user.js'
  );
  assert.equal(
    readFileSync(publicPath, 'utf8'),
    readFileSync(rootPath, 'utf8'),
    'public/userscripts/ubg-labkom-helper.user.js must be a copy of the root file'
  );
});

test('APP_BASE_URL is the canonical domain that avoids the 307 redirect', () => {
  // ubgjadwal.vercel.app answers 307 -> ubgschedule.vercel.app, so a handoff
  // built on the old host spends a redirect before the app ever boots. Pin the
  // destination here; a revert to the alias fails this test rather than
  // silently reintroducing the bounce for every user.
  assert.equal(us.APP_BASE_URL, 'https://ubgschedule.vercel.app/');
  assert.ok(!/ubgjadwal/.test(us.APP_BASE_URL), 'the redirecting alias must not come back');
  assert.ok(us.APP_BASE_URL.endsWith('/'), 'the base must end in / so bridgeUrl needs no join');
});

test('bridgeUrl puts the payload on the canonical origin', () => {
  const payload = us.buildPayloadFromCards([
    {
      title: 'Pemrograman Web',
      text: cardText({ title: 'Pemrograman Web', code: 'IF184201', kelas: 'A', hari: 'Senin', jam: '08.00-09.40', ruang: 'R.301', keterangan: 'TEORI' }),
      matches: [{ code: 'IF184201', kelas: 'A' }],
    },
  ]);
  const url = us.bridgeUrl(payload);
  assert.ok(url.startsWith('https://ubgschedule.vercel.app/#bridge='), url.slice(0, 60));
  // The hash must survive as a fragment, not a query: the app reads location.hash.
  assert.ok(!url.includes('?...'), 'the payload belongs in the fragment');
  assert.ok(url.includes('#bridge='));
  const encodedPart = url.slice(url.indexOf('#bridge=') + '#bridge='.length);
  assert.ok(encodedPart.length > 0, 'the hash must carry a payload');
  assert.ok(!/[+/=]/.test(encodedPart), 'the payload must stay URL-safe');
});

/* ------------------------------------------- bridge hand-off, end to end */

/*
 * The full path the student takes: the portal's own DOM shape in, a decoded
 * bridge payload out, then the result step's grouping and clash pass over it.
 *
 * This is the check that would have caught the reported fault. Every card on the
 * portal sits under a day section and prints no day of its own, so before the
 * fix every row arrived with Hari '', the result step drew nothing under JADWAL
 * AKHIR, and all 17 rows were bucketed onto one empty day and reported as
 * mutually clashing.
 */
test('a portal-shaped DOM hands over rows that land on their real days', async () => {
  const { dayGroups } = await import('../src/utils/hari.ts');
  const { findCollisions } = await import('../src/utils/collision.ts');

  // Two day sections, one with two cards, one with a card that prints no day.
  const sectionA = makeDaySection('SENIN', [
    { title: 'Pemrograman Web', meta: 'KODE MK: IF184201 KELAS: A JAM: 08.00-09.40 RUANG: R.301 KETERANGAN: TEORI' },
    { title: 'Basis Data', meta: 'KODE MK: TI2019 KELAS: B JAM: 10.00-11.40 RUANG: R.302 KETERANGAN: TEORI' },
  ]);
  const sectionC = makeDaySection('RABU', [
    { title: 'Jaringan Komputer', meta: 'KODE MK: TI2020 KELAS: A JAM: 08.00-09.40 RUANG: LAB 1 KETERANGAN: PRAKTIKUM' },
  ]);

  const cards = [...sectionA.cardNodes, ...sectionC.cardNodes].map((el) => ({
    el,
    title: el.querySelectorAll('h4')[0].textContent,
    text: el.textContent.replace(/\s+/g, ' ').trim(),
    matches: [{ code: 'IF184201', kelas: 'A' }],
  }));

  const payload = us.buildPayloadFromCards(cards);
  assert.equal(payload.theory.length, 2, 'the two theory cards come through');
  assert.equal(payload.praktikum.length, 1, 'the lab card comes through');

  // Every row carries the day from its own section, not an empty string.
  assert.deepEqual(
    payload.theory.map((r) => r.Hari),
    ['Senin', 'Senin'],
    'both theory cards sit under the SENIN section'
  );
  assert.equal(payload.praktikum[0].hari, 'Rabu');

  // Grouped the way the result step groups them: one heading per real day.
  const rows = [
    ...payload.theory.map((r) => ({ id: r.id, hari: r.Hari, jam: r.Jam })),
    ...payload.praktikum.map((r) => ({ id: r.id, hari: r.hari, jam: r.jam })),
  ];
  assert.deepEqual(dayGroups(rows).map((g) => g.hari), ['Senin', 'Rabu']);

  // Senin 08.00-09.40 and Rabu 08.00-09.40 are the same slot on different days:
  // no clash. The two Senin rows do not overlap either.
  assert.deepEqual([...findCollisions(rows)], [], 'no clash on this schedule');
});

test('a merged day heading that welds to its count still resolves', () => {
  // The real section text from the user's DevTools dump: the heading is welded
  // to the section's card count, and reads 'SENIN159 Sesi Perkuliahan...'.
  const { section, cardNodes } = makeDaySection('SENIN', [
    { title: 'Pemrograman Web', meta: 'KODE MK: IF184201 KELAS: A JAM: 08.00-09.40 RUANG: R.301' },
  ]);
  assert.ok(section.textContent.includes('SENIN159'), 'the section really is welded');
  assert.equal(us.resolveDayForCard(cardNodes[0]), 'Senin');
});
