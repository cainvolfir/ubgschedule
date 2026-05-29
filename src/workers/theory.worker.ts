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

const HARI_PATTERN = /^(?:\d+\.\s*)?(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)/i;

function isJam(s: string): boolean {
  return /^\d{2}\.\d{2}\s*-\s*\d{2}\.\d{2}$/.test(s.trim());
}

function isMetode(s: string): boolean {
  return ['Offline', 'Online', 'Blended'].includes(s.trim());
}

function isHari(s: string): boolean {
  return HARI_PATTERN.test(s.trim());
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

self.onmessage = async (e: MessageEvent) => {
  const { type, fileBuffer, kodeMKTerverifikasi } = e.data;
  if (type !== 'PARSE_THEORY') return;

  log('INIT', 'Starting Theory parser worker');
  log('KODE_MK_VERIFIED', kodeMKTerverifikasi);

  let pdfjsLib: typeof import('pdfjs-dist');
  try {
    pdfjsLib = await import('pdfjs-dist');
    log('INIT', 'pdfjs-dist loaded dynamically');
  } catch (err) {
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

    const perHariMatch = current.match(/^\.Perkuliahan\s+Hari\s+(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)/i);
    if (perHariMatch && HARI_INDONESIA.includes(perHariMatch[1])) {
      hariGlobal = perHariMatch[1];
      log('HARI_DETECTED', hariGlobal);
    }

    if (!kodeMKTerverifikasi.includes(current)) continue;

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

    const dosenParts: string[] = [];
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
    log('DOSEN_EXTRACTED', dosen);

    let smtIdx = -1;
    let kelas = '';
    let sks = '';
    let smt = '';
    if (dosenStartIdx >= 0) {
      const ki = prevNonSpace(tokens, dosenStartIdx);
      if (ki >= 0) {
        const raw = tokens[ki].trim();
        if (raw.length === 1 && /^[A-Z]$/.test(raw)) {
          kelas = raw;
          const si = prevNonSpace(tokens, ki);
          if (si >= 0) {
            sks = tokens[si].trim();
            const sti = prevNonSpace(tokens, si);
            if (sti >= 0) {
              smt = tokens[sti].trim();
              smtIdx = sti;
            }
          }
        }
      }
    }
    log('KELAS_EXTRACTED', kelas);
    log('SKS_EXTRACTED', sks);
    log('SMT_EXTRACTED', smt);

    const mkTokens: string[] = [];
    const mkStart = smtIdx >= 0 ? smtIdx : (dosenStartIdx >= 0 ? dosenStartIdx : sesiIdx);
    for (let k = mkStart - 1; k >= i; k--) {
      if (!tokens[k].trim()) continue;
      if (kodeMKTerverifikasi.includes(tokens[k].trim())) break;
      mkTokens.push(tokens[k]);
    }
    const mataKuliah = mkTokens.reverse().join(' ').trim();
    log('MATA_KULIAH_EXTRACTED', mataKuliah);

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

    dataTeoriMentah.push({
      KodeMK: kode,
      MataKuliah: mataKuliah,
      Kelas: kelas,
      SKS: sks,
      SMT: smt,
      DosenPengampuh: dosen,
      Hari: hariGlobal,
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
