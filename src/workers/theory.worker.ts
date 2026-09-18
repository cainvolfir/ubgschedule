import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

function log(step: string, data?: unknown) {
  self.postMessage({ type: 'LOG', step, data });
}

function warn(step: string, data?: unknown) {
  self.postMessage({ type: 'WARN', step, data });
}

function sendError(step: string, data?: unknown) {
  self.postMessage({ type: 'ERROR', step, data });
}

interface DataTeoriMentah {
  id: string;
  KodeMK: string;
  MataKuliah: string;
  Kelas: string;
  SKS: string;
  SMT: string;
  DosenPengampuh: string;
  Hari: string;
  Jam: string;
  Ruang: string;
  Keterangan: string;
}

const HARI_INDONESIA = [
  'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat',
  'Sabtu', 'Minggu',
];

const HARI_PATTERN = /^(?:\d+\.\s*|-\s*)?(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)/i;

function isJam(s: string): boolean {
  return /^\d{2}\.\d{2}\s*-\s*\d{2}\.\d{2}$/.test(s.trim());
}

function isMetode(s: string): boolean {
  return ['Offline', 'Online', 'Blended'].includes(s.trim());
}

function isHari(s: string): boolean {
  return HARI_PATTERN.test(s.trim());
}

function isCourseCode(s: string): boolean {
  return /^(?=[A-Z]{2})(?=.*[0-9])[A-Z0-9]{8,10}$/.test(s);
}

function prevNonSpace(tokens: string[], from: number): number {
  for (let k = from - 1; k >= 0; k--) {
    if (tokens[k].trim()) return k;
  }
  return -1;
}

function nextNonSpace(tokens: string[], from: number): number {
  for (let k = from + 1; k < tokens.length; k++) {
    if (tokens[k].trim()) return k;
  }
  return -1;
}

