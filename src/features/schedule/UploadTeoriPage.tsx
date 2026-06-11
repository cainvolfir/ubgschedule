import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useJadwalStore } from '../../store/useJadwalStore';
import { Button } from '../../components/ui/pixelact-ui/button';
import { Card, CardContent } from '../../components/ui/pixelact-ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
    const worker = new Worker(
      new URL('../../workers/theory.worker.ts', import.meta.url),
      { type: 'module' },
    );

    worker.onmessage = (e) => {
      const { type, step, data } = e.data;
      switch (type) {
        case 'LOG':
          console.log(`[Theory Worker] ${step}:`, data);
          break;
        case 'WARN':
          console.warn(`[Theory Worker] ${step}:`, data);
          break;
        case 'ERROR':
          console.error(`[Theory Worker] ${step}:`, data);
          setDropState('empty');
          break;
        case 'RESULT':
          console.log('[Theory Worker] RESULT:', data);
          if (data.length > 0) {
            setDataTeoriMentah(data);
            setDropState('populated');
          } else {
            console.warn('[Theory Worker] No rows parsed');
            setDropState('empty');
          }
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
    setFilterKelas('__all__');
    setFilterSemester('__all__');
    setFilterHari('__all__');

    file.arrayBuffer().then((buffer) => {
      workerRef.current?.postMessage(
        { type: 'PARSE_THEORY', fileBuffer: buffer },
        [buffer],
      );
    });
  }, [setSelectedTheoryRowIds]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleClick = () => inputRef.current?.click();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleContinue = () => {
    const selectedRows = dataTeoriMentah.filter((r) => selectedTheoryRowIds.has(r.id));
    setJadwalTeoriTerpilih(selectedRows);
    onNext();
  };

  const borderStyle = dropState === 'empty' || dropState === 'processing' ? 'border-dashed' : 'border-solid';
  const neonGlow = dropState === 'populated'
    ? 'shadow-[0_0_6px_rgba(0,255,200,0.5),0_0_14px_rgba(0,200,255,0.35),0_0_28px_rgba(150,0,255,0.2)] ring-[2px] ring-cyan-400/30'
    : '';
  const dragClasses = isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : '';
  const hasRows = dataTeoriMentah.length > 0;
  const hasChecked = selectedTheoryRowIds.size > 0;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-5xl flex-col px-3 py-4 sm:justify-center sm:px-4 sm:py-6 lg:px-8">
      {/* Header */}
      <div className="mb-3 sm:mb-4">
        <p className="pixel-font text-[10px] uppercase tracking-wider text-zinc-400">
          Upload Theory Schedule
        </p>
        <p className="pixel-font mt-1 text-[8px] text-zinc-400">
          Upload your theory schedule PDF to get started
        </p>
      </div>

      <Card className={cn('w-full', dropState === 'populated' && 'shadow-none')}>
        <CardContent className="p-0">
          <div className={dropState === 'populated' ? `${neonGlow} bg-white dark:bg-zinc-900` : ''}>
            {/* Drop zone */}
            <div
              role="button"
              tabIndex={0}
              onClick={handleClick}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              className={`flex cursor-pointer flex-col items-center justify-center border-2 bg-white px-4 py-8 text-center transition-all sm:py-10 dark:bg-zinc-900 ${borderStyle} ${dropState === 'populated' ? 'border-b-0 border-cyan-400/40' : 'border-black dark:border-zinc-600'} ${dragClasses}`}
            >
              {dropState === 'processing' ? (
                <CatState pose="loading" size={56} message={truncate(fileName)} />
              ) : dropState === 'empty' ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-cat-bob">
                    <PixelCat pose="idle" size={48} />
                  </div>
                  <div>
                    <p className="pixel-font text-[9px] leading-relaxed text-zinc-500">
                      Tap to select your Theory PDF
                    </p>
                    <p className="pixel-font mt-1 text-[8px] text-zinc-400">
                      or drag & drop here
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" className="text-[8px] sm:hidden">
                    Choose File
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-cat-tail-wag">
                    <PixelCat pose="tail-wag" size={40} />
                  </div>
                  <p className="pixel-font text-[9px] text-green-600 dark:text-green-400">
                    {truncate(fileName)}
                  </p>
                  <p className="pixel-font text-[8px] text-zinc-400">
                    Tap to change file
                  </p>
                </div>
              )}
            </div>

            {/* Results */}
            {hasRows && (
              <div className="border-2 border-t-0 border-cyan-400/40 px-3 py-3">
                <p className="pixel-font mb-2 text-[9px] text-zinc-500">
                  {dataTeoriMentah.length} jadwal terdeteksi
                </p>

                {/* Filters — stacked on mobile, 3-col on md+ */}
                <div className="mb-2 flex flex-col gap-2 md:flex-row">
                  <div className="flex-1">
                    <p className="pixel-font mb-0.5 text-[8px] text-zinc-400">Kelas</p>
                    <Select value={filterKelas} onValueChange={setFilterKelas}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="[ All Kelas ]" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">[ All Kelas ]</SelectItem>
                        {uniqueKelas.map((k) => (
                          <SelectItem key={k} value={k}>{k}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <p className="pixel-font mb-0.5 text-[8px] text-zinc-400">Semester</p>
                    <Select value={filterSemester} onValueChange={setFilterSemester}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="[ All SMT ]" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">[ All SMT ]</SelectItem>
                        {uniqueSemesters.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <p className="pixel-font mb-0.5 text-[8px] text-zinc-400">Hari</p>
                    <Select value={filterHari} onValueChange={setFilterHari}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="[ All Hari ]" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">[ All Hari ]</SelectItem>
                        {uniqueHari.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(filterKelas !== '__all__' || filterSemester !== '__all__' || filterHari !== '__all__') && (
                  <p className="pixel-font mb-2 text-[8px] text-zinc-500">
                    Filtered: {filteredRows.length} jadwal
                    {filterKelas !== '__all__' ? ` • Kelas ${filterKelas}` : ''}
                    {filterSemester !== '__all__' ? ` • SMT ${filterSemester}` : ''}
                    {filterHari !== '__all__' ? ` • ${filterHari}` : ''}
                  </p>
                )}

                {filteredRows.length > 0 ? (
                  <div className="mb-3 grid max-h-[50dvh] grid-cols-1 gap-2 overflow-y-auto md:grid-cols-2">
                    {filteredRows.map((row) => {
                      const isChecked = selectedTheoryRowIds.has(row.id);
                      return (
                        <label
                          key={row.id}
                          className={cn(
                            'flex cursor-pointer items-start gap-2 rounded px-3 py-3 transition-colors',
                            isChecked
                              ? 'bg-cyan-400/10 ring-1 ring-cyan-400/30'
                              : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleTheoryRowId(row.id)}
                            className="mt-1 h-4 w-4 accent-cyan-500"
                          />
                          <div className="flex-1">
                            <p className="pixel-font text-[10px] font-semibold leading-tight text-zinc-800 dark:text-zinc-100">
                              {row.MataKuliah}
                            </p>
                            <p className="pixel-font mt-0.5 text-[8px] text-zinc-500">
                              {row.DosenPengampuh || '—'}
                              {row.SMT ? ` • SMT ${row.SMT}` : ''}
                              {row.Kelas ? ` • Kelas ${row.Kelas}` : ''}
                              {row.SKS ? ` • ${row.SKS} SKS` : ''}
                            </p>
                            {isChecked && (
                              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 border-t border-zinc-200 pt-1.5 dark:border-zinc-700">
                                <span className="pixel-font text-[8px] text-zinc-400">
                                  Hari: <span className="text-zinc-600 dark:text-zinc-300">{row.Hari || '—'}</span>
                                </span>
                                <span className="pixel-font text-[8px] text-zinc-400">
                                  Jam: <span className="text-zinc-600 dark:text-zinc-300">{row.Jam || '—'}</span>
                                </span>
                                <span className="pixel-font text-[8px] text-zinc-400">
                                  Ruang: <span className="text-zinc-600 dark:text-zinc-300">{row.Ruang || '—'}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <CatState pose="blink" size={48} message="Tidak ada jadwal untuk filter ini." />
                )}

                {hasChecked && (
                  <Button
                    variant="default"
                    onClick={handleContinue}
                    className="mt-2 w-full justify-center py-3 text-[9px]"
                  >
                    Continue ({selectedTheoryRowIds.size} selected)
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
