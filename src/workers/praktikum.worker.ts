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

function extractPackedCell(raw: string): {
  courseName: string;
  kelas: string;
  subKelas: string;
  ruang: string;
  sks: string;
  dosen: string;
} | null {
  if (!raw || String(raw).trim() === '') return null;
  const s = String(raw).trim();
  const parts = s.split('|').map((p) => p.trim());

  const coursePart = parts[0] || s;
  let courseStripped = stripRomanNumerals(coursePart);
  courseStripped = courseStripped.replace(/\s*\*{2,}\s*(?:\(.*?\))?\s*$/, '').trim();

  let kelas = '';
  let subKelas = '';
  let courseName = courseStripped;

  const subClassMatch = courseStripped.match(/\s+([A-Za-z])(\d+)\s*$/);
  if (subClassMatch) {
    kelas = subClassMatch[1].toUpperCase();
    subKelas = subClassMatch[1] + subClassMatch[2];
    courseName = courseStripped.slice(0, subClassMatch.index).trim();
  } else {
    const classMatch = courseStripped.match(/\s+([A-Za-z])\s*$/);
    if (classMatch) {
      kelas = classMatch[1].toUpperCase();
      courseName = courseStripped.slice(0, classMatch.index).trim();
    }
  }

  // Normalize duplicate consecutive numbers (e.g., "Pemrograman 4 4" -> "Pemrograman 4")
  courseName = courseName.replace(/(\d+)\s+\1/g, '$1').trim();

  let ruang = '';
  let sks = '';
  let dosen = '';

  if (parts.length >= 2) {
    const locPart = parts.slice(1).join('|').trim();

    const sksMatch = locPart.match(/\[(\d+)\]/);
    if (sksMatch) sks = sksMatch[1];

    let remaining = locPart.replace(/\[\d+\]/g, '').trim();

    const quoteMatch = remaining.match(/["\u201c]([^"\u201d]+)/);
    if (quoteMatch) {
      dosen = quoteMatch[1].trim();
      remaining = remaining.replace(/["\u201c][^"\u201d]*/, '').trim();
    } else {
      const afterBracket = remaining.match(/\](.*?)$/);
      if (afterBracket) {
        dosen = afterBracket[1].trim();
        if (dosen.startsWith('[')) dosen = dosen.slice(1).trim();
      } else {
        const openBracket = remaining.match(/\[(.+)$/);
        if (openBracket) {
          dosen = openBracket[1].trim();
        }
      }
    }

    const ruangMatch = remaining.match(/^([A-Za-z0-9\s\-&,/]+?)(?:\s*\[\d+\])/);
    if (ruangMatch) {
      ruang = ruangMatch[1].trim();
    } else {
      const roomPattern = remaining.match(/^([A-Za-z\s]+[\d\s\-]+[A-Za-z0-9]*)/);
      if (roomPattern) {
        ruang = roomPattern[1].trim();
        // Remove extracted ruang from remaining, check if dosen follows
        const afterRuang = remaining.slice(roomPattern[0].length).trim();
        if (!dosen && afterRuang.startsWith('[')) {
          dosen = afterRuang.slice(1).trim();
        }
      }
    }
	// Final cleanup: if ruang and dosen overlap, prefer dosen as text after [ ]
    if (ruang && !dosen) {
      const bracketIdx = ruang.indexOf('[');
      if (bracketIdx >= 0) {
        dosen = ruang.slice(bracketIdx + 1).trim();
        ruang = ruang.slice(0, bracketIdx).trim();
      }
    }
  }

  return { courseName, kelas, subKelas, ruang, sks, dosen };
}

  const normalized = matrix.map((row) => row.map((cell) => normalizeCell(stripRomanNumerals(cell))));
  const sampleBefore = matrix.flat().find((c) => c && c.length > 0);
  const sampleAfter = normalized.flat().find((c) => c && c.length > 0);
  log('NORMALIZE', { before: sampleBefore || '(empty)', after: sampleAfter || '(empty)' });

  // Log packed cell samples for debugging
  const packedSamples: any[] = [];
  for (let r = 0; r < Math.min(matrix.length, 30); r++) {
    for (let c = 1; c < (matrix[r] || []).length; c++) {
      const parsed = extractPackedCell(matrix[r][c]);
      if (parsed && parsed.kelas && packedSamples.length < 5) {
        packedSamples.push({ row: r, col: c, raw: matrix[r][c], ...parsed });
      }
    }
  }
  log('PACKED_SAMPLES', packedSamples);

  let semester = '';
  for (let r = 0; r < Math.min(matrix.length, 20); r++) {
    for (let c = 0; c < (matrix[r] || []).length; c++) {
      const cell = String(matrix[r][c] || '').toUpperCase();
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

  const kelasSamples: { raw: string; kelas: string; subKelas: string }[] = [];
  for (let r = 0; r < Math.min(matrix.length, 50); r++) {
    for (let c = 1; c < (matrix[r] || []).length; c++) {
      const parsed = extractPackedCell(matrix[r][c]);
      if (parsed && parsed.kelas && parsed.subKelas && kelasSamples.length < 5) {
        kelasSamples.push({ raw: matrix[r][c], kelas: parsed.kelas, subKelas: parsed.subKelas });
      }
    }
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
    courseName: string;
    kelas: string;
    subKelas: string;
    ruang: string;
    dosen: string;
    sks: string;
    matchedKodeMK: string;
    matchedMataKuliah: string;
    matchedDosen: string;
    matchScore: number;
  }

  const candidates: CandidateRow[] = [];

  for (let r = 0; r < matrix.length; r++) {
    for (let c = 1; c < (matrix[r] || []).length; c++) {
      const parsed = extractPackedCell(matrix[r][c]);
      if (!parsed || !parsed.kelas || parsed.courseName.length < 3) continue;

      for (const ref of jadwalTeoriTerpilih) {
        if (parsed.kelas !== ref.Kelas) continue;
        if (semester && ref.SMT && semester !== ref.SMT) continue;

        const matchMK = fuzzyMatch(parsed.courseName, ref.MataKuliah);
        const matchKode = fuzzyMatch(parsed.courseName, ref.KodeMK);
        if (!matchMK && !matchKode) continue;

        let matchDosen = true;
        if (ref.DosenPengampuh && ref.DosenPengampuh.length > 0 && parsed.dosen && parsed.dosen.length > 0) {
          matchDosen = fuzzyMatch(parsed.dosen, ref.DosenPengampuh);
        }

        let score = 0;
        if (matchMK || matchKode) score += 2;
        if (matchDosen) score += 1;

        candidates.push({
          row: r,
          col: c,
          cell: matrix[r][c],
          courseName: parsed.courseName,
          kelas: parsed.kelas,
          subKelas: parsed.subKelas,
          ruang: parsed.ruang,
          dosen: parsed.dosen,
          sks: parsed.sks,
          matchedKodeMK: ref.KodeMK,
          matchedMataKuliah: ref.MataKuliah,
          matchedDosen: ref.DosenPengampuh,
          matchScore: score,
        });

        log('CROSS_MATCH', { row: r, col: c, courseName: parsed.courseName, kelas: parsed.kelas, matched: ref.KodeMK, score });
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

    let ruangSpatial = '';
    if (hari && checkRow - 1 >= 0) {
      ruangSpatial = normalizeCell(matrix[checkRow - 1][c.col] || '');
    }
    // Prefer packed cell ruang over spatial
    const finalRuang = c.ruang || ruangSpatial;
    log('SPATIAL_RUANG', { row: c.row, col: c.col, spatial: ruangSpatial || '(empty)', packed: c.ruang || '(empty)', final: finalRuang });

    const jam = normalizeCell(matrix[c.row][0] || '');
    log('SPATIAL_JAM', { row: c.row, col: c.col, jam: jam || '(empty)' });

    const ref = jadwalTeoriTerpilih.find(
      (r: any) => r.KodeMK === c.matchedKodeMK && r.Kelas === c.kelas,
    );
    if (!ref) continue;

    enriched.push({
      KodeMK: c.matchedKodeMK,
      MataKuliah: c.matchedMataKuliah,
      DosenPengampuh: c.matchedDosen,
      SKS: ref.SKS,
      SMT: ref.SMT || semester,
      Kelas: c.kelas,
      Hari: hari,
      Jam: jam,
      Ruang: finalRuang,
      Keterangan: c.subKelas || c.kelas,
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
      enriched[j].Hari === current.Hari &&
      enriched[j].Ruang === current.Ruang &&
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
      log('SKS_MERGE', { KodeMK: current.KodeMK, Kelas: current.Kelas, individual: group.map((r) => r.SKS).join('+'), total: totalSKS });

      const jams = group.map((r) => r.Jam).filter(Boolean);
      const allStarts = jams.flatMap((j) => j.split(/[-\s]/)[0] ? [j.split(/[-\s]/)[0]] : []);
      const allEnds = jams.flatMap((j) => { const p = j.split(/[-\s]/); return p.length > 1 ? [p[p.length - 1]] : []; });
      const jamStart = allStarts.sort()[0] || '';
      const jamEnd = allEnds.sort().pop() || '';
      const mergedJam = jamStart && jamEnd ? `${jamStart}-${jamEnd}` : jams[0] || '';
      log('TIME_MERGE', { KodeMK: current.KodeMK, Kelas: current.Kelas, ranges: jams, minStart: jamStart, maxEnd: jamEnd, merged: mergedJam });

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
    }

    i = j;
  }

  log('MERGED', `Final practical rows: ${merged.length} (from ${enriched.length} enriched)`);

  self.postMessage({
    type: 'RESULT',
    data: { matched: merged, matrix, refCount: jadwalTeoriTerpilih.length },
  });
};
