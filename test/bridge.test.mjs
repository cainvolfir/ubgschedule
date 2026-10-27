import test from 'node:test';
import assert from 'node:assert/strict';

/*
 * Bridge import checks (Jalur 2).
 *
 * The decoder and the store writer are pure, so they run under node. The store
 * is stubbed with plain recorders: this file verifies what the importer DOES to
 * the store, which is the part most likely to drift from what the userscript
 * sends.
 */
import {
  base64UrlDecode,
  normalizeTheoryRow,
  normalizePraktikumRow,
  parseBridgePayload,
  decodeBridgeHash,
  readBridgeFromHash,
  clearBridgeHash,
  applyBridgeToStore,
  importScheduleFromHash,
} from '../src/utils/bridge.ts';

/** Encode exactly the way the userscript does: UTF-8 JSON -> URL-safe base64. */
function encodePayload(payload) {
  const json = JSON.stringify(payload);
  const utf8 = unescape(encodeURIComponent(json));
  return Buffer.from(utf8, 'binary')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const theoryRow = (id, overrides = {}) => ({
  id,
  KodeMK: 'IF184201',
  MataKuliah: 'Pemrograman Web',
  Kelas: 'A',
  SKS: '3',
  SMT: '3',
  DosenPengampuh: 'Dosen Satu',
  Hari: 'Senin',
  Jam: '08.00-09.40',
  Ruang: 'R.301',
  Keterangan: '-',
  ...overrides,
});

const labRow = (id, overrides = {}) => ({
  id,
  courseName: 'Praktikum Pemrograman Web',
  kelas: 'A',
  keterangan: 'PRAKTIKUM - Kelompok A1',
  dosen: 'Asisten Satu',
  semester: '3',
  hari: 'Rabu',
  jam: '10.00-11.40',
  ruang: 'LAB 1',
  kodeMk: 'IF184201',
  ...overrides,
});

const payload = (overrides = {}) => ({
  version: 1,
  source: 'labkom.ubg.ac.id',
  generatedAt: '2026-10-27T00:00:00.000Z',
  theory: [theoryRow('bridge-theory-0')],
  praktikum: [labRow('bridge-lab-0')],
  ...overrides,
});

/** A store recorder that captures every call and returns a snapshot. */
function stubStore() {
  const calls = [];
  const state = {
    setScheduleMode: (v) => calls.push(['setScheduleMode', v]),
    setDataTeoriMentah: (v) => calls.push(['setDataTeoriMentah', v]),
    setJadwalTeoriTerpilih: (v) => calls.push(['setJadwalTeoriTerpilih', v]),
    setSelectedTheoryRowIds: (v) => calls.push(['setSelectedTheoryRowIds', v]),
    setPraktikumCandidates: (v) => calls.push(['setPraktikumCandidates', v]),
    setSelectedCandidateIds: (v) => calls.push(['setSelectedCandidateIds', v]),
    setParsedCourseCodes: (v) => calls.push(['setParsedCourseCodes', v]),
    selectAllCourses: (v) => calls.push(['selectAllCourses', v]),
    setWizardStep: (v) => calls.push(['setWizardStep', v]),
  };
  const named = (name) => calls.find((c) => c[0] === name)?.[1];
  return { store: { getState: () => state }, calls, named };
}

/* --------------------------------------------------------------- decoding */

test('base64UrlDecode round-trips what the userscript encodes', () => {
  const json = JSON.stringify({ MataKuliah: 'Pemrograman Web' });
  assert.equal(base64UrlDecode(encodePayload({ MataKuliah: 'Pemrograman Web' })), json);
});

test('base64UrlDecode handles UTF-8 course names', () => {
  const name = 'Pemrograman Berorientasi Objek — Lanjut';
  const decoded = JSON.parse(base64UrlDecode(encodePayload({ MataKuliah: name })));
  assert.equal(decoded.MataKuliah, name);
});

test('base64UrlDecode rejects a value that is not base64', () => {
  assert.throws(() => base64UrlDecode('not!!valid!!base64'), /base64/);
  assert.equal(base64UrlDecode(''), '');
});

test('base64UrlDecode undoes the URL-safe alphabet the userscript applies', () => {
  /*
   * Ordinary course data never emits '+' or '/' in base64 (every byte is ASCII,
   * and those symbols can only come from a third byte of '?', '>' or '~'), so a
   * realistic payload would leave the '-'/'_' remap untested. This input forces
   * both: base64('~~~???') is 'fn5+Pz8/'. If the transform ever stops being
   * undone, this fails instead of silently corrupting every handoff.
   */
  const raw = '~~~???';
  const standard = Buffer.from(raw, 'binary').toString('base64');
  assert.ok(standard.includes('+') && standard.includes('/'), 'input must produce both symbols');
  const urlSafe = standard.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assert.equal(base64UrlDecode(urlSafe), raw);
});

test('base64UrlDecode restores stripped padding', () => {
  // Encoders strip '='; a length not divisible by 4 only decodes once it is back.
  for (const raw of ['{"a":1}', 'ab', 'a', 'abcde']) {
    const stripped = Buffer.from(raw, 'binary')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    assert.equal(base64UrlDecode(stripped), raw, `raw: ${JSON.stringify(raw)}`);
  }
});

/* ---------------------------------------------------------- row normalisation */

test('normalizeTheoryRow fills missing fields with empty strings', () => {
  const row = normalizeTheoryRow({ MataKuliah: 'Jaringan Komputer' });
  assert.equal(row.MataKuliah, 'Jaringan Komputer');
  assert.equal(row.KodeMK, '');
  assert.equal(row.Kelas, '');
  assert.equal(row.Ruang, '');
  assert.equal(row.Keterangan, '');
});

test('normalizeTheoryRow trims strings and coerces numbers', () => {
  const row = normalizeTheoryRow({ MataKuliah: '  Pemrograman Web  ', KodeMK: ' IF184201 ', SKS: 3 });
  assert.equal(row.MataKuliah, 'Pemrograman Web');
  assert.equal(row.KodeMK, 'IF184201');
  assert.equal(row.SKS, '3');
});

test('normalizeTheoryRow rejects a row without a course name', () => {
  assert.equal(normalizeTheoryRow({ KodeMK: 'IF184201' }), null);
  assert.equal(normalizeTheoryRow({ MataKuliah: '   ' }), null);
  assert.equal(normalizeTheoryRow(null), null);
  assert.equal(normalizeTheoryRow('nonsense'), null);
});

test('normalizeTheoryRow mints a fallback id when the payload omits one', () => {
  assert.equal(normalizeTheoryRow({ MataKuliah: 'X', KodeMK: 'IF1' }).id, 'bridge-theory-IF1');
  assert.equal(normalizeTheoryRow({ MataKuliah: 'X' }).id, 'bridge-theory-X');
});

test('normalizePraktikumRow rejects a row without a course name', () => {
  assert.equal(normalizePraktikumRow({ kelas: 'A' }), null);
  assert.equal(normalizePraktikumRow(undefined), null);
  const row = normalizePraktikumRow({ courseName: 'Praktikum X', kelas: 'A' });
  assert.equal(row.courseName, 'Praktikum X');
  assert.equal(row.kodeMk, '');
});

/* ------------------------------------------------------------ payload parse */

test('parseBridgePayload reads both arrays', () => {
  const parsed = parseBridgePayload(JSON.stringify(payload()));
  assert.equal(parsed.theory.length, 1);
  assert.equal(parsed.praktikum.length, 1);
  assert.equal(parsed.theory[0].MataKuliah, 'Pemrograman Web');
  assert.equal(parsed.praktikum[0].ruang, 'LAB 1');
  assert.equal(parsed.source, 'labkom.ubg.ac.id');
});

test('parseBridgePayload drops individually bad rows instead of failing', () => {
  const parsed = parseBridgePayload(
    JSON.stringify(payload({ theory: [theoryRow('t1'), { KodeMK: 'X' }, null], praktikum: [] }))
  );
  assert.deepEqual(parsed.theory.map((r) => r.id), ['t1']);
});

test('parseBridgePayload dedupes rows that share an id', () => {
  const parsed = parseBridgePayload(
    JSON.stringify(
      payload({ theory: [theoryRow('same', { MataKuliah: 'Pertama' }), theoryRow('same', { MataKuliah: 'Kedua' })] })
    )
  );
  assert.equal(parsed.theory.length, 1);
  assert.equal(parsed.theory[0].MataKuliah, 'Pertama');
});

test('parseBridgePayload rejects malformed JSON and shapeless payloads', () => {
  assert.throws(() => parseBridgePayload('{not json'), /JSON/);
  assert.throws(() => parseBridgePayload('[]'), /objek jadwal/);
  assert.throws(() => parseBridgePayload('"text"'), /objek jadwal/);
});

test('parseBridgePayload rejects a payload with no usable rows', () => {
  assert.throws(() => parseBridgePayload(JSON.stringify(payload({ theory: [], praktikum: [] }))), /tidak berisi jadwal/);
  assert.throws(() => parseBridgePayload(JSON.stringify({ theory: [{}], praktikum: [] })), /tidak berisi jadwal/);
});

test('parseBridgePayload tolerates missing or wrong-typed arrays', () => {
  const theoryOnly = parseBridgePayload(JSON.stringify({ theory: [theoryRow('t1')] }));
  assert.equal(theoryOnly.praktikum.length, 0);
  assert.equal(theoryOnly.version, 1, 'a missing version falls back to the current one');
  assert.equal(theoryOnly.source, 'labkom.ubg.ac.id');
  const labOnly = parseBridgePayload(JSON.stringify({ praktikum: [labRow('l1')], theory: 'nope' }));
  assert.equal(labOnly.theory.length, 0);
  assert.equal(labOnly.praktikum.length, 1);
});

/* -------------------------------------------------------------- hash reading */

test('readBridgeFromHash returns null when the hash carries no payload', () => {
  assert.equal(readBridgeFromHash(''), null);
  assert.equal(readBridgeFromHash('#'), null);
  assert.equal(readBridgeFromHash('#something-else'), null);
  assert.equal(readBridgeFromHash('#bridge='), null);
});

test('readBridgeFromHash decodes a payload from the hash', () => {
  const decoded = readBridgeFromHash('#bridge=' + encodePayload(payload()));
  assert.equal(decoded.theory.length, 1);
  assert.equal(decoded.praktikum.length, 1);
});

test('readBridgeFromHash throws on a corrupted but well-shaped hash', () => {
  assert.throws(() => readBridgeFromHash('#bridge=!!!not-base64!!!'), /base64/);
});

test('decodeBridgeHash accepts a bare value as well as a full hash', () => {
  const encoded = encodePayload(payload());
  assert.equal(decodeBridgeHash(encoded).theory.length, 1);
  assert.equal(decodeBridgeHash('#bridge=' + encoded).theory.length, 1);
  assert.throws(() => decodeBridgeHash(''), /kosong/);
});

/* ------------------------------------------------------------- hash clearing */

test('clearBridgeHash removes only the hash and keeps path and query', () => {
  const calls = [];
  const history = { replaceState: (...args) => calls.push(args) };
  clearBridgeHash({ pathname: '/jadwal', search: '?x=1' }, history);
  assert.deepEqual(calls, [[null, '', '/jadwal?x=1']]);
});

test('clearBridgeHash survives a history API that refuses to replace', () => {
  const history = {
    replaceState() {
      throw new Error('SecurityError');
    },
  };
  assert.doesNotThrow(() => clearBridgeHash({ pathname: '/', search: '' }, history));
});

/* ------------------------------------------------------------- store writing */

test('applyBridgeToStore populates every field the result step reads', () => {
  const { store, named } = stubStore();
  applyBridgeToStore(payload(), store);

  assert.deepEqual(named('setJadwalTeoriTerpilih').map((r) => r.id), ['bridge-theory-0']);
  assert.deepEqual(named('setSelectedTheoryRowIds'), ['bridge-theory-0']);
  assert.deepEqual(named('setPraktikumCandidates').map((c) => c.id), ['bridge-lab-0']);
  assert.deepEqual(named('setSelectedCandidateIds'), ['bridge-lab-0']);
  assert.deepEqual(named('setDataTeoriMentah').map((r) => r.id), ['bridge-theory-0']);
});

test('applyBridgeToStore lands on step 3 and selects every imported row', () => {
  const { store, named } = stubStore();
  applyBridgeToStore(payload(), store);
  assert.equal(named('setWizardStep'), 3);
  assert.equal(named('setScheduleMode'), 'auto-codes');
  // A finished selection arrives fully chosen: the step-3 screen filters the
  // practical pool by selectedCandidateIds, so an empty list would show nothing.
  assert.equal(named('setSelectedCandidateIds').length, named('setPraktikumCandidates').length);
  assert.equal(named('setSelectedTheoryRowIds').length, named('setJadwalTeoriTerpilih').length);
});

test('applyBridgeToStore fills the step-2 selection maps per course code', () => {
  const { store, named } = stubStore();
  applyBridgeToStore(
    parseBridgePayload(
      JSON.stringify({
        theory: [theoryRow('t1', { KodeMK: 'IF184201' }), theoryRow('t2', { KodeMK: 'TI2019' })],
        praktikum: [labRow('l1', { kodeMk: 'IF184201' }), labRow('l2', { kodeMk: 'IF184201' })],
      })
    ),
    store
  );
  const selections = named('selectAllCourses');
  assert.deepEqual(selections.theorySelections, { IF184201: ['t1'], TI2019: ['t2'] });
  assert.deepEqual(selections.labSelections, { IF184201: ['l1', 'l2'] });
  assert.deepEqual(named('setParsedCourseCodes'), ['IF184201', 'TI2019']);
});

test('applyBridgeToStore falls back to the course name when a code is missing', () => {
  const { store, named } = stubStore();
  applyBridgeToStore(
    parseBridgePayload(
      JSON.stringify({ theory: [theoryRow('t1', { KodeMK: '' })], praktikum: [labRow('l1', { kodeMk: '' })] })
    ),
    store
  );
  const selections = named('selectAllCourses');
  assert.deepEqual(Object.keys(selections.theorySelections), ['Pemrograman Web']);
  assert.deepEqual(Object.keys(selections.labSelections), ['Praktikum Pemrograman Web']);
});

test('applyBridgeToStore clears the hash so a reload cannot re-import it', () => {
  const { store } = stubStore();
  const calls = [];
  const environment = {
    location: { hash: '#bridge=x', pathname: '/', search: '' },
    history: { replaceState: (...args) => calls.push(args) },
  };
  applyBridgeToStore(payload(), store, environment);
  assert.equal(calls.length, 1, 'the hash must be replaced exactly once');
  assert.equal(calls[0][2], '/');
});

test('applyBridgeToStore needs no environment when none is supplied', () => {
  const { store, named } = stubStore();
  assert.doesNotThrow(() => applyBridgeToStore(payload(), store, null));
  assert.equal(named('setWizardStep'), 3);
});

test('importScheduleFromHash applies a hash payload and clears the hash', () => {
  const { store, named } = stubStore();
  const calls = [];
  const environment = {
    location: { hash: '#bridge=' + encodePayload(payload()), pathname: '/', search: '' },
    history: { replaceState: (...args) => calls.push(args) },
  };
  assert.equal(importScheduleFromHash(store, undefined, environment), true);
  assert.equal(named('setWizardStep'), 3);
  assert.equal(calls.length, 1);
});

test('importScheduleFromHash reports a broken payload instead of throwing', () => {
  const { store, named } = stubStore();
  const messages = [];
  const environment = {
    location: { hash: '#bridge=!!!not-base64!!!', pathname: '/', search: '' },
    history: { replaceState: () => {} },
  };
  assert.equal(importScheduleFromHash(store, (m) => messages.push(m), environment), false);
  assert.equal(messages.length, 1);
  assert.match(messages[0], /base64/);
  assert.equal(named('setWizardStep'), undefined, 'a broken payload must not move the wizard');
});

test('importScheduleFromHash is a no-op when the hash carries no payload', () => {
  const { store, calls } = stubStore();
  const environment = {
    location: { hash: '', pathname: '/', search: '' },
    history: { replaceState: () => {} },
  };
  assert.equal(importScheduleFromHash(store, undefined, environment), false);
  assert.deepEqual(calls, []);
});

test('a theory-only payload still reaches step 3', () => {
  const { store, named } = stubStore();
  applyBridgeToStore(parseBridgePayload(JSON.stringify({ theory: [theoryRow('t1')] })), store, null);
  assert.equal(named('setWizardStep'), 3);
  assert.deepEqual(named('setSelectedCandidateIds'), []);
});
