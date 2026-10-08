import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCode,
  normalizeCourseCodes,
  normalizeCourseName,
  romanToDigit,
  findMatchingRows,
  matchPraktikumForCourse,
  isLabRow,
  theoryRowToPraktikumCandidate,
  filterPraktikumByKelas,
  dedupeById,
} from '../src/utils/courseCode.ts';

test('romanToDigit maps Roman numerals to Arabic strings', () => {
  assert.equal(romanToDigit('I'), '1');
  assert.equal(romanToDigit('ii'), '2');
  assert.equal(romanToDigit('III'), '3');
  assert.equal(romanToDigit('IV'), '4');
  assert.equal(romanToDigit('v'), '5');
  assert.equal(romanToDigit('VI'), '6');
  assert.equal(romanToDigit('VII'), '7');
  assert.equal(romanToDigit('VIII'), '8');
  assert.equal(romanToDigit('IX'), '9');
  assert.equal(romanToDigit('X'), '10');
  assert.equal(romanToDigit('UNKNOWN'), 'UNKNOWN');
});

test('normalizeCourseName strips lab suffixes and punctuation', () => {
  assert.equal(normalizeCourseName('PRAKTIKUM PEMROGRAMAN WEB'), 'pemrogramanweb');
  assert.equal(normalizeCourseName('Pemrograman Web (Lab)'), 'pemrogramanweb');
  assert.equal(normalizeCourseName('Struktur Data - Praktikum'), 'strukturdata');
  assert.equal(normalizeCourseName('BASIS DATA II'), 'basisdata2');
});

test('matchPraktikumForCourse matches by KodeMK or normalized course name and class letter', () => {
  const theory = {
    id: 't-1',
    KodeMK: 'IF1234',
    MataKuliah: 'Pemrograman Web',
    Kelas: 'A',
    SKS: '2',
    SMT: '3',
    DosenPengampuh: 'Dosen A',
    Hari: 'Senin',
    Jam: '08.00-09.40',
    Ruang: 'R.301',
    Keterangan: '',
  };

  const praktikumCandidates = [
    {
      id: 'p-1',
      courseName: 'Praktikum Pemrograman Web',
      kelas: 'A',
      keterangan: 'Kelompok A1',
      dosen: 'Asisten 1',
      semester: '3',
      hari: 'Selasa',
      jam: '10.00-11.40',
      ruang: 'LAB 1',
    },
    {
      id: 'p-2',
      courseName: 'Praktikum Pemrograman Web',
      kelas: 'A',
      keterangan: 'Kelompok A2',
      dosen: 'Asisten 2',
      semester: '3',
      hari: 'Rabu',
      jam: '10.00-11.40',
      ruang: 'LAB 2',
    },
    {
      id: 'p-3',
      courseName: 'Praktikum Pemrograman Web',
      kelas: 'B',
      keterangan: 'Kelompok B1',
      dosen: 'Asisten 1',
      semester: '3',
      hari: 'Kamis',
      jam: '10.00-11.40',
      ruang: 'LAB 1',
    },
  ];

  const matched = matchPraktikumForCourse(theory, praktikumCandidates);
  assert.equal(matched.length, 2);
  assert.equal(matched[0].id, 'p-1');
  assert.equal(matched[1].id, 'p-2');
});

test('matchPraktikumForCourse matches by KodeMK when available', () => {
  const theory = {
    id: 't-2',
    KodeMK: 'TI201',
    MataKuliah: 'Jaringan Komputer',
    Kelas: 'B',
  };

  const praktikumCandidates = [
    {
      id: 'p-10',
      KodeMK: 'TI201',
      courseName: 'Lab Jarkom Dasar',
      kelas: 'B',
      keterangan: 'Kelompok B1',
    },
    {
      id: 'p-11',
      KodeMK: 'TI202',
      courseName: 'Lab Jarkom Lanjut',
      kelas: 'B',
      keterangan: 'Kelompok B1',
    },
    {
      id: 'p-12',
      KodeMK: 'TI201',
      courseName: 'Lab Jarkom Dasar',
      kelas: 'A',
      keterangan: 'Kelompok A1',
    },
  ];

  const matched = matchPraktikumForCourse(theory, praktikumCandidates);
  assert.equal(matched.length, 1);
  assert.equal(matched[0].id, 'p-10');
});

test('isLabRow detects embedded praktikum rows across keterangan, ruang and name', () => {
  assert.equal(isLabRow({ MataKuliah: 'Pemrograman Web', Ruang: 'R.301', Keterangan: '-' }), false);
  assert.equal(isLabRow({ MataKuliah: 'Pemrograman Web', Ruang: 'R.301', Keterangan: 'Praktikum - Kelompok A1' }), true);
  assert.equal(isLabRow({ MataKuliah: 'Pemrograman Web', Ruang: 'LAB 1', Keterangan: '-' }), true);
  assert.equal(isLabRow({ MataKuliah: 'Praktikum Pemrograman Web', Ruang: 'R.301', Keterangan: '-' }), true);
});

test('theoryRowToPraktikumCandidate maps fields into a PraktikumCandidate', () => {
  const row = {
    id: 'x-1',
    KodeMK: 'IF1234',
    MataKuliah: 'Praktikum Pemrograman Web',
    Kelas: 'A',
    SKS: '1',
    SMT: '3',
    DosenPengampuh: 'Asisten 1',
    Hari: 'Selasa',
    Jam: '10.00-11.40',
    Ruang: 'LAB 1',
    Keterangan: 'Praktikum - Kelompok A1',
  };
  const cand = theoryRowToPraktikumCandidate(row);
  assert.equal(cand.id, 'x-1');
  assert.equal(cand.courseName, 'Praktikum Pemrograman Web');
  assert.equal(cand.kelas, 'A');
  assert.equal(cand.kodeMk, 'IF1234');
  assert.equal(cand.ruang, 'LAB 1');
  assert.equal(cand.keterangan, 'Praktikum - Kelompok A1');
});

test('filterPraktikumByKelas links a section to its sub-groups', () => {
  const candidates = [
    { id: 'a1', courseName: 'Praktikum X', kelas: 'A', keterangan: 'Kelompok A1' },
    { id: 'a2', courseName: 'Praktikum X', kelas: 'A', keterangan: 'Kelompok A2' },
    { id: 'b1', courseName: 'Praktikum X', kelas: 'B', keterangan: 'Kelompok B1' },
    { id: 'aplain', courseName: 'Praktikum X', kelas: 'A', keterangan: 'Praktikum' },
  ];
  const filtered = filterPraktikumByKelas(candidates, 'A');
  assert.deepEqual(filtered.map((c) => c.id), ['a1', 'a2', 'aplain']);
  // 'Kelas A' prefix should normalize too.
  assert.deepEqual(filterPraktikumByKelas(candidates, 'Kelas A').map((c) => c.id), ['a1', 'a2', 'aplain']);
  assert.equal(filterPraktikumByKelas(candidates, '').length, 0);
});

test('dedupeById removes duplicate candidate ids preserving order', () => {
  const items = [{ id: '1' }, { id: '2' }, { id: '1' }, { id: '3' }];
  assert.deepEqual(dedupeById(items).map((i) => i.id), ['1', '2', '3']);
});
