import { isValidElement } from 'react';
import AutoClassCard from '../src/components/AutoClassCard';

/**
 * Component-level checks for the automatic-mode multi-select card.
 * AutoClassCard is intentionally hook-free, so it can be invoked directly and
 * its element tree walked to exercise the real onClick handlers without a DOM.
 */

const theoryRow = (id, kelas) => ({
  id, KodeMK: 'IF1234', MataKuliah: 'Pemrograman Web', Kelas: kelas,
  SKS: '3', SMT: '3', DosenPengampuh: 'Dosen ' + kelas, Hari: 'Senin',
  Jam: '08.00-09.40', Ruang: 'R.301', Keterangan: '',
});
const lab = (id, ket) => ({
  id, courseName: 'Praktikum Pemrograman Web', kelas: 'A', keterangan: ket,
  dosen: 'Asisten', semester: '3', hari: 'Rabu', jam: '10.00-11.40', ruang: 'LAB 1', kodeMk: 'IF1234',
});

const log = [];
const tree = AutoClassCard({
  code: 'IF1234',
  matches: [theoryRow('t1', 'A'), theoryRow('t2', 'B')],
  linkedPraktikum: [lab('l1', 'Kelompok A1'), lab('l2', 'Kelompok A2')],
  selectedTheoryIds: ['t1'],
  selectedLabIds: ['l1'],
  onToggleTheory: (id) => log.push('toggleTheory:' + id),
  onToggleLab: (id) => log.push('toggleLab:' + id),
  onSelectAll: (t, l) => log.push('selectAll:' + t.join(',') + '|' + l.join(',')),
  onDeselect: () => log.push('deselect'),
} as never);

function flatten(children: unknown): string {
  if (children == null || children === false) return '';
  if (Array.isArray(children)) return children.map(flatten).join('');
  if (isValidElement(children)) return flatten((children.props as { children?: unknown }).children);
  return String(children);
}

const buttons: { onClick: () => void; text: string }[] = [];
function walk(node: unknown): void {
  if (Array.isArray(node)) { node.forEach(walk); return; }
  if (!isValidElement(node)) return;
  const props = node.props as { onClick?: () => void; children?: unknown };
  if (node.type === 'button' && props.onClick) {
    buttons.push({ onClick: props.onClick, text: flatten(props.children) });
  }
  walk(props.children);
}
walk(tree);

const results: { name: string; pass: boolean; detail?: string }[] = [];
const check = (name: string, cond: boolean, detail = '') => results.push({ name, pass: cond, detail });

check('six interactive controls are buttons', buttons.length === 6, 'buttons=' + buttons.length);

// Theory rows toggle their own row ids independently.
const t1 = buttons.find((b) => b.text.includes('Kelas A'))!;
const t2 = buttons.find((b) => b.text.includes('Kelas B'))!;
check('both theory class buttons exist', !!t1 && !!t2);
t1.onClick();
t2.onClick();
check('theory row A toggles t1', log.includes('toggleTheory:t1'));
check('theory row B toggles t2', log.includes('toggleTheory:t2'));
check('two theory rows toggle independently',
  log.filter((e) => e.startsWith('toggleTheory:')).length === 2);

// Both practical groups are wired to distinct ids: the core multi-select fix.
const l1 = buttons.find((b) => b.text.includes('Kelompok A1'))!;
const l2 = buttons.find((b) => b.text.includes('Kelompok A2'))!;
check('both practical group buttons exist', !!l1 && !!l2);
l1.onClick();
l2.onClick();
const labToggles = log.filter((e) => e.startsWith('toggleLab:'));
check('lab group A1 toggles l1', labToggles.includes('toggleLab:l1'));
check('lab group A2 toggles l2', labToggles.includes('toggleLab:l2'));
check('two practical groups toggle independently', labToggles.length === 2, labToggles.join(','));
check('theory and practical selections coexist (no mutual exclusion)',
  log.some((e) => e.startsWith('toggleTheory:')) && labToggles.length === 2);

// Quick actions.
buttons.find((b) => b.text.includes('Pilih Semua'))!.onClick();
check('Pilih Semua offers every theory and lab id', log.includes('selectAll:t1,t2|l1,l2'));
buttons.find((b) => b.text.includes('Batal'))!.onClick();
check('Batal clears the course', log.includes('deselect'));

const failed = results.filter((r) => !r.pass);
for (const r of results) console.log((r.pass ? 'PASS ' : 'FAIL ') + r.name + (r.detail ? ' (' + r.detail + ')' : ''));

console.log('\n' + (results.length - failed.length) + '/' + results.length + ' checks passed');
if (failed.length) process.exit(1);