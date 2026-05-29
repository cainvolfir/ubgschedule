function log(step: string, data?: unknown) {
  self.postMessage({ type: 'LOG', step, data });
}
function sendError(step: string, data?: unknown) {
  self.postMessage({ type: 'ERROR', step, data });
}

const HARI_PATTERN = /^(?:Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)/i;

interface MatchedRow {
  MataKuliah: string;
  DosenPengampuh: string;
  SKS: string;
  SMT: string;
  Kelas: string;
  KodeMK: string;
  Jam: string;
  Hari: string;
  Ruang: string;
  Keterangan: string;
}

function normalizeCell(raw: string): string {
  return raw
    .replace(/[\[\]|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSubKelas(raw: string): { kelasNormal: string; subKelas: string } {
  const cleaned = normalizeCell(raw);
  const match = cleaned.match(/\b([A-Z])(\d+)\b/);
  if (match) {
    return { kelasNormal: match[1], subKelas: cleaned };
  }
  return { kelasNormal: cleaned.replace(/\d+/g, '').trim(), subKelas: cleaned };
}

function fuzzyMatch(a: string, b: string): boolean {
  const clean = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const ca = clean(a);
  const cb = clean(b);
  if (ca === cb) return true;
  if (ca.includes(cb) || cb.includes(ca)) return true;
  return false;
}

self.onmessage = async (e: MessageEvent) => {
  const { type, fileBuffer, jadwalTeoriTerpilih } = e.data;
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
    const data = new Uint8Array(fileBuffer);
    log('PARSE', `Buffer size: ${data.byteLength} bytes`);
    workbook = XLSX.read(data, { type: 'array' });
    log('PARSE', `Sheets: ${workbook.SheetNames.join(', ')}`);
  } catch (err) {
    sendError('PARSE', err instanceof Error ? err.message : String(err));
    return;
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const matrix: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  log('MATRIX', `Dimensions: ${matrix.length} rows x ${matrix[0]?.length ?? 0} cols`);

  if (!jadwalTeoriTerpilih || jadwalTeoriTerpilih.length === 0) {
    sendError('INPUT', 'No jadwalTeoriTerpilih provided');
    return;
  }
  log('REFERENCE', `${jadwalTeoriTerpilih.length} theory rows to match`);

  const mergeMap = new Map<string, MatchedRow[]>();

  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      const cell = normalizeCell(matrix[r][c]);
      if (!cell) continue;

      const { kelasNormal, subKelas } = extractSubKelas(cell);
      if (!kelasNormal) continue;

      for (const ref of jadwalTeoriTerpilih) {
        if (kelasNormal !== ref.Kelas) continue;
        if (ref.SMT && !fuzzyMatch(cell, ref.SMT)) continue;

        if (!fuzzyMatch(cell, ref.MataKuliah) && !fuzzyMatch(cell, ref.KodeMK)) continue;
        if (ref.DosenPengampuh && !fuzzyMatch(cell, ref.DosenPengampuh)) continue;

        let hari = '';
        let ruang = '';
        let checkRow = r - 1;
        while (checkRow >= 0) {
          const above = normalizeCell(matrix[checkRow][c] || '');
          if (HARI_PATTERN.test(above)) {
            hari = above.replace(/[^a-zA-Z]/g, '').trim();
            const ruangAbove = normalizeCell(matrix[checkRow - 1]?.[c] || '');
            if (ruangAbove && !HARI_PATTERN.test(ruangAbove)) {
              ruang = ruangAbove;
            }
            break;
          }
          checkRow--;
        }

        const jam = normalizeCell(matrix[r][0] || '');

        const mergeKey = `${hari}|${ruang}|${ref.KodeMK}|${kelasNormal}|${jam}`;
        if (!mergeMap.has(mergeKey)) {
          mergeMap.set(mergeKey, []);
        }
        mergeMap.get(mergeKey)!.push({
          MataKuliah: ref.MataKuliah,
          DosenPengampuh: ref.DosenPengampuh,
          SKS: ref.SKS,
          SMT: ref.SMT,
          Kelas: kelasNormal,
          KodeMK: ref.KodeMK,
          Jam: jam,
          Hari: hari,
          Ruang: ruang,
          Keterangan: subKelas,
        });

        log('MATCH', { row: r, col: c, cell, matched: ref.KodeMK, kelas: kelasNormal, subKelas });
        break;
      }
    }
  }

  const dataPraktikum: MatchedRow[] = [];
  for (const rows of mergeMap.values()) {
    if (rows.length === 0) continue;
    const first = rows[0];
    if (rows.length === 1) {
      dataPraktikum.push(first);
    } else {
      const totalSKS = rows.reduce((sum, r) => sum + (parseInt(r.SKS) || 0), 0);
      const jamStart = first.Jam.split('-')[0]?.trim() || first.Jam;
      const jamEnd = rows[rows.length - 1].Jam.split('-')[1]?.trim() || rows[rows.length - 1].Jam;
      dataPraktikum.push({
        ...first,
        SKS: String(totalSKS),
        Jam: `${jamStart}-${jamEnd}`,
      });
    }
  }

  log('RESULT', `Parsed ${dataPraktikum.length} practical schedule rows`);

  self.postMessage({
    type: 'RESULT',
    data: dataPraktikum,
  });
};
