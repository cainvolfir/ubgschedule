import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCode,
  normalizeCourseCodes,
  normalizeCourseName,
  romanToDigit,
  findMatchingRows,
  matchPraktikumForCourse,
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
