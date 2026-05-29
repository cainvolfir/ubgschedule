function log(step: string, data?: unknown) {
  self.postMessage({ type: 'LOG', step, data });
}

function warn(step: string, data?: unknown) {
  self.postMessage({ type: 'WARN', step, data });
}

function sendError(step: string, data?: unknown) {
  self.postMessage({ type: 'ERROR', step, data });
}

const ROMAN_MAP: Record<string, string> = {
  I: '1', II: '2', III: '3', IV: '4', V: '5',
  VI: '6', VII: '7', VIII: '8', IX: '9', X: '10',
  XI: '11', XII: '12', XIII: '13', XIV: '14', XV: '15',
};

function normalizeCell(raw: string): string {
  return raw
    .replace(/[\[\]|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripRomanNumerals(text: string): string {
  const upper = text.toUpperCase();
  for (const [roman, digit] of Object.entries(ROMAN_MAP)) {
    const regex = new RegExp(`\\b${roman}\\b`, 'g');
    if (regex.test(upper)) {
      return text.replace(regex, digit);
    }
  }
  return text;
}

function extractSubKelas(raw: string): { kelasNormal: string; kelasOriginal: string } {
  const cleaned = normalizeCell(raw);
  const match = cleaned.match(/\b([A-Za-z])(\d+)\b/);
  if (match) {
    return { kelasNormal: match[1].toUpperCase(), kelasOriginal: cleaned };
  }
  return { kelasNormal: cleaned.replace(/\d+/g, '').trim(), kelasOriginal: cleaned };
}

function fuzzyMatch(a: string, b: string): boolean {
  const clean = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
  const ca = clean(a);
  const cb = clean(b);
  if (!ca || !cb) return false;
  if (ca === cb) return true;
  if (ca.includes(cb) || cb.includes(ca)) return true;
  return false;
}

const HARI_PATTERN = /^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)/i;

self.onmessage = async (e: MessageEvent) => {
  const { type, file, jadwalTeoriTerpilih } = e.data;
  if (type !== 'PARSE_PRAKTIKUM') return;

  log('INIT', 'Starting praktikum parser worker');

  let XLSX: typeof import('xlsx');
  try {
    XLSX = await import('xlsx');
    log('INIT', 'xlsx loaded dynamically');
  } catch (err) {
    sendError('IMPORT', 'Failed to load xlsx');
    return;
  }

  let workbook: import('xlsx').WorkBook;
  try {
    const data = new Uint8Array(file);
    log('PARSE', `Buffer size: ${data.byteLength} bytes`);
    workbook = XLSX.read(data, { type: 'array' });
    log('PARSE', `Sheets: ${workbook.SheetNames.join(', ')}`);
  } catch (err) {
    sendError('PARSE', err instanceof Error ? err.message : String(err));
    return;
  }

  const sheetName = workbook.SheetNames[0];
  log('SHEET', `Using sheet: "${sheetName}"`);
  const sheet = workbook.Sheets[sheetName];
  const matrix: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  log('MATRIX', `Dimensions: ${matrix.length} rows x ${matrix[0]?.length ?? 0} cols`);
  log('MATRIX_SAMPLE', matrix.slice(0, 100));

  const normalized = matrix.map((row) => row.map((cell) => normalizeCell(stripRomanNumerals(cell))));
  const sampleBefore = matrix.flat().find((c) => c && c.length > 0);
  const sampleAfter = normalized.flat().find((c) => c && c.length > 0);
  log('NORMALIZE', { before: sampleBefore || '(empty)', after: sampleAfter || '(empty)' });

  let semester = '';
  for (let r = 0; r < Math.min(normalized.length, 20); r++) {
    for (let c = 0; c < normalized[r].length; c++) {
      const cell = normalized[r][c].toUpperCase();
      const semMatch = cell.match(/SEMESTER\s*[:\-]?\s*(\d{1,2})/i);
      if (semMatch) {
        semester = semMatch[1];
        log('SEMESTER', { row: r, col: c, raw: matrix[r][c], parsed: semester });
        break;
      }
    }
    if (semester) break;
  }
  if (!semester) {
    warn('SEMESTER', 'No semester found in first 20 rows');
  }

  const kelasSamples: { raw: string; kelasNormal: string; kelasOriginal: string }[] = [];
  for (let r = 0; r < Math.min(normalized.length, 50); r++) {
    for (let c = 0; c < normalized[r].length; c++) {
      const cell = normalized[r][c];
      if (!cell) continue;
      const { kelasNormal, kelasOriginal } = extractSubKelas(cell);
      if (kelasNormal && kelasOriginal !== kelasNormal) {
        kelasSamples.push({ raw: matrix[r][c], kelasNormal, kelasOriginal });
        if (kelasSamples.length >= 5) break;
      }
    }
    if (kelasSamples.length >= 5) break;
  }
  log('KELAS_SAMPLES', kelasSamples);

  if (!jadwalTeoriTerpilih || jadwalTeoriTerpilih.length === 0) {
    warn('INPUT', 'No jadwalTeoriTerpilih provided');
    self.postMessage({ type: 'RESULT', data: { matched: [], matrix, refCount: 0 } });
    return;
  }
  log('REFERENCE', `${jadwalTeoriTerpilih.length} theory rows to match`);

  interface CandidateRow {
    row: number;
    col: number;
    cell: string;
    kelasNormal: string;
    kelasOriginal: string;
    matchedKodeMK: string;
    matchedMataKuliah: string;
    matchedDosen: string;
    matchScore: number;
  }

  const candidates: CandidateRow[] = [];

  for (let r = 0; r < normalized.length; r++) {
    for (let c = 0; c < normalized[r].length; c++) {
      const cell = normalized[r][c];
      if (!cell || cell.length < 3) continue;

      const { kelasNormal, kelasOriginal } = extractSubKelas(cell);
      if (!kelasNormal) continue;

      for (const ref of jadwalTeoriTerpilih) {
        if (kelasNormal !== ref.Kelas) continue;
        if (semester && ref.SMT && semester !== ref.SMT) continue;

        const matchMK = fuzzyMatch(cell, ref.MataKuliah);
        const matchKode = fuzzyMatch(cell, ref.KodeMK);
        if (!matchMK && !matchKode) continue;

        let matchDosen = true;
        if (ref.DosenPengampuh && ref.DosenPengampuh.length > 0) {
          matchDosen = fuzzyMatch(cell, ref.DosenPengampuh);
        }

        let score = 0;
        if (matchMK || matchKode) score += 2;
        if (matchDosen) score += 1;

        candidates.push({
          row: r,
          col: c,
          cell,
          kelasNormal,
          kelasOriginal,
          matchedKodeMK: ref.KodeMK,
          matchedMataKuliah: ref.MataKuliah,
          matchedDosen: ref.DosenPengampuh,
          matchScore: score,
        });

        log('CROSS_MATCH', { row: r, col: c, cell, matched: ref.KodeMK, score });
        break;
      }
    }
  }

  log('CROSS_RESULT', `Found ${candidates.length} candidate matches`);

  interface EnrichedRow {
    KodeMK: string;
    MataKuliah: string;
    DosenPengampuh: string;
    SKS: string;
    SMT: string;
    Kelas: string;
    Hari: string;
    Jam: string;
    Ruang: string;
    Keterangan: string;
    row: number;
    col: number;
    ref: (typeof jadwalTeoriTerpilih)[0];
  }

  const enriched: EnrichedRow[] = [];

  for (const c of candidates) {
    let hari = '';
    let stepsUp = 0;
    let checkRow = c.row - 1;
    while (checkRow >= 0) {
      const cell = normalizeCell(matrix[checkRow][c.col] || '');
      if (HARI_PATTERN.test(cell)) {
        hari = cell.match(HARI_PATTERN)![1];
        hari = hari.charAt(0).toUpperCase() + hari.slice(1).toLowerCase();
        break;
      }
      checkRow--;
      stepsUp++;
    }
    log('SPATIAL_HARI', { row: c.row, col: c.col, hari: hari || '(not found)', stepsUp });

    let ruang = '';
    if (hari && checkRow - 1 >= 0) {
      ruang = normalizeCell(matrix[checkRow - 1][c.col] || '');
    }
    log('SPATIAL_RUANG', { row: c.row, col: c.col, ruang: ruang || '(empty)' });

    const jam = normalizeCell(matrix[c.row][0] || '');
    log('SPATIAL_JAM', { row: c.row, col: c.col, jam: jam || '(empty)' });

    const ref = jadwalTeoriTerpilih.find(
      (r: any) => r.KodeMK === c.matchedKodeMK && r.Kelas === c.kelasNormal,
    );
    if (!ref) continue;

    enriched.push({
      KodeMK: c.matchedKodeMK,
      MataKuliah: c.matchedMataKuliah,
      DosenPengampuh: c.matchedDosen,
      SKS: ref.SKS,
      SMT: ref.SMT || semester,
      Kelas: c.kelasNormal,
      Hari: hari,
      Jam: jam,
      Ruang: ruang,
      Keterangan: c.kelasOriginal,
      row: c.row,
      col: c.col,
      ref,
    });
  }

  log('ENRICHED', `Spatially enriched ${enriched.length} rows`);

  enriched.sort((a, b) => a.row - b.row);

  const merged: (Omit<EnrichedRow, 'row' | 'col' | 'ref'>)[] = [];
  let i = 0;
  while (i < enriched.length) {
    const current = enriched[i];
    const group: EnrichedRow[] = [current];
    let j = i + 1;
    while (
      j < enriched.length &&
      enriched[j].col === current.col &&
      enriched[j].KodeMK === current.KodeMK &&
      enriched[j].Kelas === current.Kelas &&
      Math.abs(enriched[j].row - enriched[j - 1].row) <= 2
    ) {
      group.push(enriched[j]);
      j++;
    }

    if (group.length === 1) {
      merged.push({
        KodeMK: current.KodeMK,
        MataKuliah: current.MataKuliah,
        DosenPengampuh: current.DosenPengampuh,
        SKS: current.SKS,
        SMT: current.SMT,
        Kelas: current.Kelas,
        Hari: current.Hari,
        Jam: current.Jam,
        Ruang: current.Ruang,
        Keterangan: current.Keterangan,
      });
    } else {
      const totalSKS = group.reduce((sum, r) => sum + (parseInt(r.SKS) || 0), 0);
      const jamParts = group.map((r) => r.Jam).filter(Boolean);
      const jamStart = jamParts[0]?.split(/[-\s]/)[0] || jamParts[0] || '';
      const jamEnd = jamParts[jamParts.length - 1]?.split(/[-\s]/).pop() || '';
      const mergedJam = jamStart && jamEnd ? `${jamStart}-${jamEnd}` : jamParts[0] || '';

      merged.push({
        KodeMK: current.KodeMK,
        MataKuliah: current.MataKuliah,
        DosenPengampuh: current.DosenPengampuh,
        SKS: String(totalSKS),
        SMT: current.SMT,
        Kelas: current.Kelas,
        Hari: current.Hari,
        Jam: mergedJam,
        Ruang: current.Ruang,
        Keterangan: current.Keterangan,
      });
      log('MERGE', { KodeMK: current.KodeMK, Kelas: current.Kelas, count: group.length, totalSKS, mergedJam });
    }

    i = j;
  }

  log('MERGED', `Final practical rows: ${merged.length} (from ${enriched.length} enriched)`);

  self.postMessage({
    type: 'RESULT',
    data: { matched: merged, matrix, refCount: jadwalTeoriTerpilih.length },
  });
};
