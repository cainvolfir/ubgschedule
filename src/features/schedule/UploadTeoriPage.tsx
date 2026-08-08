import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useJadwalStore } from '../../store/useJadwalStore';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/pixelact-ui/select';
import { cn } from '../../lib/utils';
import { useToast } from '../../components/Toast';

function truncate(name: string, max = 28): string {
  return name.length > max ? name.slice(0, max) + '...' : name;
}

type DropState = 'empty' | 'processing' | 'populated' | 'error';

const ERROR_MESSAGES: Record<string, string> = {
  IMPORT: 'failed to load PDF parser library. check your internet connection.',
  PARSE: 'could not read the PDF file. make sure it is a valid schedule PDF.',
  JAM_NOT_FOUND: 'some classes had unrecognizable time formats. results may be incomplete.',
  default: 'something went wrong while parsing the PDF. try a different file.',
};

export function UploadTeoriPage({ onNext }: { onNext: () => void }) {
  const dataTeoriMentah = useJadwalStore((s) => s.dataTeoriMentah);
  const setDataTeoriMentah = useJadwalStore((s) => s.setDataTeoriMentah);
  const setJadwalTeoriTerpilih = useJadwalStore((s) => s.setJadwalTeoriTerpilih);
  const selectedTheoryRowIds = useJadwalStore((s) => s.selectedTheoryRowIds);
  const toggleTheoryRowId = useJadwalStore((s) => s.toggleTheoryRowId);
  const setSelectedTheoryRowIds = useJadwalStore((s) => s.setSelectedTheoryRowIds);
  const { addToast, removeToast } = useToast();

  const [dropState, setDropState] = useState<DropState>('empty');
  const [fileName, setFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [filterKelas, setFilterKelas] = useState('__all__');
  const [filterSemester, setFilterSemester] = useState('__all__');
  const [filterHari, setFilterHari] = useState('__all__');
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: '' });
  const [errorDetail, setErrorDetail] = useState('');
  const [warningCount, setWarningCount] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadingToastIdRef = useRef<string | null>(null);

  const dismissLoadingToast = () => {
    if (loadingToastIdRef.current) {
      removeToast(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }
  };

  const uniqueKelas = useMemo(() => [...new Set(dataTeoriMentah.map((r) => r.Kelas).filter(Boolean))].sort(), [dataTeoriMentah]);
  const uniqueSemesters = useMemo(() => [...new Set(dataTeoriMentah.map((r) => r.SMT).filter(Boolean))].sort(), [dataTeoriMentah]);
  const uniqueHari = useMemo(() => [...new Set(dataTeoriMentah.map((r) => r.Hari).filter(Boolean))].sort(), [dataTeoriMentah]);

  const filteredRows = useMemo(
    () => dataTeoriMentah.filter((r) => {
      if (filterKelas !== '__all__' && r.Kelas !== filterKelas) return false;
      if (filterSemester !== '__all__' && r.SMT !== filterSemester) return false;
      if (filterHari !== '__all__' && r.Hari !== filterHari) return false;
      return true;
    }),
    [dataTeoriMentah, filterKelas, filterSemester, filterHari],
  );

  useEffect(() => {
    const worker = new Worker(new URL('../../workers/theory.worker.ts', import.meta.url), { type: 'module' });
    const dismissLoading = () => {
      if (loadingToastIdRef.current) { removeToast(loadingToastIdRef.current); loadingToastIdRef.current = null; }
    };
    worker.onmessage = (e) => {
      const { type, step, data } = e.data;
      switch (type) {
        case 'LOG':
          if (step === 'PARSE') setProgress((p) => ({ ...p, stage: 'reading PDF structure...' }));
          if (step === 'TOKENS_COUNT') setProgress((p) => ({ ...p, stage: `extracting text (${data} tokens)...` }));
          if (step === 'INIT') setProgress((p) => ({ ...p, stage: 'loading PDF parser...' }));
          break;
        case 'WARN':
          setWarningCount((c) => c + 1);
          if (step === 'JAM_NOT_FOUND') addToast({ type: 'info', title: 'some classes skipped', message: `couldn't find time patterns for ${data?.kode || 'some courses'}.`, duration: 5000 });
          break;
        case 'ERROR':
          dismissLoading(); setDropState('error'); setProgress({ current: 0, total: 0, stage: '' });
          setErrorDetail(ERROR_MESSAGES[step] || ERROR_MESSAGES.default);
          addToast({ type: 'error', title: 'failed to parse PDF', message: ERROR_MESSAGES[step] || ERROR_MESSAGES.default, duration: 8000 });
          break;
        case 'RESULT':
          dismissLoading();
          if (data.length > 0) {
            setDataTeoriMentah(data); setDropState('populated'); setProgress({ current: 0, total: 0, stage: '' });
            addToast({ type: 'success', title: `found ${data.length} classes`, message: warningCount > 0 ? `${warningCount} warning${warningCount > 1 ? 's' : ''}` : undefined, duration: 4000 });
          } else {
            setDropState('error'); setErrorDetail('no class data extracted. make sure this is a valid theory schedule PDF.');
            addToast({ type: 'error', title: 'no classes found', message: 'the PDF was parsed but no class schedules were detected.', duration: 6000 });
          }
          break;
      }
    };
    worker.onerror = () => {
      dismissLoading(); setDropState('error'); setProgress({ current: 0, total: 0, stage: '' });
      setErrorDetail('unexpected error. please try again.');
      addToast({ type: 'error', title: 'unexpected error', message: 'the parser crashed. please try again.', duration: 6000 });
    };
    workerRef.current = worker;
    return () => { worker.terminate(); };
  }, []);

  const processFile = useCallback((file: File) => {
    if (!workerRef.current) return;
    if (!file.type.includes('application/pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      addToast({ type: 'error', title: 'invalid file type', message: 'please upload a PDF file.', duration: 5000 }); return;
    }
    if (file.size > 50 * 1024 * 1024) {
      addToast({ type: 'error', title: 'file too large', message: 'maximum file size is 50MB.', duration: 5000 }); return;
    }
    setFileName(file.name); setDropState('processing'); setProgress({ current: 0, total: 0, stage: 'starting...' });
    setWarningCount(0); setErrorDetail(''); setSelectedTheoryRowIds([]);
    setFilterKelas('__all__'); setFilterSemester('__all__'); setFilterHari('__all__');
    dismissLoadingToast();
    loadingToastIdRef.current = addToast({ type: 'loading', title: 'parsing PDF...', message: truncate(file.name), duration: 0 });
    file.arrayBuffer().then((buffer) => {
      workerRef.current?.postMessage({ type: 'PARSE_THEORY', fileBuffer: buffer }, [buffer]);
    }).catch(() => {
      dismissLoadingToast(); setDropState('error'); setErrorDetail('failed to read the file.');
      addToast({ type: 'error', title: 'file read error', message: 'could not read the uploaded file.', duration: 5000 });
    });
  }, [setSelectedTheoryRowIds, addToast]);

  const handleRetry = useCallback(() => { setDropState('empty'); setErrorDetail(''); setProgress({ current: 0, total: 0, stage: '' }); setWarningCount(0); inputRef.current?.click(); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); const file = e.dataTransfer.files[0]; if (file) processFile(file); }, [processFile]);
  const handleClick = () => inputRef.current?.click();
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) processFile(file); };

  const handleContinue = () => {
    const selectedRows = dataTeoriMentah.filter((r) => selectedTheoryRowIds.includes(r.id));
    setJadwalTeoriTerpilih(selectedRows); onNext();
  };

  const hasRows = dataTeoriMentah.length > 0;
  const hasChecked = selectedTheoryRowIds.length > 0;

  return (
    <div className="animate-fade-in-up flex flex-col">
      {/* Header content */}
      <div className="mb-lg">
        <h1 className="font-headline-lg text-headline-lg font-display-serif mb-sm text-primary dark:text-dark-primary">Upload Theory Schedule</h1>
        <p className="font-body-md text-body-md text-secondary dark:text-on-tertiary-container">Upload official theory class schedule PDF UBG student portal.</p>
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
          <p className="font-body-semibold text-body-semibold mb-xs text-center text-primary dark:text-dark-primary">Drag &amp; drop your PDF file click select file</p>
          <p className="font-label-sm text-label-sm text-center text-secondary dark:text-on-tertiary-container">Maximum file size 50 MB</p>
        </div>
      )}

      {(dropState === 'processing' || dropState === 'populated' || dropState === 'error') && (
        <div className="mb-md flex flex-col gap-sm">
          {/* File item */}
          <div className={cn(
            'relative flex items-center gap-md overflow-hidden rounded-xl border border-border bg-surface-container-low p-md dark:border-dark-border dark:bg-dark-background',
            dropState === 'error' && 'border-error dark:border-dark-error',
          )}>
            {/* Background progress indicator */}
            {dropState === 'processing' && (
              <div className="no-transition absolute bottom-0 left-0 h-1 w-full bg-primary dark:bg-dark-primary" />
            )}
            <div className="text-error dark:text-dark-error">
              <span className="material-symbols-outlined">picture_as_pdf</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-xs">
              <div className="flex items-center justify-between">
                <span className="font-body-semibold text-body-semibold truncate pr-md text-primary dark:text-dark-primary">{fileName || 'file.pdf'}</span>
                {dropState === 'populated' && (
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
                {dropState === 'processing' && (
                  <span className="font-label-sm text-label-sm shrink-0 text-primary dark:text-dark-primary">
                    {progress.total > 0 ? `${Math.round((progress.current / progress.total) * 100)}%` : 'Processing...'}
                  </span>
                )}
              </div>
              {dropState === 'processing' && (
                <div className="font-label-sm text-label-sm flex items-center gap-xs text-secondary dark:text-on-tertiary-container">
                  <span className="material-symbols-outlined animate-spin text-[14px]">sync</span>
                  {progress.stage || 'Processing table...'}
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
          {dropState === 'populated' && (
            <div className="mb-xl rounded-lg border border-transparent bg-surface-container-low p-md dark:border-dark-border dark:bg-[#1A1A1A]">
              <p className="font-code-log text-code-log m-0 font-mono-code text-secondary dark:text-on-tertiary-container">
                [{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}] Web Worker scanning PDF... {dataTeoriMentah.length} courses found, 0 schedule conflicts{warningCount > 0 ? ` (${warningCount} warnings)` : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Results — class selection */}
      {hasRows && (
        <div className="animate-fade-in-up mb-lg">
          <div className="mb-md flex flex-wrap items-center gap-md">
            {[{ label: 'Class', value: filterKelas, setter: setFilterKelas, items: uniqueKelas },
              { label: 'SMT', value: filterSemester, setter: setFilterSemester, items: uniqueSemesters },
              { label: 'Day', value: filterHari, setter: setFilterHari, items: uniqueHari },
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
            <span className="font-label-sm text-label-sm ml-auto text-primary dark:text-dark-primary">{selectedTheoryRowIds.length} selected</span>
          </div>

          {filteredRows.length > 0 ? (
            <div className="overflow-y-auto rounded-xl border border-border dark:border-dark-border" style={{ maxHeight: 220 }}>
              {/* Cards (no horizontal scroll — grid stacks 1-col mobile, 2-col desktop) */}
              <div className="grid grid-cols-1 gap-sm p-sm md:grid-cols-2">
                {filteredRows.map((row) => {
                  const isChecked = selectedTheoryRowIds.includes(row.id);
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => toggleTheoryRowId(row.id)}
                      className={cn(
                        'flex w-full flex-col gap-sm rounded-xl border border-border p-md text-left transition-colors dark:border-dark-border',
                        isChecked ? 'bg-primary/5 dark:bg-dark-primary/5' : 'bg-surface-container-low hover:bg-surface-container-high dark:bg-dark-background dark:hover:bg-dark-surface',
                      )}
                    >
                      <div className="flex items-start gap-sm">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleTheoryRowId(row.id)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-primary dark:accent-dark-primary"
                        />
                        <div className="min-w-0">
                          <p className="font-body-semibold text-body-semibold truncate text-primary dark:text-dark-primary">{row.MataKuliah}</p>
                          <p className="font-label-sm text-label-sm mt-xs text-secondary dark:text-on-tertiary-container">
                            {row.DosenPengampuh || '—'}{row.SMT ? ` • SMT ${row.SMT}` : ''}{row.Kelas ? ` • ${row.Kelas}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="ml-7 flex items-center gap-sm">
                        <span className="font-label-sm text-label-sm whitespace-nowrap rounded bg-surface-container px-sm py-xs text-secondary dark:bg-[#1A1A1A] dark:text-on-tertiary-container">{row.Hari} {row.Jam}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="font-body-md text-body-md rounded-xl border border-border bg-surface-container-low px-md py-lg text-center text-secondary dark:border-dark-border dark:bg-dark-background dark:text-on-tertiary-container">
              No classes match the filter.
            </div>
          )}
        </div>
      )}

      {/* Footer actions */}
      <div className="mt-auto flex flex-col items-center justify-between gap-md border-t border-canvas-line pt-lg dark:border-dark-canvas-line sm:flex-row">
        <button
          onClick={handleContinue}
          disabled={!hasChecked}
          className="font-body-semibold text-body-semibold flex w-full items-center justify-center gap-2 rounded-full bg-primary px-xl py-md text-on-primary shadow-md transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-dark-primary dark:text-primary"
        >
          {hasChecked ? `Continue to Practical (${selectedTheoryRowIds.length})` : 'Select classes to continue'}
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>

      <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleInputChange} />
    </div>
  );
}
