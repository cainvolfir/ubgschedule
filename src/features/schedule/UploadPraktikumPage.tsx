import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useJadwalStore } from '../../store/useJadwalStore';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { cn } from '../../lib/utils';
import { useToast } from '../../components/Toast';

type DropState = 'empty' | 'processing' | 'populated' | 'error';

const PRAKTIKUM_ERRORS: Record<string, string> = {
  PARSE: 'could not read the spreadsheet. make sure it is a valid XLSX/XLS file.',
  SCAN: 'could not scan for room prefixes. the file may be empty or unsupported.',
  default: 'something went wrong. try a different file.',
};

export function UploadPraktikumPage({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const jadwalTeoriTerpilih = useJadwalStore((s) => s.jadwalTeoriTerpilih);
  const jadwalFinal = useJadwalStore((s) => s.jadwalFinal);
  const setJadwalFinal = useJadwalStore((s) => s.setJadwalFinal);
  const praktikumRoomPrefixes = useJadwalStore((s) => s.praktikumRoomPrefixes);
  const setPraktikumRoomPrefixes = useJadwalStore((s) => s.setPraktikumRoomPrefixes);
  const selectedRoomPrefix = useJadwalStore((s) => s.selectedRoomPrefix);
  const setSelectedRoomPrefix = useJadwalStore((s) => s.setSelectedRoomPrefix);
  const praktikumCandidates = useJadwalStore((s) => s.praktikumCandidates);
  const setPraktikumCandidates = useJadwalStore((s) => s.setPraktikumCandidates);
  const selectedCandidateIds = useJadwalStore((s) => s.selectedCandidateIds);
  const toggleCandidateId = useJadwalStore((s) => s.toggleCandidateId);
  const isParsing = useJadwalStore((s) => s.isParsing);
  const setIsParsing = useJadwalStore((s) => s.setIsParsing);
  const { addToast } = useToast();

  const [dropState, setDropState] = useState<DropState>('empty');
  const [isScanning, setIsScanning] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState<Uint8Array | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [filterKelas, setFilterKelas] = useState('__all__');
  const [filterSemester, setFilterSemester] = useState('__all__');
  const [errorDetail, setErrorDetail] = useState('');
  const [progressStage, setProgressStage] = useState('');
  const workerRef = useRef<Worker | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const worker = new Worker(new URL('../../workers/praktikum.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const { type, step, data } = e.data;
      switch (type) {
        case 'LOG':
          if (step === 'SCAN') setProgressStage('scanning for room prefixes...');
          if (step === 'PARSE') setProgressStage('parsing schedule data...');
          break;
        case 'WARN': break;
        case 'ERROR':
          setIsScanning(false); setIsParsing(false); setDropState('error'); setProgressStage('');
          setErrorDetail(PRAKTIKUM_ERRORS[step] || PRAKTIKUM_ERRORS.default);
          addToast({ type: 'error', title: 'failed to parse spreadsheet', message: PRAKTIKUM_ERRORS[step] || PRAKTIKUM_ERRORS.default, duration: 8000 });
          break;
        case 'SCAN_RESULT':
          setPraktikumRoomPrefixes(data.prefixes || []); setIsScanning(false); setProgressStage('');
          if (data.prefixes?.length > 0) {
            setDropState('populated');
            addToast({ type: 'success', title: `found ${data.prefixes.length} room prefixes`, message: 'select a room prefix to see classes.', duration: 4000 });
          } else {
            setDropState('error'); setErrorDetail('no room prefixes found.');
            addToast({ type: 'error', title: 'no room prefixes found', duration: 6000 });
          }
          break;
        case 'PARSE_RESULT':
          setPraktikumCandidates(data.candidates || []); setIsParsing(false); setProgressStage('');
          if (data.candidates?.length > 0) addToast({ type: 'success', title: `found ${data.candidates.length} classes`, duration: 4000 });
          else addToast({ type: 'info', title: 'no classes for this prefix', duration: 4000 });
          break;
      }
    };
    worker.onerror = () => {
      setIsScanning(false); setIsParsing(false); setDropState('error'); setProgressStage('');
      setErrorDetail('unexpected error. please try again.');
      addToast({ type: 'error', title: 'unexpected error', message: 'the parser crashed.', duration: 6000 });
    };
    workerRef.current = worker;
    return () => { worker.terminate(); };
  }, [addToast]);

  const processFile = useCallback((file: File) => {
    if (!workerRef.current) return;
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    if (!validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      addToast({ type: 'error', title: 'invalid file type', message: 'please upload XLSX, XLS, or CSV.', duration: 5000 }); return;
    }
    if (file.size > 50 * 1024 * 1024) {
      addToast({ type: 'error', title: 'file too large', message: 'maximum 50MB.', duration: 5000 }); return;
    }
    setFileName(file.name); setDropState('processing'); setProgressStage('starting...');
    setErrorDetail(''); setIsScanning(true); setPraktikumRoomPrefixes([]); setSelectedRoomPrefix(''); setPraktikumCandidates([]);
    setFilterKelas('__all__'); setFilterSemester('__all__');
    file.arrayBuffer().then((buffer) => {
      const bytes = new Uint8Array(buffer); setFileData(bytes);
      workerRef.current?.postMessage({ type: 'SCAN_XLSX', file: bytes });
    }).catch(() => {
      setDropState('error'); setIsScanning(false); setProgressStage(''); setErrorDetail('failed to read file.');
      addToast({ type: 'error', title: 'file read error', duration: 5000 });
    });
  }, [addToast]);

  const handleRetry = useCallback(() => { setDropState('empty'); setErrorDetail(''); setProgressStage(''); inputRef.current?.click(); }, []);
  const handlePrefixChange = useCallback((prefix: string) => {
    if (!workerRef.current || !fileData) return;
    setSelectedRoomPrefix(prefix); setFilterKelas('__all__'); setFilterSemester('__all__');
    setIsParsing(true); setProgressStage('parsing candidates...');
    workerRef.current.postMessage({ type: 'PARSE_PRAKTIKUM', file: fileData, roomPrefix: prefix });
  }, [fileData]);

  const uniqueKelas = useMemo(() => [...new Set(praktikumCandidates.map((c) => c.kelas))].sort(), [praktikumCandidates]);
  const uniqueSemesters = useMemo(() => [...new Set(praktikumCandidates.map((c) => c.semester).filter(Boolean))].sort(), [praktikumCandidates]);
  const filteredCandidates = useMemo(() => praktikumCandidates.filter((c) => {
    if (filterKelas !== '__all__' && c.kelas !== filterKelas) return false;
    if (filterSemester !== '__all__' && c.semester !== filterSemester) return false;
    return true;
  }), [praktikumCandidates, filterKelas, filterSemester]);

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }, [processFile]);
  const handleClick = () => inputRef.current?.click();
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) processFile(f); };

  const handleContinue = () => {
    const checked = filteredCandidates.filter((c) => selectedCandidateIds.includes(c.id));
    const parseJam = (jam: string) => { const m = jam.match(/^(\d{2})[:.](\d{2})\s*[-–]\s*(\d{2})[:.](\d{2})$/); return m ? { start: parseInt(m[1]) * 60 + parseInt(m[2]), end: parseInt(m[3]) * 60 + parseInt(m[4]) } : null; };
    const formatJam = (s: number, e: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}-${String(Math.floor(e / 60)).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}`;
    const groupKey = (c: typeof checked[number]) => `${c.courseName}|${c.dosen}|${c.hari}|${c.ruang}`;
    const groups = new Map<string, typeof checked>();
    for (const c of checked) { const k = groupKey(c); if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(c); }
    const praktikumMerged: Record<string, unknown>[] = [];
    for (const items of groups.values()) {
      const parsed = items.map((c) => ({ c, jam: parseJam(c.jam) }));
      const valid = parsed.filter((p): p is { c: typeof checked[number]; jam: NonNullable<ReturnType<typeof parseJam>> } => p.jam !== null).sort((a, b) => a.jam.start - b.jam.start);
      for (const p of parsed) { if (!p.jam) praktikumMerged.push({ KodeMK: '', MataKuliah: p.c.courseName, Kelas: p.c.kelas, SKS: '1', SMT: p.c.semester, DosenPengampuh: p.c.dosen, Hari: p.c.hari, Jam: p.c.jam || '', Ruang: p.c.ruang, Keterangan: p.c.keterangan || '-' }); }
      if (valid.length === 0) continue;
      let run = { items: [valid[0].c], start: valid[0].jam.start, end: valid[0].jam.end };
      for (let i = 1; i < valid.length; i++) { const v = valid[i]; if (v.jam.start === run.end) { run.items.push(v.c); run.end = v.jam.end; } else { const f = run.items[0]; praktikumMerged.push({ KodeMK: '', MataKuliah: f.courseName, Kelas: f.kelas, SKS: String(run.items.length), SMT: f.semester, DosenPengampuh: f.dosen, Hari: f.hari, Jam: formatJam(run.start, run.end), Ruang: f.ruang, Keterangan: run.items.map((x) => x.keterangan).filter(Boolean).join(', ') || '-' }); run = { items: [v.c], start: v.jam.start, end: v.jam.end }; } }
      const f = run.items[0]; praktikumMerged.push({ KodeMK: '', MataKuliah: f.courseName, Kelas: f.kelas, SKS: String(run.items.length), SMT: f.semester, DosenPengampuh: f.dosen, Hari: f.hari, Jam: formatJam(run.start, run.end), Ruang: f.ruang, Keterangan: run.items.map((x) => x.keterangan).filter(Boolean).join(', ') || '-' });
    }
    setJadwalFinal([...jadwalTeoriTerpilih.map((r) => ({ ...r, Keterangan: '-' })), ...praktikumMerged]);
    onNext();
  };

  const handleSkip = () => {
    if (jadwalFinal.length === 0) setJadwalFinal(jadwalTeoriTerpilih.map((r) => ({ ...r, Keterangan: '-' })));
    onNext();
  };

  const hasCandidates = praktikumCandidates.length > 0;
  const hasChecked = selectedCandidateIds.length > 0;
  const isProcessing = dropState === 'processing' || isScanning || isParsing;
  const isUploadDone = dropState === 'populated';

  return (
    <div className="animate-fade-in-up flex flex-col">
      {/* Header content */}
      <div className="mb-lg">
        <h2 className="font-headline-lg text-headline-lg font-display-serif mb-sm text-primary dark:text-dark-primary">Upload Practical Schedule</h2>
        <p className="font-body-md text-body-md text-secondary dark:text-on-tertiary-container">Upload practical schedule spreadsheet (XLSX/XLS/CSV) from UBG student portal.</p>
      </div>

      {/* Dropzone / file states */}
      {dropState === 'empty' && (
        <div
          role="button"
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          className={cn(
            'group mb-lg flex cursor-pointer flex-col items-center justify-center rounded-[16px] border-2 border-dashed border-transparent bg-dropzone p-xl transition-all dark:bg-dark-dropzone',
            isDragOver ? 'border-primary dark:border-dark-primary' : 'hover:border-primary dark:hover:border-dark-primary',
          )}
        >
          <div className="mb-md flex h-14 w-14 items-center justify-center rounded-full bg-surface shadow-sm transition-transform group-hover:scale-105 dark:bg-dark-surface">
            <span className="material-symbols-outlined text-secondary dark:text-dark-primary">cloud_upload</span>
          </div>
          <p className="font-body-semibold text-body-semibold mb-xs text-center text-primary dark:text-dark-primary">Drag &amp; drop your spreadsheet here or click to select a file</p>
          <p className="font-label-sm text-label-sm text-center text-secondary dark:text-on-tertiary-container">Maximum file size 50 MB (XLSX, XLS, or CSV)</p>
        </div>
      )}

      {(dropState === 'processing' || dropState === 'populated' || dropState === 'error') && (
        <div className="mb-md flex flex-col gap-sm">
          {/* File item */}
          <div className={cn(
            'relative flex items-center gap-md overflow-hidden rounded-xl border border-border bg-surface-container-low p-md dark:border-dark-border dark:bg-dark-background',
            dropState === 'error' && 'border-error dark:border-dark-error',
          )}>
            {isProcessing && (
              <div className="no-transition absolute bottom-0 left-0 h-1 w-full bg-primary dark:bg-dark-primary" />
            )}
            <div className="text-error dark:text-dark-error">
              <span className="material-symbols-outlined">picture_as_pdf</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-xs">
              <div className="flex items-center justify-between">
                <span className="font-body-semibold text-body-semibold truncate pr-md text-primary dark:text-dark-primary">{fileName || 'file.xlsx'}</span>
                {isUploadDone && !isParsing && (
                  <div className="flex shrink-0 items-center gap-xs text-success dark:text-dark-success">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    <span className="font-label-sm text-label-sm hidden sm:inline">Done</span>
                  </div>
                )}
                {dropState === 'error' && (
                  <div className="flex shrink-0 items-center gap-xs text-error dark:text-dark-error">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    <span className="font-label-sm text-label-sm hidden sm:inline">Failed</span>
                  </div>
                )}
                {isProcessing && (
                  <span className="font-label-sm text-label-sm shrink-0 text-primary dark:text-dark-primary">
                    {isParsing ? 'Processing...' : isScanning ? 'Scanning...' : 'Processing...'}
                  </span>
                )}
              </div>
              {(isProcessing || isParsing) && (
                <div className="font-label-sm text-label-sm flex items-center gap-xs text-secondary dark:text-on-tertiary-container">
                  <span className="material-symbols-outlined animate-spin text-[14px]">sync</span>
                  {progressStage || 'Processing table...'}
                </div>
              )}
              {dropState === 'error' && (
                <div className="font-label-sm text-label-sm flex items-center gap-xs text-error dark:text-dark-error">
                  <span className="material-symbols-outlined text-[14px]">info</span>
                  {errorDetail}
                </div>
              )}
            </div>
            <button
              onClick={dropState === 'error' ? (e) => { e.stopPropagation(); handleRetry(); } : handleClick}
              className="shrink-0 rounded-full p-xs text-secondary transition-colors hover:bg-surface-variant hover:text-error dark:text-on-tertiary-container dark:hover:bg-dark-surface dark:hover:text-dark-error"
              aria-label="Replace file"
            >
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </button>
          </div>

          {/* Worker log */}
          {isUploadDone && !isScanning && !isParsing && (
            <div className="rounded-lg border border-transparent bg-surface-container-low p-md dark:border-dark-border dark:bg-[#1A1A1A]">
              <p className="font-code-log text-code-log m-0 font-mono-code text-secondary dark:text-on-tertiary-container">
                [{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}] Web Worker scanning spreadsheet... {praktikumRoomPrefixes.length} room prefixes found, {praktikumCandidates.length} courses found
              </p>
            </div>
          )}
        </div>
      )}

      {/* Room prefix selection */}
      {isUploadDone && !isScanning && !isParsing && praktikumRoomPrefixes.length > 0 && (
        <div className="mb-lg">
          <label className="font-label-sm text-label-sm mb-sm block text-secondary dark:text-on-tertiary-container" id="prefix-label">Select room prefix</label>
          <Select value={selectedRoomPrefix} onValueChange={handlePrefixChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose room prefix..." />
            </SelectTrigger>
            <SelectContent>
              {praktikumRoomPrefixes.map((prefix) => <SelectItem key={prefix} value={prefix}>{prefix}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Candidates */}
      {!isScanning && hasCandidates && !isParsing && (
        <div className="animate-fade-in-up mb-lg">
          <div className="mb-md flex flex-wrap items-center gap-md">
            {[{ label: 'Class', value: filterKelas, setter: setFilterKelas, items: uniqueKelas },
              { label: 'Semester', value: filterSemester, setter: setFilterSemester, items: uniqueSemesters },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-sm">
                <span className="font-label-sm text-label-sm text-secondary dark:text-on-tertiary-container">{f.label}:</span>
                <Select value={f.value} onValueChange={f.setter}>
                  <SelectTrigger size="sm" className="w-auto min-w-[90px]">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All</SelectItem>
                    {f.items.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <span className="font-label-sm text-label-sm ml-auto text-primary dark:text-dark-primary">{selectedCandidateIds.length} selected</span>
          </div>

          {filteredCandidates.length > 0 ? (
            <>
              {/* Cards (no horizontal scroll - grid stacks 1-col mobile, 2-col desktop) */}
              <div className="overflow-y-auto rounded-xl border border-border dark:border-dark-border" style={{ maxHeight: 220 }}>
                <div className="grid grid-cols-1 gap-sm p-sm md:grid-cols-2">
                {filteredCandidates.map((cand) => {
                  const isChecked = selectedCandidateIds.includes(cand.id);
                  return (
                    <button
                      key={cand.id}
                      type="button"
                      onClick={() => toggleCandidateId(cand.id)}
                      className={cn(
                        'flex w-full flex-col gap-sm rounded-xl border border-border p-md text-left transition-colors dark:border-dark-border',
                        isChecked ? 'bg-primary/5 dark:bg-dark-primary/5' : 'bg-surface-container-low hover:bg-surface-container-high dark:bg-dark-background dark:hover:bg-dark-surface',
                      )}
                    >
                      <div className="flex items-start gap-sm">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCandidateId(cand.id)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-primary dark:accent-dark-primary"
                        />
                        <div className="min-w-0">
                          <p className="font-body-semibold text-body-semibold truncate text-primary dark:text-dark-primary">{cand.courseName}</p>
                          <p className="font-label-sm text-label-sm mt-xs text-secondary dark:text-on-tertiary-container">
                            {cand.dosen || '-'}{cand.semester ? ` • Semester ${cand.semester}` : ''} • {cand.kelas}
                          </p>
                        </div>
                      </div>
                      <div className="ml-7 flex items-center gap-sm">
                        <span className="font-label-sm text-label-sm whitespace-nowrap rounded bg-surface-container px-sm py-xs text-secondary dark:bg-[#1A1A1A] dark:text-on-tertiary-container">{cand.hari} {cand.jam}</span>
                        <span className="font-label-sm text-label-sm whitespace-nowrap rounded bg-surface-container px-sm py-xs text-primary dark:bg-[#1A1A1A] dark:text-dark-primary">{cand.ruang}</span>
                      </div>
                    </button>
                  );
                })}
                </div>
              </div>
            </>
          ) : (
            <div className="font-body-md text-body-md rounded-xl border border-border bg-surface-container-low px-md py-lg text-center text-secondary dark:border-dark-border dark:bg-dark-background dark:text-on-tertiary-container">
              No classes match the filter.
            </div>
          )}
        </div>
      )}

      {/* Skip */}
      <button
        onClick={handleSkip}
        className="font-body-semibold text-body-semibold mb-lg w-full rounded-full border border-outline px-xl py-md text-primary transition-colors hover:bg-surface-container-low focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:border-dark-border dark:text-dark-primary dark:hover:bg-surface-variant/10 sm:w-auto"
      >
        Skip
      </button>

      {/* Footer actions */}
      <div className="mt-auto flex flex-col items-center justify-between gap-md border-t border-canvas-line pt-lg dark:border-dark-canvas-line sm:flex-row">
        <button
          onClick={onBack}
          className="font-body-semibold text-body-semibold w-full rounded-full border border-outline px-xl py-md text-primary transition-colors hover:bg-surface-container-low focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:border-dark-border dark:text-dark-primary dark:hover:bg-surface-variant/10 sm:w-auto"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!hasChecked}
          className="font-body-semibold text-body-semibold flex w-full items-center justify-center gap-2 rounded-full bg-primary px-xl py-md text-on-primary shadow-md transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-dark-primary dark:text-primary sm:w-auto"
        >
          {hasChecked ? `Continue to Results (${selectedCandidateIds.length})` : 'Select classes to continue'}
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>

      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleInputChange} />
    </div>
  );
}
