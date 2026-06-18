import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useJadwalStore } from '../../store/useJadwalStore';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/pixelact-ui/select';
import { cn } from '../../lib/utils';
import { CatState } from '../../components/CatState';
import { UGOMascotArt } from '../../components/UGOMascotArt';
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

  const dragClasses = isDragOver ? 'border-[var(--blue)] bg-[var(--blue-faint)]' : '';
  const hasRows = dataTeoriMentah.length > 0;
  const hasChecked = selectedTheoryRowIds.length > 0;
  const isProcessing = dropState === 'processing';

  return (
    <div className="animate-fade-in-up">
      {/* Glitch header */}
      <div className="glitch-header">
        <div className="glitch-title" data-text="UBG SCHEDULE">UBG SCHEDULE</div>
        <span className="glitch-sub">upload • parse • organize</span>
      </div>

      {/* Typing message */}
      {/* Command line prompt */}
      <div className="prompt-line">
        <span className="prompt-arrow">❯</span>
        <span className="prompt-path">~/tools</span>
        <span className="prompt-cmd">--upload</span>
        <span className="prompt-file">your_theory_schedule.pdf</span>
      </div>

      {/* Input area — no card, just terminal input */}
      <div className="input-block">
        {isProcessing ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <CatState pose="loading" size={40} message={truncate(fileName)} />
            <div className="font-mono text-xs text-[var(--blue)]">{'❯'} parsing PDF...</div>
            {progress.stage && <div className="font-mono text-[10px] text-[var(--text-muted)]">{progress.stage}</div>}
            <div className="w-40 h-1 rounded-full bg-[var(--surface-2)] border border-[var(--border)] overflow-hidden">
              <div className="h-full bg-[var(--blue)] rounded-full animate-progress-bar" />
            </div>
          </div>
        ) : dropState === 'empty' ? (
          <div
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            className={cn(
              'terminal-input text-center cursor-pointer py-8',
              dragClasses,
            )}
          >
            <div className="flex flex-col items-center gap-2">
              <UGOMascotArt size={36} alt="UGO" />
              <span className="text-[var(--text-faint)] text-xs">drop PDF here or click to browse</span>
            </div>
          </div>
        ) : dropState === 'error' ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <CatState pose="blink" size={32} />
            <div className="error-line visible !block font-mono text-xs">{errorDetail}</div>
            <div className="flex gap-2 mt-1">
              <button className="terminal-btn-sm" onClick={(e) => { e.stopPropagation(); handleRetry(); }}>[ try again ]</button>
              <button className="terminal-btn-sm" onClick={(e) => { e.stopPropagation(); handleClick(); }}>[ different file ]</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-3">
            <UGOMascotArt size={36} alt="UGO" />
            <div className="font-mono text-xs text-[var(--success)]">{'❯'} {truncate(fileName)} — loaded</div>
            <button className="terminal-btn-sm" onClick={handleClick}>[ replace file ]</button>
          </div>
        )}
      </div>

      {/* Browse button */}
      {dropState === 'empty' && (
        <button className="terminal-btn" onClick={handleClick}>
          <span>[ browse files ]</span>
        </button>
      )}

      {/* Results — terminal style table */}
      {hasRows && (
        <div className="animate-expand mt-4">
          {/* Results header */}
          <div className="flex items-center gap-2 mb-2 font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
            <span>output</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span>{dataTeoriMentah.length} classes</span>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mb-4">
            {[{ label: 'kelas', value: filterKelas, setter: setFilterKelas, items: uniqueKelas },
              { label: 'smt', value: filterSemester, setter: setFilterSemester, items: uniqueSemesters },
              { label: 'hari', value: filterHari, setter: setFilterHari, items: uniqueHari },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-1">
                <span className="font-mono text-[9px] text-[var(--text-faint)]">{f.label}:</span>
                <Select value={f.value} onValueChange={f.setter}>
                  <SelectTrigger size="xs" className="min-w-[36px]">
                    <SelectValue placeholder="all" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__" className="text-[9px]">all</SelectItem>
                    {f.items.map((item) => <SelectItem key={item} value={item} className="text-[9px]">{item}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
            {warningCount > 0 && (
              <span className="font-mono text-[9px] text-[var(--warning)]">⚠ {warningCount}</span>
            )}
            <span className="font-mono text-[9px] text-[var(--blue)]">{selectedTheoryRowIds.length} selected</span>
          </div>

          {/* Class list — terminal style */}
          {filteredRows.length > 0 ? (
            <div className="max-h-[200px] overflow-y-auto border border-[var(--border)] rounded-sm">
              <table className="w-full text-left border-collapse">
                <tbody>
                  {filteredRows.map((row) => {
                    const isChecked = selectedTheoryRowIds.includes(row.id);
                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          'border-b border-[var(--border)] cursor-pointer transition-colors',
                          isChecked ? 'bg-[var(--blue-faint)]' : 'hover:bg-[var(--surface-2)]',
                        )}
                        onClick={() => toggleTheoryRowId(row.id)}
                      >
                        <td className="px-2 py-1.5 w-6">
                          <input type="checkbox" checked={isChecked} onChange={() => toggleTheoryRowId(row.id)} className="accent-[var(--blue)] w-3 h-3" />
                        </td>
                        <td className="px-2 py-1.5 font-mono text-xs">
                          <div className="text-[var(--text)]">{row.MataKuliah}</div>
                          <div className="text-[10px] text-[var(--text-muted)]">
                            {row.DosenPengampuh || '—'}{row.SMT ? ` • SMT ${row.SMT}` : ''}{row.Kelas ? ` • ${row.Kelas}` : ''}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[10px] text-[var(--text-muted)] text-right">
                          {row.Hari} {row.Jam}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="font-mono text-xs text-[var(--text-muted)] py-2">{'❯'} no classes match this filter.</div>
          )}

          {hasChecked && (
            <button className="terminal-btn mt-3" onClick={handleContinue}>
              <span>[ continue with {selectedTheoryRowIds.length} classes ]</span>
            </button>
          )}
        </div>
      )}

      <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleInputChange} />
    </div>
  );
}
