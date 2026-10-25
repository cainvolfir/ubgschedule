import { isValidElement } from 'react';
import { existsSync } from 'node:fs';
import * as XLSX from 'xlsx';
import AutoClassCard from '../src/components/AutoClassCard';
import { parseTheorySheetMatrix } from '../src/utils/theorySheet';
import { collectLabCandidates, findMatchingRows } from '../src/utils/courseCode';
import type { DataTeoriMentah } from '../src/store/useJadwalStore';

/**
 * End-to-end check that AutoClassCard announces each class section clearly.
 * Parses the real campus XLSX export, then renders the card through a direct
 * function call (the component is hook-free) and asserts on the produced tree.
 */

const XLSX_PATH =
  process.env.XLSX_PATH || 'C:/Users/Cain/Downloads/Jadwal_Kuliah_FT_20261014_002545.xlsx';

const results: { name: string; pass: boolean; detail?: string }[] = [];
const check = (name: string, cond: boolean, detail = '') =>
  results.push({ name, pass: cond, detail });

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Combined-portal-shaped matrix with a course that offers Kelas A, B and C. */
function mockMatrix(): (string | number)[][] {
  const header = ['No', 'Hari', 'Waktu', 'Jenis', 'Ruangan', 'Kode MK', 'Mata Kuliah', 'Prodi & Smt', 'Kelas / Kelompok', 'Dosen Pengampu', 'SKS (T/PK/PT)', 'Keterangan'];
  const row = (no: number, hari: string, kelas: string, ket: string): (string | number)[] => [
    no, hari, '08:00 - 09:40', 'TEORI', 'R.301', 'IF1234', 'Pemrograman Web',
    'S1ILKOM (Smt 3)', kelas, 'Dosen Pengampu MK', '2T + 0PK + 0PT', ket,
  ];
  const lab = (no: number, hari: string, kelas: string, ket: string): (string | number)[] => [
    no, hari, '10:00 - 11:40', 'PRAKTIKUM LAB', 'LAB 1', 'IF1234', 'Pemrograman Web',
    'S1ILKOM (Smt 3)', kelas, 'Asisten Lab', '2T + 0PK + 1PT', ket,
  ];
  return [
    ['JADWAL PERKULIAHAN & PRAKTIKUM - FAKULTAS TEKNIK'],
    ['Waktu Unduh: mock'],
    [],
    header,
    row(1, 'SENIN', 'Kelas A - Semua Mhs', 'Jadwal Teori (2T) dari Akademik'),
    row(2, 'SELASA', 'Kelas B - Semua Mhs', 'Jadwal Teori (2T) dari Akademik'),
    row(3, 'RABU', 'Kelas C - Semua Mhs', 'Jadwal Teori (2T) dari Akademik'),
    lab(4, 'KAMIS', 'Kelas A - Kelompok A1', 'Praktikum - Kelompok A1'),
    lab(5, 'KAMIS', 'Kelas B - Kelompok B1', 'Praktikum - Kelompok B1'),
  ];
}

/** Concatenated text of any React node, resolving function components once. */
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

/** Text of every element, at any depth, whose own text satisfies pred. */
function collectMatching(
  node: unknown,
  pred: (text: string) => boolean,
  out: string[] = []
): string[] {
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

const hasRealXlsx = existsSync(XLSX_PATH);
const wb = hasRealXlsx ? XLSX.readFile(XLSX_PATH) : null;
const matrix = wb
  ? (XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' }) as (string | number)[][])
  : mockMatrix();
const allRows = parseTheorySheetMatrix(matrix, hasRealXlsx ? XLSX_PATH.split('/').pop() : 'mock.xlsx');
check(
  hasRealXlsx ? 'real XLSX parsed into theory rows' : 'mock data parsed into theory rows',
  hasRealXlsx ? allRows.length > 500 : allRows.length >= 4,
  'rows=' + allRows.length + (hasRealXlsx ? '' : ' (real XLSX not found, mock used)')
);

const byCode = new Map<string, DataTeoriMentah[]>();
for (const r of allRows) {
  const k = r.KodeMK.replace(/\s+/g, '');
  if (!byCode.has(k)) byCode.set(k, []);
  byCode.get(k)!.push(r);
}
let target = '';
for (const [code, rs] of byCode) {
  if (new Set(rs.map((r) => r.Kelas).filter(Boolean)).size >= 3) {
    target = code;
    break;
  }
}
check('found a real course with >= 3 kelas (A/B/C style)', !!target, 'code=' + target);

if (target) {
  const matches = findMatchingRows([target], allRows).get(target) || [];
  const linked = collectLabCandidates(target, allRows, []);
  const kelasLetters = [...new Set(matches.map((r) => r.Kelas).filter(Boolean))].sort();
  const theoryKelas = [
    ...new Set(
      matches.filter((r) => !/praktikum|lab/i.test(r.MataKuliah)).map((r) => r.Kelas).filter(Boolean)
    ),
  ].sort();

  const tree = AutoClassCard({
    code: target,
    matches,
    linkedPraktikum: linked,
    selectedTheoryIds: [],
    selectedLabIds: [],
    onToggleTheory: () => {},
    onToggleLab: () => {},
    onSelectAll: () => {},
    onDeselect: () => {},
  } as never);

  const fullText = norm(nodeText(tree));

  // 1. Every section letter shows up as a 'Kelas X' badge.
  const missing = kelasLetters.filter((k) => !fullText.includes('Kelas ' + k));
  check(
    'every real section renders a "Kelas X" badge',
    missing.length === 0,
    'kelas=' + kelasLetters.join(',') + (missing.length ? ' missing=' + missing.join(',') : '')
  );

  // 2. Section badges are distinct, one per section, not one repeated label.
  const badges = new Set(collectMatching(tree, (t) => /^Kelas [A-Z0-9-]+$/.test(t)));
  check(
    'section badges are distinct (one per section)',
    badges.size >= kelasLetters.length,
    'badges=' + [...badges].join(',')
  );

  // 3. Each theory section has its own header band: 'Kelas X <n> jadwal teori'.
  const bands = collectMatching(tree, (t) => /^Kelas [A-Z0-9-]+ \d+ jadwal teori$/.test(t));
  const bandKelas = new Set(bands.map((b) => b.split(' ')[1]));
  const missingBands = theoryKelas.filter((k) => !bandKelas.has(k));
  check(
    'each theory section has its own Kelas header band',
    theoryKelas.length >= 3 && missingBands.length === 0,
    'bands=' + bands.join(' | ')
  );

  // 4. No legacy whole-cohort noise leaks into a visible label.
  check('no "Semua Mhs" whole-cohort label is rendered', !/semua\s*mhs/i.test(fullText));

  console.log('\nCourse under test:', target, '|', matches[0]?.MataKuliah);
  console.log('Sections:', kelasLetters.join(', '));
  console.log('Theory header bands:', bands.join(' | '));
}

const failed = results.filter((r) => !r.pass);
for (const r of results) console.log((r.pass ? 'PASS ' : 'FAIL ') + r.name + (r.detail ? ' (' + r.detail + ')' : ''));
console.log('\n' + (results.length - failed.length) + '/' + results.length + ' checks passed');
if (failed.length) process.exit(1);