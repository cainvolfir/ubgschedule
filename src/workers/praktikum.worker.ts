function log(step: string, data?: unknown) {
  self.postMessage({ type: 'LOG', step, data });
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
  return raw.replace(/[[\]|]/g, ' ').replace(/\s+/g, ' ').trim();
}

function stripRomanNumerals(text: string): string {
  const upper = text.toUpperCase();
  for (const [roman, digit] of Object.entries(ROMAN_MAP)) {
    const regex = new RegExp(`\\b${roman}\\b`, 'g');
    if (regex.test(upper)) return text.replace(regex, digit);
  }
  return text;
}

const HARI_PATTERN = /^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)/i;

const ROOM_PREFIX_PATTERN = /([A-Za-z][A-Za-z0-9]*)\s+\d{1,3}\s*[-–]\s*\d{1,3}/;

async function loadXLSX(file: Uint8Array | ArrayBuffer): Promise<{ XLSX: typeof import('xlsx'); matrix: string[][] }> {
  const XLSX = await import('xlsx');
  const data = new Uint8Array(file);
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const matrix: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  return { XLSX, matrix };
}

function extractRoomPrefixes(matrix: string[][]): string[] {
  const prefixSet = new Set<string>();
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 1; c < (matrix[r] || []).length; c++) {
      const cell = String(matrix[r][c] || '').trim();
      if (!cell) continue;
      const parts = cell.split('|').map((p) => p.trim());
      const scanPart = parts.length >= 2 ? parts.slice(1).join('|') : '';
      if (!scanPart) continue;
      const match = scanPart.match(ROOM_PREFIX_PATTERN);
      if (match) {
        prefixSet.add(match[1].toUpperCase());
      }
    }
  }
  return Array.from(prefixSet).sort();
}

function parseCoursePart(coursePart: string): { courseName: string; kelas: string; keterangan: string } {
  let text = stripRomanNumerals(coursePart.trim());
  text = text.replace(/\s*\*{2,}\s*(?:\(.*?\))?\s*$/, '').trim();

  let kelas = '';
  let keterangan = '';
  let courseName = text;

  const subClassMatch = text.match(/\s+([A-Za-z])(\d+)\s*$/);
  if (subClassMatch) {
    kelas = subClassMatch[1].toUpperCase();
    keterangan = subClassMatch[1] + subClassMatch[2];
    courseName = text.slice(0, subClassMatch.index).trim();
  } else {
    const classMatch = text.match(/\s+([A-Za-z])\s*$/);
    if (classMatch) {
      kelas = classMatch[1].toUpperCase();
      courseName = text.slice(0, classMatch.index).trim();
    }
  }

  if (kelas) {
    courseName = courseName.replace(/\s+\d+\s*$/, '').trim();
  }
  courseName = courseName.replace(/(\d+)\s+\1/g, '$1').trim();

  return { courseName, kelas, keterangan };
}

function extractSemesterAndDosen(locPart: string): { semester: string; dosen: string } {
  const bracketSem = locPart.match(/\[(\d+)\]/);
  const semester = bracketSem ? bracketSem[1] : '';
  let dosen = '';
  if (bracketSem) {
    let after = locPart.slice(bracketSem.index! + bracketSem[0].length).trim();
    after = after.replace(/^\[/, '').trim();
    const quoteMatch = after.match(/^["\u201c]([^"\u201d]+)/);
    if (quoteMatch) {
      dosen = quoteMatch[1].trim();
    } else {
      dosen = after.replace(/\]$/, '').trim();
    }
  } else {
    const standAlone = locPart.match(/(\d+)\s*\[(.+)$/);
    if (standAlone) {
      dosen = standAlone[2].trim();
    }
  }
  return { semester, dosen };
}

function findDataRows(matrix: string[][]): { startRow: number; dayRow: number } {
  let dayRow = -1;
  let startRow = -1;
  for (let r = 0; r < Math.min(matrix.length, 40); r++) {
    const row = matrix[r] || [];
    for (let c = 1; c < row.length; c++) {
      if (HARI_PATTERN.test(String(row[c] || ''))) {
        dayRow = r;
        break;
      }
    }
    if (dayRow >= 0) break;
  }
  if (dayRow >= 0) {
    for (let r = dayRow + 1; r < matrix.length; r++) {
      const cell = String(matrix[r]?.[0] || '').trim();
      if (/^\d{1,2}[.:]\d{2}\s*[-–]\s*\d{1,2}[.:]\d{2}$/.test(cell)) {
        startRow = r;
        break;
      }
    }
  }
  return { startRow, dayRow };
}

function spatialHari(matrix: string[][], row: number, col: number): { hari: string; stepsUp: number } {
  let checkRow = row - 1;
  let stepsUp = 0;
  while (checkRow >= 0) {
    const cell = normalizeCell(matrix[checkRow]?.[col] || '');
    const m = cell.match(HARI_PATTERN);
    if (m) {
      const h = m[1];
      return { hari: h.charAt(0).toUpperCase() + h.slice(1).toLowerCase(), stepsUp };
    }
    checkRow--;
    stepsUp++;
  }
  return { hari: '', stepsUp };
}

