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

  if (!jadwalTeoriTerpilih || jadwalTeoriTerpilih.length === 0) {
    warn('INPUT', 'No jadwalTeoriTerpilih provided');
    self.postMessage({ type: 'RESULT', data: { matched: [], matrix } });
    return;
  }
  log('REFERENCE', `${jadwalTeoriTerpilih.length} theory rows to match`);

  self.postMessage({
    type: 'RESULT',
    data: { matched: [], matrix, refCount: jadwalTeoriTerpilih.length },
  });
};
