function log(step: string, data?: unknown) {
  self.postMessage({ type: 'LOG', step, data });
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
  log('TOKENS', tokens.slice(0, 10));

  const fullText = tokens.join(' ').replace(/\s+/g, ' ');
  log('FLATTEN', fullText.substring(0, 200));

  const nimMatch = fullText.match(/\b(\d{10,13})\b/);
  const nim = nimMatch ? nimMatch[1] : '';
  log('NIM', nimMatch ? { match: nimMatch[0], captured: nimMatch[1] } : 'NO_MATCH');

  const semesterMatch = fullText.match(/SEMESTER\s*(\d{1,2})/i);
  const semester = semesterMatch ? semesterMatch[1] : '';
  log('SEMESTER', semesterMatch ? semesterMatch[1] : 'NO_MATCH');

  let nama = '';

  const tier1Match = fullText.match(/Nama Mahasiswa\s+([A-Za-z\s\.\']+?)\s+NIM/i);
  log('NAMA_TIER1', tier1Match ? { captured: tier1Match[1].trim() } : 'NO_MATCH');
  if (tier1Match) {
    nama = tier1Match[1].trim();
    log('NAMA', `Final selected (Tier 1): "${nama}"`);
  }

  if (!nama) {
    const tier2Match = fullText.match(/Semester\s+([A-Za-z\s\.\']+?)\s+:\s*\d{10,13}/i);
    log('NAMA_TIER2', tier2Match ? { captured: tier2Match[1].trim() } : 'NO_MATCH');
    if (tier2Match) {
      nama = tier2Match[1].trim();
      log('NAMA', `Final selected (Tier 2): "${nama}"`);
    }
  }

  if (!nama) {
    const tier3Match = fullText.match(/(?:Ulang\s*\(U\)\.|bersangkutan,)\s*([A-Za-z\s\.\']+?)\s+NIM/i);
    log('NAMA_TIER3', tier3Match ? { captured: tier3Match[1].trim() } : 'NO_MATCH');
    if (tier3Match) {
      nama = tier3Match[1].trim();
      log('NAMA', `Final selected (Tier 3): "${nama}"`);
    }
  }

  self.postMessage({
    type: 'RESULT',
    data: { Nama: nama, NIM: nim, Semester: semester, kodeMKTerverifikasi: [] },
  });
};