async function parseTheoryXLSX(buffer: ArrayBuffer, fileName: string): Promise<DataTeoriMentah[]> {
  log('XLSX_INIT', `Parsing XLSX file: ${fileName}`);
  const XLSX = await import('xlsx');
  const data = new Uint8Array(buffer);
  const wb = XLSX.read(data, { type: 'array' });

  const results: DataTeoriMentah[] = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const matrix: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (matrix.length === 0) continue;

    // Find header row - look for "Kode MK" or similar
    let headerIdx = -1;
    for (let i = 0; i < Math.min(matrix.length, 10); i++) {
      const row = matrix[i];
      if (row.some(cell => typeof cell === 'string' && /kode\s*mk/i.test(cell))) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) continue;

    // Clean header names: strip leading dots, whitespace, then lowercase
    const headers = matrix[headerIdx].map(h => String(h || '').replace(/^\.\s*/, '').trim().toLowerCase());

    // Map column indices using findCol helper
    const findCol = (...patterns: RegExp[]): number => {
      for (const p of patterns) {
        const idx = headers.findIndex(h => p.test(h));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const colKode = findCol(/kode\s*mk/i);
    const colMatkul = findCol(/mata\s*kuliah/i, /nama\s*mata\s*kuliah/i);
    const colKelas = findCol(/^kelas$/i);
    const colSmt = findCol(/^smt$/i, /^semester$/i);
    const colSks = findCol(/^total\s*sks$/i, /^sks\s*teori$/i, /^sks\s*t&pk$/i, /^sks$/i);
    const colDosen = findCol(/^dosen\s*pengampuh$/i, /^dosen$/i);
    const colJam = findCol(/^jam$/i);
    const colRuang = findCol(/^ruang$/i);
    const colHari = findCol(/kd\s*hari/i, /^hari$/i, /kode\s*hari/i);
    const colKet = findCol(/keterangan/i);

    // Auto-detect target prodi from rows 4-10 (index 3-9)
    let targetProdi = '';
    for (let r = 3; r < Math.min(10, matrix.length); r++) {
      const scanRow = matrix[r];
      if (!scanRow) continue;
      for (let c = 0; c < scanRow.length; c++) {
        const cellStr = String(scanRow[c] ?? '');
        if (/program\s*stud/i.test(cellStr)) {
          // Try extracting after colon/dash: "Program Studi S1 Ilmu Komputer" or "Program Studi : TI"
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
    if (hasProdiFilter) log('XLSX_PRODI_FILTER', { targetProdi, colProdi });

    for (let i = headerIdx + 1; i < matrix.length; i++) {
      const row = matrix[i];
      if (!row || row.length === 0) continue;

      const rawKode = String(row[colKode] ?? '').trim();
      if (!rawKode) continue; // skip empty rows

      // Strict course code validation: must match /^[A-Z]{2,4}[0-9]{4,8}$/i
      // Skip rows that contain "kode" or "perkuliahan" (sub-headers / section labels)
      if (/[Kk]ode|[Pp]erkuliahan/.test(rawKode)) continue;
      if (!/^(?=[A-Z]{2})(?=.*[0-9])[A-Z0-9]{7,12}$/i.test(rawKode.replace(/\s+/g, '')) && !/^[A-Z]{2,4}\s*[0-9]{4,8}$/i.test(rawKode)) continue;

      // Validate matkul: skip if starts with dot or equals "mata kuliah"
      const matkul = String(row[colMatkul] ?? '').trim();
      if (matkul.startsWith('.') || matkul.toLowerCase() === 'mata kuliah') continue;
      if (!matkul) continue;

      // Validate jam: must be a valid time range
      const jam = String(row[colJam] ?? '').trim();
      if (!/^[0-9]{1,2}[.:][0-9]{2}\s*[-–]\s*[0-9]{1,2}[.:][0-9]{2}$/.test(jam)) continue;

      // Filter by prodi if auto-detected
      if (hasProdiFilter) {
        const rowProdi = String(row[colProdi] ?? '').trim();
        if (rowProdi && !rowProdi.toLowerCase().includes(targetProdi.toLowerCase())) continue;
      }

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

      results.push({
        id: `xlsx-${Date.now()}-${i}`,
        KodeMK: rawKode,
        MataKuliah: matkul,
        Kelas: String(row[colKelas] ?? '').trim(),
        SKS: String(row[colSks] ?? '').trim().replace(/\.0+$/, ''),
        SMT: String(row[colSmt] ?? '').trim().replace(/\.0+$/, ''),
        DosenPengampuh: dosen,
        Hari: hari,
        Jam: jam,
        Ruang: String(row[colRuang] ?? '').trim(),
        Keterangan: String(row[colKet] ?? '').trim() || '-',
      });
    }
  }
  return results;
}

self.onmessage = async (e: MessageEvent) => {
  const { type, fileBuffer, fileName } = e.data;
  if (type !== 'PARSE_THEORY') return;

  log('INIT', 'Starting Theory parser worker');

  // Detect file type and choose parser
  const isXLSX = fileName && (fileName.endsWith('.xlsx') || fileName.endsWith('.xls'));
  if (isXLSX) {
    log('FILE_TYPE', 'Detected XLSX format, using XLSX parser');
    const result = await parseTheoryXLSX(fileBuffer, fileName ?? '');
    log('RESULT', { total: result.length, first3: result.slice(0, 3) });
    self.postMessage({
      type: 'RESULT',
      data: result,
    });
    return;
  }

  // PDF parsing path (existing logic)
  let pdfjsLib: typeof import('pdfjs-dist');
  try {
    pdfjsLib = await import('pdfjs-dist');
    log('INIT', 'pdfjs-dist loaded dynamically');
  } catch {
    sendError('IMPORT', 'Failed to load pdfjs-dist');
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

  let pdf: import('pdfjs-dist').PDFDocumentProxy;
  try {
    const data = new Uint8Array(fileBuffer);
    log('PARSE', `Buffer size: ${data.byteLength} bytes`);
    const loadingTask = pdfjsLib.getDocument({ data });
    pdf = await loadingTask.promise;
    log('PARSE', `PDF loaded: ${pdf.numPages} pages`);
  } catch (err) {
    sendError('PARSE', err instanceof Error ? err.message : String(err));
    return;
  }

  const tokens: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    for (const item of textContent.items) {
      if ('str' in item) {
        tokens.push(item.str);
      }
    }
  }
  log('TOKENS_COUNT', tokens.length);
  log('TOKENS_FIRST_10', tokens.slice(0, 10));

  let hariGlobal = '';
  const dataTeoriMentah: DataTeoriMentah[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const current = tokens[i].trim();

    // First try single-token match: ".Perkuliahan Hari Senin" (day name included in token)
    const perHariMatch = current.match(/^\.Perkuliahan\s+Hari\s+(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)/i);
    if (perHariMatch) {
      hariGlobal = perHariMatch[1];
      log('HARI_DETECTED_SINGLE', hariGlobal);
    } 
    // If no single-token match, try multi-token: ".Perkuliahan Hari" without day name, look ahead
    else if (/^\.Perkuliahan\s+Hari$/i.test(current)) {
      const nextIdx = nextNonSpace(tokens, i);
      if (nextIdx >= 0 && nextIdx < tokens.length) {
        const next = tokens[nextIdx].trim();
        const dayMatch = next.match(/^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)/i);
        if (dayMatch && HARI_INDONESIA.includes(dayMatch[1])) {
          hariGlobal = dayMatch[1];
          log('HARI_DETECTED_FROM_NEXT', hariGlobal);
        }
      }
    }

    // Fallback: scan for Kd*Hari or Kode*Hari column tokens containing day names
    if (!hariGlobal) {
      const fallbacks = current.match(/K(d|ode)\s*Hari/i);
      if (fallbacks) {
        // Scan forward for a day name token
        const lookaheadLimit = Math.min(i + 20, tokens.length);
        for (let k = i + 1; k < lookaheadLimit; k++) {
          if (HARI_PATTERN.test(tokens[k])) {
            hariGlobal = tokens[k].trim();
            if (HARI_INDONESIA.includes(hariGlobal)) {
              log('HARI_FALLBACK', hariGlobal);
            }
            break;
          }
        }
      }
    }

    if (!isCourseCode(current)) continue;
    // Guard: skip if previous token ends with "/" (wrapped from .KD Keterangan)
    if (i > 0 && tokens[i - 1].endsWith('/')) continue;

    const kode = current;
    log('KODE_MK_FOUND', { kode, index: i });

    const lookaLimit = Math.min(i + 30, tokens.length);
    let jamIdx = -1;
    for (let j = i + 1; j < lookaLimit; j++) {
      if (isJam(tokens[j])) {
        jamIdx = j;
        break;
      }
    }

    if (jamIdx === -1) {
      const lookaheadSlice = tokens.slice(i + 1, lookaLimit);
      warn('JAM_NOT_FOUND', { kode, lookaheadSlice });
      continue;
    }

    log('JAM_FOUND', { jam: tokens[jamIdx], index: jamIdx });

    const sesiIdx = prevNonSpace(tokens, jamIdx);
    const sesi = sesiIdx >= 0 ? tokens[sesiIdx] : '';
    log('SESI_IGNORED', { sesi });

    // --- Forward detection: find Kelas, SKS, SMT between KodeMK and Sesi ---
    const kelRegex = /^[A-Z](?:\s*,\s*[A-Z]|\*)*$/i;
    let kelasIdx = -1;
    // Find Kelas by scanning backward from Sesi (most distinctive pattern near end)
    if (sesiIdx !== -1) {
      for (let j = sesiIdx - 1; j > i; j--) {
        const t = tokens[j].trim();
        if (t && kelRegex.test(t)) {
          kelasIdx = j;
          break;
        }
      }
    }

    // Find SKS (1-6) and SMT (1-8) backward from Kelas
    let sksIdx = -1;
    let smtIdx = -1;
    if (kelasIdx !== -1) {
      for (let j = kelasIdx - 1; j > i; j--) {
        const t = tokens[j].trim();
        if (!t) continue;
        if (sksIdx === -1 && /^[1-6]$/.test(t)) {
          sksIdx = j;
        } else if (sksIdx !== -1 && smtIdx === -1 && /^[1-8]$/.test(t)) {
          smtIdx = j;
          break;
        }
      }
    }

    // Extract values
    const smt = smtIdx !== -1 ? tokens[smtIdx].trim() : '';
    const sks = sksIdx !== -1 ? tokens[sksIdx].trim() : '';
    const kelas = kelasIdx !== -1 ? tokens[kelasIdx].trim() : '';
    log('KELAS_EXTRACTED', kelas);
    log('SKS_EXTRACTED', sks);
    log('SMT_EXTRACTED', smt);

    // MataKuliah: tokens between course code and SMT (or Kelas if no SMT/SKS found)
    const mkTokens: string[] = [];
    const mkEnd = smtIdx !== -1 ? smtIdx : (kelasIdx !== -1 ? kelasIdx : sesiIdx);
    for (let k = i + 1; k < mkEnd; k++) {
      const t = tokens[k].trim();
      if (t) mkTokens.push(t);
    }
    const mataKuliah = mkTokens.join(' ').trim();
    log('MATA_KULIAH_EXTRACTED', mataKuliah);
    // Guard: reject wrapped tokens from .KD Keterangan
    if (mataKuliah.includes('/') || !mataKuliah || mataKuliah.startsWith('.')) continue;

    // Dosen: tokens between Kelas and Sesi (with or without quotes)
    const dosenParts: string[] = [];
    const dosenStart = kelasIdx !== -1 ? kelasIdx + 1 : sesiIdx;
    for (let k = dosenStart; k < sesiIdx; k++) {
      const t = tokens[k].trim();
      if (t) dosenParts.push(t);
    }
    // Fallback: if no Kelas found, limited scan backward from Sesi (max 8 tokens)
    if (kelasIdx === -1 && dosenParts.length === 0) {
      const limStart = Math.max(i + 1, sesiIdx - 8);
      for (let k = limStart; k < sesiIdx; k++) {
        const t = tokens[k].trim();
        if (t) dosenParts.push(t);
      }
    }
    const rawDosen = dosenParts.join(' ');
    const dosen = rawDosen.replace(/^["'\s]+|["'\s]+$/g, '').trim();
    log('DOSEN_EXTRACTED', dosen);

    const ruangTokens: string[] = [];
    for (let k = jamIdx + 1; k < tokens.length; k++) {
      if (isMetode(tokens[k])) break;
      if (tokens[k].trim()) ruangTokens.push(tokens[k].trim());
    }
    const ruang = ruangTokens.join(' ').trim();
    log('RUANG_EXTRACTED', ruang);

    let metodeIdx = -1;
    for (let k = jamIdx + 1; k < tokens.length; k++) {
      if (isMetode(tokens[k])) {
        metodeIdx = k;
        break;
      }
    }

    let keterangan = '-';
    if (metodeIdx !== -1) {
      const jmlMhsIdx = nextNonSpace(tokens, metodeIdx);
      const firstNonSpace = jmlMhsIdx >= 0 ? nextNonSpace(tokens, jmlMhsIdx) : -1;
      if (firstNonSpace >= 0) {
        if (isHari(tokens[firstNonSpace])) {
          keterangan = '-';
        } else {
          const ketTokens: string[] = [];
          for (let k = firstNonSpace; k < tokens.length; k++) {
            if (isHari(tokens[k])) break;
            if (tokens[k].trim()) ketTokens.push(tokens[k].trim());
          }
          keterangan = ketTokens.join(' ').trim();
        }
      }
    }
    log('KETERANGAN_EXTRACTED', keterangan);

    // Per-row day detection: scan after jam for "N. DayName" or "- DayName" tokens
    // This handles new PDF format where day is a column value per row, not a section header
    let hariPerRow = '';
    const dayRowScanStart = metodeIdx !== -1 ? metodeIdx : jamIdx + 1;
    for (let k = dayRowScanStart; k < Math.min(dayRowScanStart + 15, tokens.length); k++) {
      const t = tokens[k].trim();
      const rowDayMatch = t.match(/^(?:\d+\.\s*|-\s*)(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)$/i);
      if (rowDayMatch) {
        hariPerRow = rowDayMatch[1];
        break;
      }
    }
    // Use per-row day if found, otherwise fall back to section header hariGlobal
    const hariFinal = hariPerRow || hariGlobal;
    log('HARI_FINAL', { hariPerRow, hariGlobal, hariFinal });

    dataTeoriMentah.push({
      id: `theory-${dataTeoriMentah.length}`,
      KodeMK: kode,
      MataKuliah: mataKuliah,
      Kelas: kelas,
      SKS: sks,
      SMT: smt,
      DosenPengampuh: dosen,
      Hari: hariFinal,
      Jam: tokens[jamIdx].trim(),
      Ruang: ruang,
      Keterangan: keterangan,
    });
    log('ROW_ADDED', { total: dataTeoriMentah.length });
  }

  log('RESULT', { total: dataTeoriMentah.length, first3: dataTeoriMentah.slice(0, 3) });

  self.postMessage({
    type: 'RESULT',
    data: dataTeoriMentah,
  });
};