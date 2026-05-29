function log(step: string, data?: unknown) {
  self.postMessage({ type: 'LOG', step, data });
}

function warn(step: string, data?: unknown) {
  self.postMessage({ type: 'WARN', step, data });
}

function sendError(step: string, data?: unknown) {
  self.postMessage({ type: 'ERROR', step, data });
}

self.onmessage = async (e: MessageEvent) => {
  const { type, fileBuffer } = e.data;
  if (type !== 'PARSE_KRS') return;

  log('INIT', 'Starting KRS parser worker');

  let pdfjsLib: typeof import('pdfjs-dist');
  try {
    pdfjsLib = await import('pdfjs-dist');
    log('INIT', 'pdfjs-dist loaded dynamically');
  } catch (err) {
    sendError('IMPORT', 'Failed to load pdfjs-dist');
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc = '';

  let pdf: import('pdfjs-dist').PDFDocumentProxy;
  try {
    const loadingTask = pdfjsLib.getDocument({ data: fileBuffer });
    pdf = await loadingTask.promise;
    log('PARSE', `PDF loaded: ${pdf.numPages} pages`);
  } catch (err) {
    sendError('PARSE', 'Failed to open PDF document');
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
  log('PARSE', `Extracted ${tokens.length} tokens from PDF`);

  const fullText = tokens.join(' ').replace(/\s+/g, ' ');
  log('FLATTEN', `Flattened text length: ${fullText.length}`);

  const nimMatch = fullText.match(/\b(\d{10,13})\b/);
  const nim = nimMatch ? nimMatch[1] : '';
  log('NIM', nim || 'NOT FOUND');

  let semester = '';
  const semMatch = fullText.match(/SEMESTER\s*(\d{1,2})/i);
  if (semMatch) semester = semMatch[1];
  log('SEMESTER', semester || 'NOT FOUND');

  let nama = '';
  const tierPatterns = [
    /Nama Mahasiswa\s+([A-Za-z\s\.\']+?)\s+NIM/i,
    /Semester\s+([A-Za-z\s\.\']+?)\s+:\s*\d{10,13}/i,
    /(?:Ulang\s*\(U\)\.|bersangkutan,)\s*([A-Za-z\s\.\']+?)\s+NIM/i,
    /([A-Za-z\s\.\']+?)\s+NIM\s*:?\s*\d{10,13}/i,
  ];

  for (let t = 0; t < tierPatterns.length; t++) {
    const match = fullText.match(tierPatterns[t]);
    if (match) {
      nama = match[1].trim();
      log('NAMA', `Tier ${t + 1} matched: "${nama}"`);
      break;
    }
  }
  if (!nama) warn('NAMA', 'All 4 tiers failed to find Nama');

  let isTabelAktif = false;
  const kodeMKTerverifikasi: string[] = [];

  for (const token of tokens) {
    if (!isTabelAktif && token === 'KODE MK') {
      isTabelAktif = true;
      log('TABLE', 'Table active trigger hit');
      continue;
    }

    if (isTabelAktif) {
      if (token === 'JUMLAH') {
        log('TABLE', 'Table end trigger hit at JUMLAH');
        break;
      }
      if (/^(?=[A-Z]{2})(?=.*[0-9])[A-Z0-9]{8,10}$/.test(token)) {
        kodeMKTerverifikasi.push(token);
      }
    }
  }

  log('RESULT', `Extracted ${kodeMKTerverifikasi.length} course codes`);

  self.postMessage({
    type: 'RESULT',
    data: {
      Nama: nama,
      NIM: nim,
      Semester: semester,
      kodeMKTerverifikasi,
    },
  });
};