self.onmessage = async (e: MessageEvent) => {
  const { type, file } = e.data;

  if (type === 'SCAN_XLSX') {
    log('SCAN', 'Scanning for room prefixes');
    try {
      const { matrix } = await loadXLSX(file);
      log('MATRIX', `Dimensions: ${matrix.length} rows x ${matrix[0]?.length ?? 0} cols`);
      const prefixes = extractRoomPrefixes(matrix);
      log('PREFIXES', prefixes);
      self.postMessage({ type: 'SCAN_RESULT', data: { prefixes, matrix } });
    } catch (err) {
      sendError('SCAN', err instanceof Error ? err.message : String(err));
    }
    return;
  }

  const { roomPrefix } = e.data;

  if (type !== 'PARSE_PRAKTIKUM' || !roomPrefix) return;

  log('PARSE', `Parsing with roomPrefix: ${roomPrefix}`);

  let matrix: string[][];
  try {
    const loaded = await loadXLSX(file);
    matrix = loaded.matrix;
  } catch (err) {
    sendError('PARSE', err instanceof Error ? err.message : String(err));
    return;
  }

  log('MATRIX_SAMPLE', matrix.slice(0, 10));

  const { startRow, dayRow } = findDataRows(matrix);
  log('ROWS', { startRow, dayRow });
  if (startRow < 0) {
    sendError('PARSE', 'No data rows found');
    return;
  }

  const candidates: {
    id: string;
    row: number;
    col: number;
    courseName: string;
    kelas: string;
    keterangan: string;
    dosen: string;
    semester: string;
    rawCell: string;
    timeStr: string;
    hari: string;
    jam: string;
    ruang: string;
  }[] = [];

  for (let r = startRow; r < matrix.length; r++) {
    const row = matrix[r] || [];
    const timeCell = String(row[0] || '').trim();
    if (!/^\d{1,2}[.:]\d{2}\s*[-–]\s*\d{1,2}[.:]\d{2}$/.test(timeCell)) continue;

    for (let c = 1; c < row.length; c++) {
      const raw = String(row[c] || '').trim();
      if (!raw) continue;

      const parts = raw.split('|').map((p) => p.trim());
      const locPart = parts.length >= 2 ? parts.slice(1).join('|') : '';
      if (!locPart.toUpperCase().includes(roomPrefix)) continue;

      const coursePart = parts[0];
      const { courseName, kelas, keterangan } = parseCoursePart(coursePart);
      if (!kelas || courseName.length < 2) continue;

      const { semester, dosen } = extractSemesterAndDosen(locPart);
      const { hari } = spatialHari(matrix, r, c);

      let ruangSpatial = '';
      let hariRow = r - 1;
      while (hariRow >= 0) {
        const cell = normalizeCell(matrix[hariRow]?.[c] || '');
        if (HARI_PATTERN.test(cell)) {
          if (hariRow - 1 >= 0) {
            ruangSpatial = normalizeCell(matrix[hariRow - 1]?.[c] || '');
          }
          break;
        }
        hariRow--;
      }

      const jam = normalizeCell(timeCell);

      const id = `praktikum-${r}-${c}`;
      candidates.push({
        id,
        row: r,
        col: c,
        courseName,
        kelas,
        keterangan,
        dosen,
        semester,
        rawCell: raw,
        timeStr: timeCell,
        hari,
        jam,
        ruang: ruangSpatial,
      });
    }
  }

  log('CANDIDATES', `Found ${candidates.length} candidates for prefix ${roomPrefix}`);

  candidates.sort((a, b) => a.row - b.row);

  const merged: typeof candidates = [];
  let i = 0;
  while (i < candidates.length) {
    const current = candidates[i];
    const group = [current];
    let j = i + 1;
    while (
      j < candidates.length &&
      candidates[j].col === current.col &&
      candidates[j].courseName === current.courseName &&
      candidates[j].kelas === current.kelas &&
      candidates[j].hari === current.hari &&
      Math.abs(candidates[j].row - candidates[j - 1].row) <= 2
    ) {
      group.push(candidates[j]);
      j++;
    }

    if (group.length === 1) {
      merged.push(current);
    } else {
      const jams = group.map((g) => g.jam).filter(Boolean);
      const allStarts = jams.flatMap((t) => (t.split(/[-\s]/)[0] ? [t.split(/[-\s]/)[0]] : []));
      const allEnds = jams.flatMap((t) => {
        const p = t.split(/[-\s]/);
        return p.length > 1 ? [p[p.length - 1]] : [];
      });
      const mergedJam = allStarts.sort()[0] && allEnds.sort().pop() ? `${allStarts.sort()[0]}-${allEnds.sort().pop()}` : current.jam;

      merged.push({
        ...current,
        jam: mergedJam,
      });

      log('MERGE', { courseName: current.courseName, kelas: current.kelas, count: group.length, jam: mergedJam });
    }

    i = j;
  }

  log('MERGED', `Final merged candidates: ${merged.length} (from ${candidates.length})`);

  self.postMessage({
    type: 'PARSE_RESULT',
    data: { candidates: merged, matrix, roomPrefix },
  });
};
