import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Upload, FileText, Sparkles, AlertCircle, RotateCcw } from 'lucide-react';
import { useJadwalStore } from '../../store/useJadwalStore';
import { Button } from '../../components/ui/pixelact-ui/button';
import { Card, CardContent } from '../../components/ui/pixelact-ui/card';
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
  IMPORT: 'Failed to load PDF parser library. Please check your internet connection and try again.',
  PARSE: 'Could not read the PDF file. Make sure it is a valid schedule PDF and not scanned/image-only.',
  JAM_NOT_FOUND: 'Parsing completed but some classes had unrecognizable time formats. Results may be incomplete.',
  default: 'Something went wrong while parsing the PDF. Please try a different file.',
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

  // Helper to dismiss the loading toast if it exists
  const dismissLoadingToast = () => {
    if (loadingToastIdRef.current) {
      removeToast(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }
  };

  const uniqueKelas = useMemo(
    () => [...new Set(dataTeoriMentah.map((r) => r.Kelas).filter(Boolean))].sort(),
    [dataTeoriMentah],
  );
  const uniqueSemesters = useMemo(
    () => [...new Set(dataTeoriMentah.map((r) => r.SMT).filter(Boolean))].sort(),
    [dataTeoriMentah],
  );
  const uniqueHari = useMemo(
    () => [...new Set(dataTeoriMentah.map((r) => r.Hari).filter(Boolean))].sort(),
    [dataTeoriMentah],
  );

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
      if (loadingToastIdRef.current) {
        removeToast(loadingToastIdRef.current);
        loadingToastIdRef.current = null;
      }
    };
    worker.onmessage = (e) => {
      const { type, step, data } = e.data;
      switch (type) {
        case 'LOG':
          console.log(`[Theory Worker] ${step}:`, data);
          if (step === 'PARSE') setProgress((p) => ({ ...p, stage: 'Reading PDF structure...' }));
          if (step === 'TOKENS_COUNT') setProgress((p) => ({ ...p, stage: `Extracting text (${data} tokens found)...` }));
          if (step === 'INIT') setProgress((p) => ({ ...p, stage: 'Loading PDF parser...' }));
          break;
        case 'WARN':
          console.warn(`[Theory Worker] ${step}:`, data);
          setWarningCount((c) => c + 1);
          if (step === 'JAM_NOT_FOUND') {
            addToast({
              type: 'info',
              title: 'Some classes skipped',
              message: `Couldn't find time patterns for ${data?.kode || 'some courses'}. They were skipped.`,
              duration: 5000,
            });
          }
          break;
        case 'ERROR':
          dismissLoading();
          console.error(`[Theory Worker] ${step}:`, data);
          setDropState('error');
          setProgress({ current: 0, total: 0, stage: '' });
          setErrorDetail(ERROR_MESSAGES[step] || ERROR_MESSAGES.default);
          addToast({
            type: 'error',
            title: 'Failed to parse PDF',
            message: ERROR_MESSAGES[step] || ERROR_MESSAGES.default,
            duration: 8000,
          });
          break;
        case 'RESULT':
          dismissLoading();
          if (data.length > 0) {
            setDataTeoriMentah(data);
            setDropState('populated');
            setProgress({ current: 0, total: 0, stage: '' });
            addToast({
              type: 'success',
              title: `Found ${data.length} classes`,
              message: warningCount > 0
                ? `${warningCount} warning${warningCount > 1 ? 's' : ''} — some classes may have been skipped`
                : undefined,
              duration: 4000,
            });
          } else {
            setDropState('error');
            setErrorDetail('No class data could be extracted. Make sure this is a valid theory schedule PDF from Universitas Bumigora.');
            addToast({
              type: 'error',
              title: 'No classes found',
              message: 'The PDF was parsed but no class schedules were detected.',
              duration: 6000,
            });
          }
          break;
      }
    };
    worker.onerror = (err) => {
      dismissLoading();
      console.error('[Theory Worker] Fatal:', err);
      setDropState('error');
      setProgress({ current: 0, total: 0, stage: '' });
      setErrorDetail('An unexpected error occurred. Please try again or use a different PDF file.');
      addToast({
        type: 'error',
        title: 'Unexpected error',
        message: 'The parser crashed. Please try again.',
        duration: 6000,
      });
    };
    workerRef.current = worker;
    return () => { worker.terminate(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processFile = useCallback((file: File) => {
    if (!workerRef.current) return;
    // Validate file type
    if (!file.type.includes('application/pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      addToast({
        type: 'error',
        title: 'Invalid file type',
        message: 'Please upload a PDF file. Other formats are not supported for theory schedules.',
        duration: 5000,
      });
      return;
    }
    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      addToast({
        type: 'error',
        title: 'File too large',
        message: 'Maximum file size is 50MB. Please use a smaller PDF.',
        duration: 5000,
      });
      return;
    }
    setFileName(file.name);
    setDropState('processing');
    setProgress({ current: 0, total: 0, stage: 'Starting...' });
    setWarningCount(0);
    setErrorDetail('');
    setSelectedTheoryRowIds([]);
    setFilterKelas('__all__'); setFilterSemester('__all__'); setFilterHari('__all__');
    // Dismiss any previous loading toast, then create a new one
    dismissLoadingToast();
    loadingToastIdRef.current = addToast({
      type: 'loading',
      title: 'Parsing PDF...',
      message: truncate(file.name),
      duration: 0,
    });
    file.arrayBuffer().then((buffer) => {
      workerRef.current?.postMessage({ type: 'PARSE_THEORY', fileBuffer: buffer }, [buffer]);
    }).catch(() => {
      dismissLoadingToast();
      setDropState('error');
      setErrorDetail('Failed to read the file. Please try again.');
      addToast({
        type: 'error',
        title: 'File read error',
        message: 'Could not read the uploaded file.',
        duration: 5000,
      });
    });
  }, [setSelectedTheoryRowIds, addToast]);

  const handleRetry = useCallback(() => {
    setDropState('empty');
    setErrorDetail('');
    setProgress({ current: 0, total: 0, stage: '' });
    setWarningCount(0);
    inputRef.current?.click();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleClick = () => inputRef.current?.click();
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) processFile(file);
  };

  const handleContinue = () => {
    const selectedRows = dataTeoriMentah.filter((r) => selectedTheoryRowIds.includes(r.id));
    setJadwalTeoriTerpilih(selectedRows);
    onNext();
  };

  const dragClasses = isDragOver ? 'border-[var(--primary)] bg-primary/5' : '';
  const hasRows = dataTeoriMentah.length > 0;
  const hasChecked = selectedTheoryRowIds.length > 0;
  const isProcessing = dropState === 'processing';

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-5xl flex-col px-3 py-6 sm:justify-center sm:px-6 sm:py-12 lg:px-8 animate-fade-in-up">
      {/* Header */}
      <div className="mb-6 sm:mb-10">
        <p className="pixel-font text-[10px] uppercase tracking-[0.2em] text-primary">
          Upload Theory Schedule
        </p>
        <h2 className="mt-2 text-[18px] sm:text-[22px] font-bold text-foreground leading-tight">
          Upload your theory schedule
        </h2>
        <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed max-w-lg">
          Upload your theory schedule PDF to extract and organize your classes automatically.
        </p>
      </div>

      <Card className={cn('w-full', dropState === 'populated' && 'shadow-none border-none bg-transparent')}>
        <CardContent className="p-0">
          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            onClick={dropState === 'error' ? handleRetry : handleClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (dropState === 'error' ? handleRetry : handleClick)(); } }}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            className={cn(
              'relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] bg-card-solid px-4 py-8 text-center transition-all duration-200 sm:px-5 sm:py-14',
              dragClasses,
              dropState === 'populated' && 'rounded-b-none border-b-0 border-solid border-[var(--primary)]/30 bg-primary/5',
              dropState === 'error' && 'border-destructive/50 bg-destructive/5',
              isDragOver && 'scale-[1.01]',
            )}
            aria-label={dropState === 'empty' ? 'Drop zone for PDF upload. Click or press Enter to browse files.' : dropState === 'error' ? 'Upload failed. Click or press Enter to retry.' : 'File uploaded. Click to replace.'}
          >
            {/* Decorative corner accents — hidden on small screens */}
            <div className="absolute top-3 left-3 h-6 w-6 rounded-tl-lg border-t-2 border-l-2 border-[var(--border)] opacity-30 hidden sm:block" aria-hidden="true" />
            <div className="absolute top-3 right-3 h-6 w-6 rounded-tr-lg border-t-2 border-r-2 border-[var(--border)] opacity-30 hidden sm:block" aria-hidden="true" />
            <div className="absolute bottom-3 left-3 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-[var(--border)] opacity-30 hidden sm:block" aria-hidden="true" />
            <div className="absolute bottom-3 right-3 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-[var(--border)] opacity-30 hidden sm:block" aria-hidden="true" />

            {isProcessing ? (
              <div className="flex flex-col items-center gap-3">
                <CatState pose="loading" size={56} message={truncate(fileName)} />
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 text-[9px] pixel-font text-primary">
                    <Sparkles size={12} className="animate-pulse" />
                    Parsing PDF...
                  </div>
                  {progress.stage && (
                    <p className="text-[10px] text-muted-foreground">{progress.stage}</p>
                  )}
                  {/* Progress bar */}
                  <div className="w-48 h-2 rounded-full bg-muted border border-[var(--border)] overflow-hidden">
                    <div className="h-full bg-primary rounded-full animate-progress-bar" />
                  </div>
                </div>
              </div>
            ) : dropState === 'empty' ? (
              <div className="flex flex-col items-center gap-3">
                <UGOMascotArt size={56} alt="UGO mascot pixel art" />
                <div className="text-center">
                  <p className="text-[13px] font-semibold text-foreground">
                    Drop your PDF here
                  </p>
                  <p className="mt-1.5 text-[12px] text-muted-foreground">
                    or <span className="text-primary font-medium underline underline-offset-2">browse files</span> from your device
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-[9px] pixel-font text-muted-foreground border border-[var(--border)]">
                  <FileText size={12} />
                  Supports PDF files up to 50MB
                </div>
                <Button variant="secondary" size="sm" className="mt-1 sm:hidden text-[9px]">
                  <Upload size={12} />
                  Choose File
                </Button>
              </div>
            ) : dropState === 'error' ? (
              <div className="flex flex-col items-center gap-3">
                <CatState pose="blink" size={48} />
                <div className="flex items-center gap-2 text-[11px] font-semibold text-destructive">
                  <AlertCircle size={14} />
                  Parsing Failed
                </div>
                <p className="max-w-xs text-[11px] text-muted-foreground leading-relaxed">
                  {errorDetail}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Button variant="default" size="sm" className="text-[9px] gap-1.5" onClick={(e) => { e.stopPropagation(); handleRetry(); }}>
                    <RotateCcw size={11} />
                    Try Again
                  </Button>
                  <Button variant="secondary" size="sm" className="text-[9px]" onClick={(e) => { e.stopPropagation(); handleClick(); }}>
                    <Upload size={11} />
                    Different File
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2.5">
                <UGOMascotArt size={56} alt="UGO mascot pixel art" />
                <p className="text-[11px] font-semibold text-success flex items-center gap-1.5">
                  <Sparkles size={12} />
                  {truncate(fileName)}
                </p>
                <p className="text-[10px] text-muted-foreground">Click to replace file</p>
              </div>
            )}
          </div>

          {/* Results */}
          {hasRows && (
            <div className="overflow-hidden animate-expand">
              <div className="rounded-b-xl border-2 border-t-0 border-[var(--border)] bg-card-solid px-3 py-4 sm:px-4">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <p className="text-[12px] font-medium text-muted-foreground">
                    {dataTeoriMentah.length} classes detected
                  </p>
                  <div className="flex items-center gap-1.5">
                    {warningCount > 0 && (
                      <div className="flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[8px] pixel-font text-warning border border-warning/20">
                        <AlertCircle size={9} />
                        {warningCount} warnings
                      </div>
                    )}
                    <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[8px] pixel-font text-primary">
                      {selectedTheoryRowIds.length} selected
                    </div>
                  </div>
                </div>

                {/* Filters */}
                <div className="mb-5 flex flex-col gap-3.5 sm:flex-row sm:gap-3">
                  {[{ label: 'Kelas', value: filterKelas, setter: setFilterKelas, items: uniqueKelas, allLabel: 'All Classes' },
                    { label: 'Semester', value: filterSemester, setter: setFilterSemester, items: uniqueSemesters, allLabel: 'All SMT' },
                    { label: 'Hari', value: filterHari, setter: setFilterHari, items: uniqueHari, allLabel: 'All Days' },
                  ].map((f) => (
                    <div key={f.label} className="flex-1">
                      <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">{f.label}</p>
                      <Select value={f.value} onValueChange={f.setter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={`[ ${f.allLabel} ]`} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">[ {f.allLabel} ]</SelectItem>
                          {f.items.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                {(filterKelas !== '__all__' || filterSemester !== '__all__' || filterHari !== '__all__') && (
                  <p className="mb-3 text-[11px] text-muted-foreground">
                    Showing {filteredRows.length} of {dataTeoriMentah.length} classes
                  </p>
                )}

                {filteredRows.length > 0 ? (
                  <div className="mb-5 grid max-h-[50dvh] grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:gap-3 md:grid-cols-2 stagger-children">
                    {filteredRows.map((row) => {
                      const isChecked = selectedTheoryRowIds.includes(row.id);
                      return (
                        <label
                          key={row.id}
                          className={cn(
                            'group relative flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3.5 transition-all duration-200',
                            isChecked
                              ? 'border-[var(--primary)] bg-primary/5'
                              : 'border-[var(--border)] bg-card hover:border-[var(--border-strong)] hover:shadow-md',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleTheoryRowId(row.id)}
                            className="mt-0.5 h-4 w-4 rounded-md accent-[var(--primary)] transition-transform group-hover:scale-110"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold leading-tight text-card-foreground truncate">
                              {row.MataKuliah}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {row.DosenPengampuh || '—'}
                              {row.SMT ? ` • SMT ${row.SMT}` : ''}
                              {row.Kelas ? ` • ${row.Kelas}` : ''}
                              {row.SKS ? ` • ${row.SKS} SKS` : ''}
                            </p>
                            {isChecked && (
                              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-[var(--border)] pt-2">
                                {[
                                  { l: 'Hari', v: row.Hari },
                                  { l: 'Jam', v: row.Jam },
                                  { l: 'Ruang', v: row.Ruang },
                                ].map((d) => (
                                  <span key={d.l} className="text-[11px] text-muted-foreground">
                                    {d.l}: <span className="text-foreground font-medium">{d.v || '—'}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <CatState pose="blink" size={48} message="No classes match this filter." />
                )}

                {hasChecked && (
                  <Button
                    variant="default"
                    onClick={handleContinue}
                    className="mt-3 w-full justify-center py-3.5 text-[10px] font-semibold gap-2"
                  >
                    Continue with {selectedTheoryRowIds.length} classes
                    <Sparkles size={12} />
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleInputChange} />
    </div>
  );
}
