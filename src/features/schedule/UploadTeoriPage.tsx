import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Upload, FileText, Sparkles } from 'lucide-react';
import { useJadwalStore } from '../../store/useJadwalStore';
import { Button } from '../../components/ui/pixelact-ui/button';
import { Card, CardContent } from '../../components/ui/pixelact-ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/pixelact-ui/select';
import { cn } from '../../lib/utils';
import { CatState } from '../../components/CatState';
import { PixelCat } from '../../components/PixelCat';

function truncate(name: string, max = 28): string {
  return name.length > max ? name.slice(0, max) + '...' : name;
}

type DropState = 'empty' | 'processing' | 'populated';

export function UploadTeoriPage({ onNext }: { onNext: () => void }) {
  const dataTeoriMentah = useJadwalStore((s) => s.dataTeoriMentah);
  const setDataTeoriMentah = useJadwalStore((s) => s.setDataTeoriMentah);
  const setJadwalTeoriTerpilih = useJadwalStore((s) => s.setJadwalTeoriTerpilih);
  const selectedTheoryRowIds = useJadwalStore((s) => s.selectedTheoryRowIds);
  const toggleTheoryRowId = useJadwalStore((s) => s.toggleTheoryRowId);
  const setSelectedTheoryRowIds = useJadwalStore((s) => s.setSelectedTheoryRowIds);

  const [dropState, setDropState] = useState<DropState>('empty');
  const [fileName, setFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [filterKelas, setFilterKelas] = useState('__all__');
  const [filterSemester, setFilterSemester] = useState('__all__');
  const [filterHari, setFilterHari] = useState('__all__');
  const workerRef = useRef<Worker | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    worker.onmessage = (e) => {
      const { type, step, data } = e.data;
      switch (type) {
        case 'LOG': console.log(`[Theory Worker] ${step}:`, data); break;
        case 'WARN': console.warn(`[Theory Worker] ${step}:`, data); break;
        case 'ERROR': console.error(`[Theory Worker] ${step}:`, data); setDropState('empty'); break;
        case 'RESULT':
          if (data.length > 0) { setDataTeoriMentah(data); setDropState('populated'); }
          else { console.warn('[Theory Worker] No rows parsed'); setDropState('empty'); }
          break;
      }
    };
    worker.onerror = () => setDropState('empty');
    workerRef.current = worker;
    return () => { worker.terminate(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processFile = useCallback((file: File) => {
    if (!workerRef.current) return;
    setFileName(file.name);
    setDropState('processing');
    setSelectedTheoryRowIds(new Set());
    setFilterKelas('__all__'); setFilterSemester('__all__'); setFilterHari('__all__');
    file.arrayBuffer().then((buffer) => {
      workerRef.current?.postMessage({ type: 'PARSE_THEORY', fileBuffer: buffer }, [buffer]);
    });
  }, [setSelectedTheoryRowIds]);

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
    const selectedRows = dataTeoriMentah.filter((r) => selectedTheoryRowIds.has(r.id));
    setJadwalTeoriTerpilih(selectedRows);
    onNext();
  };

  const dragClasses = isDragOver ? 'border-[var(--primary)] bg-primary/5' : '';
  const hasRows = dataTeoriMentah.length > 0;
  const hasChecked = selectedTheoryRowIds.size > 0;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-5xl flex-col px-3 py-4 sm:justify-center sm:px-4 sm:py-6 lg:px-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <p className="pixel-font text-[10px] uppercase tracking-[0.2em] text-primary">
          Upload Theory Schedule
        </p>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Upload your theory schedule PDF to extract and organize your classes
        </p>
      </div>

      <Card className={cn('w-full', dropState === 'populated' && 'shadow-none border-none bg-transparent')}>
        <CardContent className="p-0">
          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            className={cn(
              'relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] bg-card-solid px-4 py-10 text-center transition-all duration-200 sm:py-14',
              dragClasses,
              dropState === 'populated' && 'rounded-b-none border-b-0 border-solid border-[var(--primary)]/30 bg-primary/5',
            )}
          >
            {/* Decorative corner accents */}
            <div className="absolute top-3 left-3 h-6 w-6 rounded-tl-lg border-t-2 border-l-2 border-[var(--border)] opacity-30" />
            <div className="absolute top-3 right-3 h-6 w-6 rounded-tr-lg border-t-2 border-r-2 border-[var(--border)] opacity-30" />
            <div className="absolute bottom-3 left-3 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-[var(--border)] opacity-30" />
            <div className="absolute bottom-3 right-3 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-[var(--border)] opacity-30" />

            {dropState === 'processing' ? (
              <div className="flex flex-col items-center gap-3">
                <CatState pose="loading" size={64} message={truncate(fileName)} />
                <div className="flex items-center gap-2 text-[9px] pixel-font text-primary">
                  <Sparkles size={12} className="animate-pulse" />
                  Parsing PDF...
                </div>
              </div>
            ) : dropState === 'empty' ? (
              <div className="flex flex-col items-center gap-4">
                <PixelCat pose="idle" size={52} />
                <div>
                  <p className="text-[12px] font-semibold text-foreground">
                    Drop your PDF here
                  </p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    or <span className="text-primary font-medium underline underline-offset-2">browse files</span> from your device
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 text-[9px] pixel-font text-muted-foreground border border-[var(--border)]">
                  <FileText size={12} />
                  Supports PDF files
                </div>
                <Button variant="secondary" size="sm" className="mt-1 sm:hidden text-[9px]">
                  <Upload size={12} />
                  Choose File
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <PixelCat pose="tail-wag" size={44} />
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
            <div className="overflow-hidden">
              <div className="rounded-b-xl border-2 border-t-0 border-[var(--border)] bg-card-solid px-3 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[12px] font-medium text-muted-foreground">
                    {dataTeoriMentah.length} classes detected
                  </p>
                  <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[8px] pixel-font text-primary">
                    {selectedTheoryRowIds.size} selected
                  </div>
                </div>

                {/* Filters */}
                <div className="mb-3 flex flex-col gap-2 md:flex-row">
                  {[{ label: 'Kelas', value: filterKelas, setter: setFilterKelas, items: uniqueKelas, allLabel: 'All Classes' },
                    { label: 'Semester', value: filterSemester, setter: setFilterSemester, items: uniqueSemesters, allLabel: 'All SMT' },
                    { label: 'Hari', value: filterHari, setter: setFilterHari, items: uniqueHari, allLabel: 'All Days' },
                  ].map((f) => (
                    <div key={f.label} className="flex-1">
                      <p className="mb-1 text-[11px] font-medium text-muted-foreground">{f.label}</p>
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
                  <p className="mb-2 text-[11px] text-muted-foreground">
                    Showing {filteredRows.length} of {dataTeoriMentah.length} classes
                  </p>
                )}

                {filteredRows.length > 0 ? (
                  <div className="mb-3 grid max-h-[50dvh] grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                    {filteredRows.map((row) => {
                      const isChecked = selectedTheoryRowIds.has(row.id);
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
                    className="mt-2 w-full justify-center py-3.5 text-[10px] font-semibold gap-2"
                  >
                    Continue with {selectedTheoryRowIds.size} classes
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
