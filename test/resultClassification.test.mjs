import test from 'node:test';
import assert from 'node:assert/strict';

// The store reads window.localStorage at import time; polyfill before importing it.
const storage = new Map();
const ls = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, v),
  removeItem: (k) => storage.delete(k),
};
globalThis.localStorage = ls;
globalThis.window = { localStorage: ls };

import {
  isLabRow,
  isLabLabel,
  isPraktikumClass,
  hasGroupLabel,
  parseKelasCell,
  buildTheoryKeterangan,
  collectTheoryRows,
  collectLabCandidates,
} from '../src/utils/courseCode.ts';
import { sanitizeKeterangan } from '../src/store/useJadwalStore.ts';

/**
 * Regression coverage for the result page marking every row as praktikum.
 *
 * Three independent faults produced the symptom and are each pinned here:
 *  1. isLabRow matched 'Praktisi' (a practitioner lecturer) and 'Praktek
 *     Peradilan' (a law theory course) because LAB_LABEL had no right boundary.
 *  2. The result-page predicate matched 'Kelompok Semua Mhs' because
 *     'S' is in [A-Z].
 *  3. Stale persisted data still carried '- Kelompok Semua Mhs' in Keterangan.
 */

const theoryRow = (overrides = {}) => ({
  id: 't-1',
  KodeMK: 'HK1101',
  MataKuliah: 'Hukum Perdata',
  Kelas: 'A',
  SKS: '2',
  SMT: '3',
  DosenPengampuh: 'Dosen A',
  Hari: 'Senin',
  Jam: '08.00-09.40',
  Ruang: 'R.301',
  Keterangan: 'TEORI - Jadwal Teori (2T) dari Akademik',
  ...overrides,
});

// --- Fix 1: whole-word lab markers -----------------------------------------

test('isLabLabel only matches whole-word lab markers', () => {
  assert.equal(isLabLabel('Praktikum'), true);
  assert.equal(isLabLabel('LAB 1'), true);
  assert.equal(isLabLabel('Laboratorium Komputer'), true);
  assert.equal(isLabLabel('Labkom Dasar'), true);
  assert.equal(isLabLabel('Prak. Basis Data'), true);

  // Prefixes of unrelated words must not match.
  assert.equal(isLabLabel('Praktisi'), false);
  assert.equal(isLabLabel('Praktek Peradilan Perdata'), false);
  assert.equal(isLabLabel('Ranto Rinaldi, S.Sn (Praktisi)'), false);
});

test('a law theory course named Praktek Peradilan stays theory', () => {
  const row = theoryRow({
    MataKuliah: 'PRAKTEK PERADILAN PERDATA**',
    Ruang: 'PS',
    Keterangan: 'TEORI - Jadwal Teori (2T) dari Akademik',
  });
  assert.equal(isLabRow(row), false);
});

test('a practitioner lecturer in Keterangan does not flip a row to lab', () => {
  const row = theoryRow({
    MataKuliah: 'Teori Dasar Musik',
    Ruang: 'Tutorial 4',
    Keterangan: 'TEORI - Baiq Larre G, S.Pd & Ranto Rinaldi, S.Sn (Praktisi)',
  });
  assert.equal(isLabRow(row), false);
});

test('genuine praktikum rows are still detected', () => {
  // Explicit combined-portal row type.
  assert.equal(
    isLabRow(theoryRow({ Keterangan: 'PRAKTIKUM LAB - - - Kelompok A1', Ruang: 'LAB 1' })),
    true
  );
  // Lab room is decisive even with a stale whole-cohort marker.
  assert.equal(
    isLabRow(theoryRow({ Keterangan: '- Kelompok Semua Mhs', Ruang: 'LAB 1' })),
    true
  );
  assert.equal(
    isLabRow(theoryRow({ Keterangan: 'PRAKTIKUM LAB - - - Kelompok A1' })),
    true
  );
  // Lab-marked course title with no explicit TEORI label.
  assert.equal(
    isLabRow(theoryRow({ MataKuliah: 'Praktikum Pemrograman Web', Keterangan: '-' })),
    true
  );
});

test('explicit TEORI outranks a leftover group marker', () => {
  const row = theoryRow({ Keterangan: 'TEORI - Jadwal Teori (2T) dari Akademik - Kelompok A1' });
  assert.equal(isLabRow(row), false);
});

// --- Fix 2: result-page predicate ------------------------------------------

test('isPraktikumClass never matches a whole-cohort Kelas or a Praktisi name', () => {
  assert.equal(
    isPraktikumClass({
      keterangan: 'TEORI - Jadwal Teori (2T) dari Akademik',
      nama: 'Hukum Perdata',
      ruang: 'R.301',
      kelas: 'Kelas A - Semua Mhs',
    }),
    false
  );
  assert.equal(
    isPraktikumClass({
      keterangan: 'TEORI - ... (Praktisi)',
      nama: 'Solfegio',
      ruang: 'GS3B',
      kelas: 'A',
    }),
    false
  );
  assert.equal(
    isPraktikumClass({
      keterangan: 'TEORI - Jadwal Teori (2T) dari Akademik',
      nama: 'PRAKTEK PERADILAN PIDANA**',
      ruang: 'PS',
      kelas: 'A',
    }),
    false
  );
});

