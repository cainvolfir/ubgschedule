import type { DataTeoriMentah } from '../store/useJadwalStore';

/**
 * Parser for Labkom exam (UTS/UAS) schedule PDFs.
 *
 * The exam export turns the lecture layout inside out: the row's date line sits
 * above the session, the time and the `RUANG` marker come BEFORE the course
 * code, and the semester/class line reads `S1 Ilmu Komputer / Smt 1 / Kelas A`.
 * Columns are stacked as whole lines, so every field is found by pattern inside
 * the row's own token window instead of by cell position.
 *
 * Pure on purpose: the node suite drives it without a Web Worker.
 */

/** Em dash and en dash stay out of the source, so the dash is written escaped. */
const JAM_RE = /^\d{1,2}[:.]\d{2}\s*[-\u2013]\s*\d{1,2}[:.]\d{2}$/;
const KODE_RE = /^(?=[A-Z]{2})(?=.*[0-9])[A-Z0-9]{8,10}$/;
const TANGGAL_RE = /^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/;
const SKS_RE = /^(\d+)\s*SKS$/i;
const MAHASISWA_RE = /^\d+\s*mahasiswa$/i;
const SMT_KELAS_RE = /\/\s*Smt\s*(\d+)\s*\/\s*Kelas\s*(\S+)/i;
/** Session badge or delivery mode sitting where a lecture row would have none. */
const MODE_RE = /^(Offline|Online|Blended|Project|Praktikum\s+LAB)$/i;

/**
 * The row's own time/date/room always sit within a few tokens above its course
 * code; the previous row's course code is at least a pengawas list away.
 */
const LOOKBACK = 25;

/** True when the token stream is an exam export rather than a lecture export. */
export function isExamPdfSchedule(tokens: string[]): boolean {
  const head = tokens.slice(0, 100).join(' ');
  return /jadwal\s+ujian/i.test(head) || /Prodi\s*\/\s*Semester\s*\/\s*Kelas/i.test(head);
}

function examLabel(tokens: string[]): string {
  const head = tokens.slice(0, 20).join(' ');
  if (/ujian\s+akhir/i.test(head)) return 'UAS';
  if (/ujian\s+tengah/i.test(head)) return 'UTS';
  return 'Ujian';
}

/** Drop the export's quote wrapping and the separators left dangling by it. */
function cleanDosen(raw: string): string {
  return raw.replace(/"/g, '').replace(/\s+/g, ' ').replace(/^[,\s]+|[,\s]+$/g, '');
}

/**
 * Mint one row per course code. Each row walks backwards for its time, date and
 * room, and forwards (up to the next course code) for name, SKS, semester,
 * class, lecturer and delivery mode.
 */
export function parseExamPdfTokens(tokens: string[]): DataTeoriMentah[] {
  const label = examLabel(tokens);
  const codes: number[] = [];
  tokens.forEach((token, at) => {
    if (KODE_RE.test(token.trim())) codes.push(at);
  });

  return codes.map((at, index) => {
    let jam = '';
    let hari = '';
    let ruang = '';
    const floor = Math.max(0, at - LOOKBACK);

    for (let j = at - 1; j >= floor; j--) {
      const token = tokens[j].trim();
      if (!jam && JAM_RE.test(token)) jam = token;
      const tanggal = hari ? null : token.match(TANGGAL_RE);
      if (tanggal) hari = `${tanggal[1]}, ${tanggal[2]} ${tanggal[3]} ${tanggal[4]}`;
      if (jam && hari) break;
    }

    for (let j = at - 1; j >= floor; j--) {
      if (tokens[j].trim() !== 'RUANG') continue;
      ruang = tokens.slice(j + 1, at).map((t) => t.trim()).find(Boolean) || '';
      break;
    }

    const row = tokens.slice(at + 1, index + 1 < codes.length ? codes[index + 1] : tokens.length)
      .map((t) => t.trim())
      .filter(Boolean);

    let sks = '';
    let smt = '';
    let kelas = '';
    let dosen = '';
    let mode = '';

    const sksAt = row.findIndex((t) => SKS_RE.test(t));
    const nama = (sksAt === -1 ? row : row.slice(0, sksAt))
      .filter((t) => !MODE_RE.test(t))
      .join(' ');
    const sksMatch = sksAt === -1 ? null : SKS_RE.exec(row[sksAt]);
    if (sksMatch) sks = sksMatch[1];

    const mhsAt = row.findIndex((t) => MAHASISWA_RE.test(t));
    if (mhsAt !== -1 && MODE_RE.test(row[mhsAt + 1] || '')) mode = row[mhsAt + 1];

    const kelasAt = row.findIndex((t) => SMT_KELAS_RE.test(t));
    const kelasMatch = kelasAt === -1 ? null : SMT_KELAS_RE.exec(row[kelasAt]);
    if (kelasMatch) {
      smt = kelasMatch[1];
      kelas = kelasMatch[2];
      const pengampuAt = row.findIndex((t, j) => j > kelasAt && /^Dosen\s*pengampu/i.test(t));
      const dosenTokens = row.slice(kelasAt + 1, pengampuAt === -1 ? kelasAt + 4 : pengampuAt);
      dosen = cleanDosen(dosenTokens.join(' '));
    }

    return {
      id: `exam-${index}`,
      KodeMK: tokens[at].trim(),
      MataKuliah: nama,
      Kelas: kelas,
      SKS: sks,
      SMT: smt,
      DosenPengampuh: dosen,
      Hari: hari,
      Jam: jam,
      Ruang: ruang,
      Keterangan: mode ? `${label} (${mode})` : label,
    };
  });
}