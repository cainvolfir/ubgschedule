import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';

const data = new Uint8Array(fs.readFileSync('D:/Downloads/project-schedule/JadwalTeori.pdf'));
const pdf = await pdfjsLib.getDocument({ data }).promise;
const tokens = [];
for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  const tc = await page.getTextContent();
  for (const item of tc.items) {
    if ('str' in item) tokens.push(item.str);
  }
}
console.log('TOKENS_COUNT:', tokens.length);

const kodeMKTerverifikasi = [
  'IK1UW22002', 'ISKK340222', 'IK1IW22006', 'ISKB340224', 'ISPB260039',
  'ISKB381355', 'IK1IW32001', 'IK1IW32004', 'IK1IW32005', 'IK1IW32007',
  'IK1IW32008', 'IKKW2203', 'ISKB240427', 'ISKB260037', 'ISKB340426',
  'ISKB360440', 'ISKB361342', 'ISKB361343', 'ISKB361344', 'ISKB361445',
  'ISKB361446', 'ISKB361447', 'ISKB361548', 'ISKB361549', 'ISKB361550',
  'ISKB380254', 'ISKB381460', 'ISKB440223', 'ISKK240121', 'ISKK340525',
  'ISKK360141',
];

const HARI_INDONESIA = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];

function isJam(s) { return /^\d{2}\.\d{2}\s*-\s*\d{2}\.\d{2}$/.test(s.trim()); }
function isMetode(s) { return ['Offline','Online','Blended'].includes(s.trim()); }
function isHari(s) { return /^(?:\d+\.\s*)?(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)/i.test(s.trim()); }
function prevNonSpace(from) {
  for (let k = from - 1; k >= 0; k--) if (tokens[k].trim()) return k;
  return -1;
}
function nextNonSpace(from) {
  for (let k = from + 1; k < tokens.length; k++) if (tokens[k].trim()) return k;
  return -1;
}

let hariGlobal = '';
const result = [];

for (let i = 0; i < tokens.length; i++) {
  const current = tokens[i].trim();

  const perHariMatch = current.match(/^\.Perkuliahan\s+Hari\s+(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)/i);
  if (perHariMatch && HARI_INDONESIA.includes(perHariMatch[1])) {
    hariGlobal = perHariMatch[1];
  }

  if (!kodeMKTerverifikasi.includes(current)) continue;
  const kode = current;

  const lookaLimit = Math.min(i + 30, tokens.length);
  let jamIdx = -1;
  for (let j = i + 1; j < lookaLimit; j++) {
    if (isJam(tokens[j])) { jamIdx = j; break; }
  }
  if (jamIdx === -1) continue;

  const sesiIdx = prevNonSpace(jamIdx);

  const dosenParts = [];
  let dosenStartIdx = -1;
  for (let k = sesiIdx - 1; k >= 0; k--) {
    if (!tokens[k].trim()) continue;
    dosenParts.push(tokens[k]);
    if (tokens[k].startsWith('"') || tokens[k].startsWith("'")) {
      dosenStartIdx = k;
      break;
    }
  }
  const rawDosen = dosenParts.reverse().join(' ');
  const dosen = rawDosen.replace(/^["'\s]+|["'\s]+$/g, '').trim();

  let kelasIdx = -1, sksIdx = -1, smtIdx = -1;
  let kelas = '', sks = '', smt = '';
  if (dosenStartIdx >= 0) {
    const ki = prevNonSpace(dosenStartIdx);
    if (ki >= 0) {
      const raw = tokens[ki].trim();
      if (raw.length === 1 && /^[A-Z]$/.test(raw)) {
        kelas = raw; kelasIdx = ki;
        const si = prevNonSpace(ki);
        if (si >= 0) { sks = tokens[si].trim(); sksIdx = si;
          const sti = prevNonSpace(si);
          if (sti >= 0) { smt = tokens[sti].trim(); smtIdx = sti; }
        }
      }
    }
  }

  const mkTokens = [];
  const mkStart = smtIdx >= 0 ? smtIdx : (dosenStartIdx >= 0 ? dosenStartIdx : sesiIdx);
  for (let k = mkStart - 1; k >= i; k--) {
    if (!tokens[k].trim()) continue;
    if (kodeMKTerverifikasi.includes(tokens[k].trim())) break;
    mkTokens.push(tokens[k]);
  }
  const mataKuliah = mkTokens.reverse().join(' ').trim();

  const ruangTokens = [];
  for (let k = jamIdx + 1; k < tokens.length; k++) {
    if (isMetode(tokens[k])) break;
    if (tokens[k].trim()) ruangTokens.push(tokens[k].trim());
  }
  const ruang = ruangTokens.join(' ').trim();

  let metodeIdx = -1;
  for (let k = jamIdx + 1; k < tokens.length; k++) {
    if (isMetode(tokens[k])) { metodeIdx = k; break; }
  }

  let keterangan = '-';
  if (metodeIdx !== -1) {
    const jmlMhsIdx = nextNonSpace(metodeIdx);
    const firstNonSpace = jmlMhsIdx >= 0 ? nextNonSpace(jmlMhsIdx) : -1;
    if (firstNonSpace >= 0) {
      if (isHari(tokens[firstNonSpace])) {
        keterangan = '-';
      } else {
        const ketTokens = [];
        for (let k = firstNonSpace; k < tokens.length; k++) {
          if (isHari(tokens[k])) break;
          if (tokens[k].trim()) ketTokens.push(tokens[k].trim());
        }
        keterangan = ketTokens.join(' ').trim();
      }
    }
  }

  result.push({ KodeMK: kode, MataKuliah: mataKuliah, Kelas: kelas, SKS: sks, SMT: smt, DosenPengampuh: dosen, Hari: hariGlobal, Jam: tokens[jamIdx].trim(), Ruang: ruang, Keterangan: keterangan });
}

console.log('Total rows:', result.length);
console.log('\nSample of first 5:');
for (const r of result.slice(0, 5)) {
  console.log(JSON.stringify(r));
}

let errors = 0;
for (const r of result) {
  if (!r.MataKuliah || !r.Kelas || !r.SKS || !r.SMT || !r.DosenPengampuh || !r.Hari) {
    if (errors < 10) console.log('INCOMPLETE:', r.KodeMK, JSON.stringify(r));
    errors++;
  }
}
console.log('\nErrors:', errors, '/', result.length);

const byKode = {};
for (const r of result) {
  if (!byKode[r.KodeMK]) byKode[r.KodeMK] = new Set();
  byKode[r.KodeMK].add(r.Kelas);
}
console.log('\nClasses per course:');
for (const [k, v] of Object.entries(byKode)) {
  console.log(' ', k, ':', [...v].filter(Boolean).join(', ') || '(empty)');
}
