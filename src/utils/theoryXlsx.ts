import type { DataTeoriMentah } from '../store/useJadwalStore';
import {
  buildTheoryKeterangan,
  isLabLabel,
  parseKelasCell,
  resolveJenisKeteranganColumns,
} from './courseCode';

/**
 * Pure parser for one sheet of the campus portal's theory/praktikum export.
 *
 * It lives outside the worker so the portal's real column layout (including the
 * separate 'Jenis' and 'Keterangan' columns and 'Kelas X - Semua Mhs' cells) can
 * be exercised by tests without spinning up a Web Worker.
 */

export type SheetMatrix = (string | number | undefined)[][];

const HARI_INDONESIA = [
  'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat',
  'Sabtu', 'Minggu',
];

const JAM_PATTERN = /^[0-9]{1,2}[.:][0-9]{2}\s*[-–]\s*[0-9]{1,2}[.:][0-9]{2}$/;

export function parseTheorySheetMatrix(
  matrix: SheetMatrix,
  fileName = ''
): DataTeoriMentah[] {
  const results: DataTeoriMentah[] = [];
  if (matrix.length === 0) return results;

  // Find header row - look for "Kode MK" or similar
  let headerIdx = -1;
  for (let i = 0; i < Math.min(matrix.length, 10); i++) {
    const row = matrix[i];
    if (row.some((cell) => typeof cell === 'string' && /kode\s*mk/i.test(cell))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return results;

  // Clean header names: strip leading dots, whitespace, then lowercase
  const headers = matrix[headerIdx].map((h) =>
    String(h || '').replace(/^\.\s*/, '').trim().toLowerCase()
  );

  const findCol = (...patterns: RegExp[]): number => {
    for (const p of patterns) {
      const idx = headers.findIndex((h) => p.test(h));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const colKode = findCol(/kode\s*mk/i);
  const colMatkul = findCol(/mata\s*kuliah/i, /nama\s*mata\s*kuliah/i);
  const colKelas = findCol(/^kelas$/i, /kelas\s*[-/]?\s*kelompok/i);
  const colSmt = findCol(/^smt$/i, /^semester$/i, /prodi\s*&\s*smt/i, /smt/i);
  const colSks = findCol(/^total\s*sks$/i, /^sks\s*teori$/i, /^sks\s*t&pk$/i, /^sks/i);
  const colDosen = findCol(/^dosen\s*pengampu[h]?/i, /^dosen/i);
  const colJam = findCol(/^jam$/i, /^waktu$/i, /^pukul$/i);
  const colRuang = findCol(/^ruang[an]*$/i);
  const colHari = findCol(/kd\s*hari/i, /^hari$/i, /kode\s*hari/i);
  // 'Jenis' (row type: TEORI / PRAKTIKUM) and 'Keterangan' (source note) are
  // distinct portal columns. Matching them separately stops the source note
  // ('Jadwal Teori (2T) dari Akademik') from masquerading as the row type.
  const { jenis: colJenis, keterangan: colKet } = resolveJenisKeteranganColumns(headers);

  // Auto-detect target prodi from rows 4-10 (index 3-9)
  let targetProdi = '';
  for (let r = 3; r < Math.min(10, matrix.length); r++) {
    const scanRow = matrix[r];
    if (!scanRow) continue;
    for (let c = 0; c < scanRow.length; c++) {
      const cellStr = String(scanRow[c] ?? '');
      if (/program\s*stud/i.test(cellStr)) {
        const prodiMatch = cellStr.match(/program\s*studi\s*[:-]?\s*(.+)/i);
        if (prodiMatch) {
          targetProdi = prodiMatch[1].trim();
        } else if (c + 1 < scanRow.length) {
          targetProdi = String(scanRow[c + 1] ?? '').trim();
        }
        break;
      }
    }
    if (targetProdi) break;
  }
  // Fallback: extract from fileName (e.g. "Perkuliahan S1 Ilmu Komputer.xlsx")
  if (!targetProdi && fileName) {
    const fnMatch = fileName.match(/(S[12]|D3)\s+[^.-]+/i);
    if (fnMatch) targetProdi = fnMatch[0].trim();
  }
  const colProdi = findCol(/^prodi$/i, /program\s*stud/i);
  const hasProdiFilter = !!(targetProdi && colProdi !== -1);

  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || row.length === 0) continue;

    const rawKode = String(row[colKode] ?? '').trim();
    if (!rawKode) continue; // skip empty rows

    // Strict course code validation: must match /^[A-Z]{2,4}[0-9]{4,8}$/i.
    // Skip rows that contain "kode" or "perkuliahan" (sub-headers / section labels).
    if (/[Kk]ode|[Pp]erkuliahan/.test(rawKode)) continue;
    if (
      !/^(?=[A-Z]{2})(?=.*[0-9])[A-Z0-9]{7,12}$/i.test(rawKode.replace(/\s+/g, '')) &&
      !/^[A-Z]{2,4}\s*[0-9]{4,8}$/i.test(rawKode)
    ) {
      continue;
    }

    // Validate matkul: skip if starts with dot or equals "mata kuliah"
    const matkul = String(row[colMatkul] ?? '').trim();
    if (matkul.startsWith('.') || matkul.toLowerCase() === 'mata kuliah') continue;
    if (!matkul) continue;

    // Validate jam: must be a valid time range
    const jam = String(row[colJam] ?? '').trim();
    if (!JAM_PATTERN.test(jam)) continue;

    // Filter by prodi if auto-detected
    if (hasProdiFilter) {
      const rowProdi = String(row[colProdi] ?? '').trim();
      if (rowProdi && !rowProdi.toLowerCase().includes(targetProdi.toLowerCase())) continue;
    }

    // --- Combined-portal fields (Jenis / Kelas-Kelompok / compound SKS) ---
    // 'Jenis' labels the row type (TEORI / PRAKTIKUM); 'Keterangan' is a source note.
    const jenisVal = colJenis !== -1 ? String(row[colJenis] ?? '').trim() : '';
    const ketVal = colKet !== -1 ? String(row[colKet] ?? '').trim() : '';
    const isPraktikumRow = isLabLabel(jenisVal) || isLabLabel(matkul);

    // Parse compound SKS "(T/PK/PT)": pick the component matching the row type.
    // Theory rows take T (first), praktikum/lab rows take the last non-zero of PK/PT.
    const rawSks = String(row[colSks] ?? '').trim().replace(/\.0+$/, '');
    const sksNumbers = rawSks.match(/\d+/g);
    let sks = rawSks;
    if (sksNumbers && sksNumbers.length >= 2) {
      const total = sksNumbers[0];
      if (isPraktikumRow) {
        const prakComps = sksNumbers.slice(1).map((n) => parseInt(n, 10)).filter((n) => n > 0);
        sks = prakComps.length ? String(prakComps[prakComps.length - 1]) : total;
      } else {
        sks = total;
      }
    }

    // Extract base class letter and optional group from "Kelas A - Kelompok A1".
    // "Kelas A - Semua Mhs" means the whole section, NOT a kelompok, so the
    // marker is dropped instead of being stored as a group label.
    const { kelas, group: kelasGroup } = parseKelasCell(String(row[colKelas] ?? ''));

    // Keterangan keeps the row type plus the source note, and a real kelompok label.
    const keterangan = buildTheoryKeterangan({
      jenis: jenisVal,
      keterangan: ketVal,
      group: kelasGroup,
    });

    // Clean outer quotes from dosen
    let dosen = String(row[colDosen] ?? '').trim();
    dosen = dosen.replace(/^["']|["']$/g, '');

    // Normalize day name: extract from "1. Senin", "SENIN", "SEL", etc.
    const rawHari = String(row[colHari] ?? '').trim();
    const dayNameMatch = rawHari.match(/^(?:\d+\.\s*)?(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)/i);
    let hari = dayNameMatch ? dayNameMatch[1] : rawHari;
    if (!dayNameMatch) {
      const dayAbbrevMap: Record<string, string> = {
        SEN: 'Senin', SEL: 'Selasa', RAB: 'Rabu',
        KAM: 'Kamis', JUM: 'Jumat', SAB: 'Sabtu', MIN: 'Minggu',
        SENIN: 'Senin', SELASA: 'Selasa', RABU: 'Rabu',
        KAMIS: 'Kamis', JUMAT: 'Jumat', SABTU: 'Sabtu', MINGGU: 'Minggu',
      };
      hari = dayAbbrevMap[rawHari.toUpperCase()] || rawHari;
    }
    // Normalize to Title Case (e.g. "SENIN" -> "Senin")
    hari = hari.charAt(0).toUpperCase() + hari.slice(1).toLowerCase();
    const canonicalHari = HARI_INDONESIA.find((d) => d.toLowerCase() === hari.toLowerCase());
    if (canonicalHari) hari = canonicalHari;

    // Semester: prefer explicit "SMT 3" text, fall back to raw cell value.
    const rawSmt = String(row[colSmt] ?? '').trim().replace(/\.0+$/, '');
    const smtMatch = rawSmt.match(/smt\s*(\d+)/i);
    const smt = smtMatch ? smtMatch[1] : rawSmt;

    results.push({
      id: `xlsx-${Date.now()}-${i}`,
      KodeMK: rawKode,
      MataKuliah: matkul,
      Kelas: kelas,
      SKS: sks,
      SMT: smt,
      DosenPengampuh: dosen,
      Hari: hari,
      Jam: jam,
      Ruang: String(row[colRuang] ?? '').trim(),
      Keterangan: keterangan,
    });
  }

  return results;
}