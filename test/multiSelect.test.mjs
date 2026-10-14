import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectTheoryRows,
  collectLabCandidates,
  uniqueKelasOf,
  selectByKelas,
  buildSingleSectionSelections,
} from '../src/utils/courseCode.ts';

function theory(id, kodeMk, kelas, overrides = {}) {
  return {
    id,
    KodeMK: kodeMk,
    MataKuliah: 'Pemrograman Web',
    Kelas: kelas,
    SKS: '3',
    SMT: '3',
    DosenPengampuh: 'Dosen ' + kelas,
    Hari: 'Senin',
    Jam: '08.00-09.40',
    Ruang: 'R.301',
    Keterangan: '',
    ...overrides,
  };
}

function labRow(id, kodeMk, kelas, keterangan) {
  return theory(id, kodeMk, kelas, {
    MataKuliah: 'Praktikum Pemrograman Web',
    Keterangan: keterangan,
    Ruang: 'LAB 1',
    Jam: '10.00-11.40',
  });
}

function candidate(id, kodeMk, kelas, keterangan) {
  return {
    id,
    courseName: 'Praktikum Pemrograman Web',
    kelas,
    keterangan,
    dosen: 'Asisten ' + kelas,
    semester: '3',
    hari: 'Selasa',
    jam: '10.00-11.40',
    ruang: 'LAB 1',
    kodeMk,
  };
}

test('collectTheoryRows returns every non-lab section of a course', () => {
  const data = [
    theory('t-a', 'IF1234', 'A'),
    theory('t-b', 'IF1234', 'B'),
    labRow('t-a1', 'IF1234', 'A', 'Praktikum - Kelompok A1'),
    theory('t-other', 'ZZ9999', 'A'),
  ];
  assert.deepEqual(collectTheoryRows('IF1234', data).map((r) => r.id), ['t-a', 't-b']);
  assert.deepEqual(collectTheoryRows('ZZ9999', data).map((r) => r.id), ['t-other']);
  assert.deepEqual(collectTheoryRows('NOPE', data), []);
});

test('uniqueKelasOf lists distinct sorted class letters', () => {
  const rows = [theory('1', 'K', 'B'), theory('2', 'K', 'A'), theory('3', 'K', 'B')];
  assert.deepEqual(uniqueKelasOf(rows), ['A', 'B']);
  assert.deepEqual(uniqueKelasOf([]), []);
});

test('collectLabCandidates merges embedded lab rows with the uploaded pool', () => {
  const data = [
    theory('t-a', 'IF1234', 'A'),
    theory('t-b', 'IF1234', 'B'),
    labRow('e-a1', 'IF1234', 'A', 'Praktikum - Kelompok A1'),
  ];
  const pool = [
    candidate('p-a1', 'IF1234', 'A', 'Kelompok A1'),
    candidate('p-a2', 'IF1234', 'A', 'Kelompok A2'),
    candidate('p-b1', 'IF1234', 'B', 'Kelompok B1'),
    candidate('p-x', 'OTHER9', 'A', 'Kelompok A1'),
    candidate('p-a1', 'IF1234', 'A', 'Kelompok A1'),
  ];
  const ids = collectLabCandidates('IF1234', data, pool).map((c) => c.id);
  // Embedded row first, then matching pool entries, deduped, foreign course excluded.
  assert.deepEqual(ids, ['e-a1', 'p-a1', 'p-a2', 'p-b1']);
});

test('collectLabCandidates exposes embedded lab rows even without a pool', () => {
  const data = [theory('t-a', 'IF1234', 'A'), labRow('e-a1', 'IF1234', 'A', 'Kelompok A1')];
  assert.deepEqual(
    collectLabCandidates('IF1234', data).map((c) => c.id),
    ['e-a1']
  );
});

test('selectByKelas pulls the section letter plus its practical sub-groups', () => {
  const theoryRows = [theory('t-a', 'IF1234', 'A'), theory('t-b', 'IF1234', 'B')];
  const labs = [
    candidate('p-a1', 'IF1234', 'A', 'Kelompok A1'),
    candidate('p-a2', 'IF1234', 'A', 'Kelompok A2'),
    candidate('p-b1', 'IF1234', 'B', 'Kelompok B1'),
  ];
  assert.deepEqual(selectByKelas('A', theoryRows, labs), {
    theoryIds: ['t-a'],
    labIds: ['p-a1', 'p-a2'],
  });
  assert.deepEqual(selectByKelas('B', theoryRows, labs), {
    theoryIds: ['t-b'],
    labIds: ['p-b1'],
  });
  assert.deepEqual(selectByKelas('', theoryRows, labs), { theoryIds: [], labIds: [] });
  assert.deepEqual(selectByKelas('Z', theoryRows, labs), { theoryIds: [], labIds: [] });
});

test('buildSingleSectionSelections only pre-selects one-section courses', () => {
  const data = [
    theory('s-1', 'ONE111', 'A'),
    theory('m-a', 'MULT22', 'A'),
    theory('m-b', 'MULT22', 'B'),
    labRow('s-lab', 'ONE111', 'A', 'Kelompok A1'),
  ];
  const result = buildSingleSectionSelections(['ONE111', 'MULT22', 'MISSIN'], data);
  assert.deepEqual(result.theorySelections, { ONE111: ['s-1'] });
  assert.deepEqual(result.labSelections, { ONE111: ['s-lab'] });
});