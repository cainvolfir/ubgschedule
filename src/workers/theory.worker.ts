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

function cleanQuoteReverse(acc: string[]): string {
  const joined = acc.reverse().join(' ');
  return joined.replace(/^["'\s]+|["'\s]+$/g, '').trim();
}

function isMetode(s: string): boolean {
  return ['Offline', 'Online', 'Blended'].includes(s.trim());
}

function isHari(s: string): boolean {
  return HARI_PATTERN.test(s.trim());
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

    if (i >= 2) {
      const prevPrev = tokens[i - 2].trim();
      const prev = tokens[i - 1].trim();

      const hariMatch = current.match(HARI_PATTERN);
      if (
        hariMatch &&
        prev === 'Hari' &&
        prevPrev === '.Perkuliahan'
      ) {
        const detected = hariMatch[1];
        if (HARI_INDONESIA.includes(detected)) {
          hariGlobal = detected;
          log('HARI_DETECTED', hariGlobal);
        }
      }
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

    const sesiToken = tokens[jamIdx - 1];
    log('SESI_IGNORED', { sesi: sesiToken });

    const dosenTokens: string[] = [];
    let foundQuote = false;
    for (let k = jamIdx - 2; k >= 0; k--) {
      const t = tokens[k].trim();
      if (t === '"' || t === "'") {
        dosenTokens.push(t);
        foundQuote = true;
        break;
      }
      dosenTokens.push(t);
    }
    const dosen = foundQuote ? cleanQuoteReverse(dosenTokens) : dosenTokens.reverse().join(' ').trim();
    log('DOSEN_EXTRACTED', dosen);

    let kelas = '';
    if (jamIdx - 3 >= 0) {
      kelas = tokens[jamIdx - 3].trim();
      if (kelas.length !== 1 || !/^[A-Z]$/.test(kelas)) {
        kelas = '';
      }
    }
    log('KELAS_EXTRACTED', kelas);

    let sks = '';
    if (jamIdx - 4 >= 0) {
      sks = tokens[jamIdx - 4].trim();
    }
    log('SKS_EXTRACTED', sks);

    let smt = '';
    if (jamIdx - 5 >= 0) {
      smt = tokens[jamIdx - 5].trim();
    }
    log('SMT_EXTRACTED', smt);

    const mataKuliahTokens: string[] = [];
    for (let k = jamIdx - 6; k >= 0; k--) {
      const t = tokens[k].trim();
      if (kodeMKTerverifikasi.includes(t)) break;
      mataKuliahTokens.push(t);
    }
    const mataKuliah = mataKuliahTokens.reverse().join(' ').trim();
    log('MATA_KULIAH_EXTRACTED', mataKuliah);

    const ruangTokens: string[] = [];
    for (let k = jamIdx + 1; k < tokens.length; k++) {
      const t = tokens[k].trim();
      if (isMetode(t)) break;
      ruangTokens.push(t);
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
      const jmlMhsIdx = metodeIdx + 1;
      const afterJmlMhs = jmlMhsIdx + 1;
      if (afterJmlMhs < tokens.length) {
        const next = tokens[afterJmlMhs].trim();
        if (isHari(next)) {
          keterangan = '-';
        } else {
          const ketTokens: string[] = [];
          for (let k = afterJmlMhs; k < tokens.length; k++) {
            if (isHari(tokens[k])) break;
            ketTokens.push(tokens[k].trim());
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
