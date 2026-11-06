import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { isExamPdfSchedule, parseExamPdfTokens, isCourseCode } from '../src/utils/examPdf.ts';

const JSON_FIXTURE = new URL('./fixtures/examTokens.json', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const PDF_FIXTURE = process.env.EXAM_PDF_FIXTURE
  || 'C:/Users/Cain/AppData/Local/hermes/attachments/Program_Studi_S1_Ilmu_Komputer_Teknik_pdf.pdf';
const hasJsonFixture = existsSync(JSON_FIXTURE);
const hasPdfFixture = existsSync(PDF_FIXTURE);
const hasFixture = hasJsonFixture || hasPdfFixture;

/** A regular lecture export: day header, time after the code, no exam markers. */
const LECTURE_TOKENS = [
  'Jadwal Perkuliahan Semester Ganjil 2026 - 2027',
  '.Perkuliahan Hari Senin',
  'SENIN',
  '08.00-09.40',
  'IF10101',
  'Pengantar Ilmu Komputer',
  '3 SKS',
  'Kelas A',
  '"Azral Satrani, M.Kom"',
  'Ruang GS1A',
];

async function readExamTokens() {
  if (hasJsonFixture) {
    return JSON.parse(readFileSync(JSON_FIXTURE, 'utf-8'));
  }
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(PDF_FIXTURE)) }).promise;
  const tokens = [];
  for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
    const page = await doc.getPage(pageNo);
    const { items } = await page.getTextContent();
    for (const item of items) if ('str' in item) tokens.push(item.str);
  }
  return tokens;
}

const rowsPromise = hasFixture ? readExamTokens().then(parseExamPdfTokens) : null;

test('isCourseCode matches standard UBG course codes', () => {
  assert.equal(isCourseCode('IK1IW31006'), true);
  assert.equal(isCourseCode('ISKK350131'), true);
  assert.equal(isCourseCode('ABC'), false);
  assert.equal(isCourseCode(''), false);
});

test('isExamPdfSchedule recognizes the exam layout', () => {
  const tokens = ['Jadwal Ujian Tengah Semester', '', 'Program Studi: S1 Ilmu Komputer', ''];
  assert.equal(isExamPdfSchedule(tokens), true);
  assert.equal(isExamPdfSchedule(['Header', 'Prodi / Semester / Kelas', 'Dosen']), true);
});

test('isExamPdfSchedule rejects a regular lecture token stream', () => {
  assert.equal(isExamPdfSchedule(LECTURE_TOKENS), false);
  assert.equal(isExamPdfSchedule([]), false);
});

test('parseExamPdfTokens extracts all 177 exam rows from the fixture', { skip: !hasFixture }, async () => {
  const rows = await rowsPromise;
  assert.equal(rows.length, 177);
  assert.equal(new Set(rows.map((row) => row.id)).size, 177);
});

test('parseExamPdfTokens reads every field of the first row', { skip: !hasFixture }, async () => {
  const [first] = await rowsPromise;
  assert.deepEqual(first, {
    id: 'exam-0',
    KodeMK: 'IK1IW31006',
    MataKuliah: 'Komunikasi data dan Pengantar Jaringan',
    Kelas: 'A',
    SKS: '3',
    SMT: '1',
    DosenPengampuh: 'Azral Satrani, M.Kom',
    Hari: 'Senin, 9 Nov 2026',
    Jam: '08.15 - 09.45',
    Ruang: '1A',
    Keterangan: 'UTS (Offline)',
  });
});

test('parseExamPdfTokens attaches the exam date to every row', { skip: !hasFixture }, async () => {
  const rows = await rowsPromise;
  const dates = new Set(rows.map((row) => row.Hari));
  assert.equal(dates.size, 12);
  assert.ok(dates.has('Senin, 9 Nov 2026'));
  assert.ok(dates.has('Senin, 16 Nov 2026'));
  for (const row of rows) {
    assert.match(row.Hari, /^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu), \d{1,2} [A-Za-z]{3,} \d{4}$/);
  }
});

test('parseExamPdfTokens strips quotes from multi lecturer rows', { skip: !hasFixture }, async () => {
  const rows = await rowsPromise;
  assert.equal(
    rows[2].DosenPengampuh,
    'Raisul Azhar, S.T, M.T, Naufal Hanif, S.Kom., M.Kom',
  );
  for (const row of rows) {
    assert.equal(row.DosenPengampuh.includes('"'), false);
    assert.equal(row.DosenPengampuh.endsWith(','), false);
  }
});

test('parseExamPdfTokens keeps rooms, course names and unusual class letters', { skip: !hasFixture }, async () => {
  const rows = await rowsPromise;
  const rooms = new Set(rows.map((row) => row.Ruang));
  assert.ok(rooms.has('Sport Center'));
  assert.ok(rooms.has('3AB(Extend)'));
  assert.ok(rooms.has('GS1A'));

  const starred = rows.find((row) => row.Kelas === 'A*');
  assert.ok(starred);
  assert.equal(starred.MataKuliah, 'Aljabar Linear dan Matriks');
  assert.equal(starred.SMT, '3');
  assert.equal(starred.Ruang, 'GS1A');

  for (const row of rows) {
    assert.equal(row.MataKuliah.includes('Project'), false);
    assert.equal(row.MataKuliah.includes('mahasiswa'), false);
  }
});

test('parseExamPdfTokens labels the delivery mode in Keterangan', { skip: !hasFixture }, async () => {
  const rows = await rowsPromise;
  const modes = new Set(rows.map((row) => row.Keterangan));
  assert.deepEqual(
    [...modes].sort(),
    ['UTS (Blended)', 'UTS (Offline)', 'UTS (Online)', 'UTS (Praktikum LAB)', 'UTS (Project)'],
  );
  assert.equal(rows.filter((row) => row.Keterangan === 'UTS (Project)').length, 26);
});

test('parseExamPdfTokens leaves no empty field behind', { skip: !hasFixture }, async () => {
  const rows = await rowsPromise;
  const fields = ['KodeMK', 'MataKuliah', 'Kelas', 'SKS', 'SMT', 'DosenPengampuh', 'Hari', 'Jam', 'Ruang'];
  for (const row of rows) {
    for (const field of fields) assert.ok(row[field], `${row.KodeMK} kelas ${row.Kelas}: ${field} kosong`);
  }
});