test('isPraktikumClass flags real practical rows and explicit praktikum items', () => {
  assert.equal(
    isPraktikumClass({ keterangan: 'PRAKTIKUM LAB - - - Kelompok A1', nama: 'Basis Data', ruang: 'LAB 1' }),
    true
  );
  assert.equal(isPraktikumClass({ isPraktikum: true, keterangan: '', nama: 'X', ruang: '' }), true);
});

test('isPraktikumClass agrees with isLabRow on every shape', () => {
  // A real lab room outranks a stale 'TEORI' source note (seen in the portal
  // export as Ruang 'LAB' with 'TEORI - Jadwal Teori (2T) dari Akademik').
  const cases = [
    { nama: 'Visual Branding', ruang: 'LAB', keterangan: 'TEORI - A22-23', kelas: 'AB' },
    { nama: 'Hukum Perdata', ruang: 'R.301', keterangan: 'TEORI - Jadwal Teori (2T) dari Akademik', kelas: 'A' },
    { nama: 'PRAKTEK PERADILAN PERDATA**', ruang: 'PS', keterangan: 'TEORI - Jadwal Teori (2T) dari Akademik', kelas: 'A' },
    { nama: 'Solfegio', ruang: 'GS3B', keterangan: 'TEORI - ... (Praktisi)', kelas: 'A' },
    { nama: 'Basis Data', ruang: 'LAB 1', keterangan: 'PRAKTIKUM LAB - - - Kelompok A1', kelas: 'A' },
  ];
  for (const c of cases) {
    assert.equal(
      isPraktikumClass(c),
      isLabRow({ Keterangan: c.keterangan, Ruang: c.ruang, MataKuliah: c.nama }),
      JSON.stringify(c)
    );
  }
});

// --- Fix 3: stale localStorage sanitation ----------------------------------

test('sanitizeKeterangan strips the stale whole-cohort tail', () => {
  assert.equal(
    sanitizeKeterangan('TEORI - Jadwal Teori (2T) dari Akademik - Kelompok Semua Mhs'),
    'TEORI - Jadwal Teori (2T) dari Akademik'
  );
  assert.equal(sanitizeKeterangan('TEORI - MKWK - Semua Mhs'), 'TEORI - MKWK');
  assert.equal(sanitizeKeterangan('TEORI - Semua Mhs'), 'TEORI');
  // A real sub-group label is preserved.
  assert.equal(
    sanitizeKeterangan('PRAKTIKUM LAB - - - Kelompok A1'),
    'PRAKTIKUM LAB - - - Kelompok A1'
  );
  assert.equal(sanitizeKeterangan('-'), '');
});

test('sanitized stale rows become theory again', () => {
  const stale = theoryRow({ Keterangan: 'TEORI - Jadwal Teori (2T) dari Akademik - Kelompok Semua Mhs' });
  // Before sanitation a stale group marker alone would read as lab...
  assert.equal(isLabRow(stale), false, 'explicit TEORI already outranks it');
  // ...and after sanitation no group marker remains at all.
  const clean = { ...stale, Keterangan: sanitizeKeterangan(stale.Keterangan) };
  assert.equal(clean.Keterangan, 'TEORI - Jadwal Teori (2T) dari Akademik');
  assert.equal(isLabRow(clean), false);
});

test('a stale marker on a college-shaped empty Keterangan does not resurrect a group', () => {
  assert.equal(hasGroupLabel('- Kelompok Semua Mhs'), false);
  assert.equal(hasGroupLabel('TEORI - Kelompok Semua Mhs'), false);
});

// --- End-to-end: one theory file splits into theory + praktikum -------------

test('a combined file keeps theory rows as theory and lab rows as praktikum', () => {
  const data = [
    theoryRow({ id: 'th-1', Kelas: 'A', Ruang: 'R.301', Keterangan: 'TEORI - Jadwal Teori (2T) dari Akademik' }),
    theoryRow({
      id: 'th-law',
      MataKuliah: 'PRAKTEK PERADILAN PERDATA**',
      Keterangan: 'TEORI - Jadwal Teori (2T) dari Akademik',
    }),
    theoryRow({
      id: 'lab-1',
      Kelas: 'A',
      Ruang: 'LAB 1',
      Keterangan: 'PRAKTIKUM LAB - - - Kelompok A1',
    }),
  ];

  const theoryIds = collectTheoryRows('HK1101', data).map((r) => r.id);
  assert.ok(theoryIds.includes('th-1'));
  assert.ok(theoryIds.includes('th-law'));
  assert.ok(!theoryIds.includes('lab-1'));

  const labIds = collectLabCandidates('HK1101', data).map((c) => c.id);
  assert.deepEqual(labIds, ['lab-1']);
});

test('parseKelasCell drops the whole-cohort marker and keeps real groups', () => {
  const whole = parseKelasCell('Kelas A - Semua Mhs');
  assert.deepEqual(whole, { kelas: 'A', group: '', wholeClass: true });

  const group = parseKelasCell('Kelas A - Kelompok A1');
  assert.deepEqual(group, { kelas: 'A', group: 'Kelompok A1', wholeClass: false });
});

test('buildTheoryKeterangan never stores a whole-cohort marker', () => {
  assert.equal(
    buildTheoryKeterangan({ jenis: 'TEORI', keterangan: 'Jadwal Teori (2T) dari Akademik', group: 'Semua Mhs' }),
    'TEORI - Jadwal Teori (2T) dari Akademik'
  );
});