import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
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

  const [dropState, setDropState] = useState<DropState>('empty');
  const [isScanning, setIsScanning] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState<Uint8Array | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [filterKelas, setFilterKelas] = useState('__all__');
  const [filterSemester, setFilterSemester] = useState('__all__');
  const workerRef = useRef<Worker | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL('../../workers/praktikum.worker.ts', import.meta.url),
      { type: 'module' },
    );

    worker.onmessage = (e) => {
      const { type, step, data } = e.data;
      switch (type) {
        case 'LOG':
          console.log(`[Praktikum Worker] ${step}:`, data);
          break;
        case 'WARN':
          console.warn(`[Praktikum Worker] ${step}:`, data);
          break;
        case 'ERROR':
          console.error(`[Praktikum Worker] ${step}:`, data);
          setIsScanning(false);
          setIsParsing(false);
          break;
        case 'SCAN_RESULT':
          console.log('[Praktikum Worker] SCAN_RESULT:', data);
          setPraktikumRoomPrefixes(data.prefixes || []);
          setIsScanning(false);
          setDropState('populated');
          break;
        case 'PARSE_RESULT':
          console.log('[Praktikum Worker] PARSE_RESULT:', data);
          setPraktikumCandidates(data.candidates || []);
          setIsParsing(false);
          break;
      }
    };

    worker.onerror = () => { setIsScanning(false); setIsParsing(false); setDropState('empty'); };

    workerRef.current = worker;
    return () => { worker.terminate(); };
  }, []);

  const processFile = useCallback((file: File) => {
    if (!workerRef.current) return;
    setFileName(file.name);
    setDropState('processing');
    setIsScanning(true);
    setPraktikumRoomPrefixes([]);
    setSelectedRoomPrefix('');
    setPraktikumCandidates([]);
    setFilterKelas('__all__');
    setFilterSemester('__all__');

    file.arrayBuffer().then((buffer) => {
      const bytes = new Uint8Array(buffer);
      setFileData(bytes);
      workerRef.current?.postMessage(
        { type: 'SCAN_XLSX', file: bytes },
      );
    });
  }, []);

  const handlePrefixChange = useCallback((prefix: string) => {
    if (!workerRef.current || !fileData) return;
    setSelectedRoomPrefix(prefix);
    setFilterKelas('__all__');
    setFilterSemester('__all__');
    setIsParsing(true);

    workerRef.current.postMessage({
      type: 'PARSE_PRAKTIKUM',
      file: fileData,
      roomPrefix: prefix,
    });
  }, [fileData]);

  const uniqueKelas = useMemo(
    () => [...new Set(praktikumCandidates.map((c) => c.kelas))].sort(),
    [praktikumCandidates],
  );

  const uniqueSemesters = useMemo(
    () => [...new Set(praktikumCandidates.map((c) => c.semester).filter(Boolean))].sort(),
    [praktikumCandidates],
  );

  const filteredCandidates = useMemo(
    () => praktikumCandidates.filter((c) => {
      if (filterKelas !== '__all__' && c.kelas !== filterKelas) return false;
      if (filterSemester !== '__all__' && c.semester !== filterSemester) return false;
      return true;
    }),
    [praktikumCandidates, filterKelas, filterSemester],
  );

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
    const checked = filteredCandidates.filter((c) => selectedCandidateIds.has(c.id));

    const parseJam = (jam: string) => {
      const m = jam.match(/^(\d{2})[:.](\d{2})\s*[-–]\s*(\d{2})[:.](\d{2})$/);
      if (!m) return null;
      return { start: parseInt(m[1]) * 60 + parseInt(m[2]), end: parseInt(m[3]) * 60 + parseInt(m[4]) };
    };
    const formatJam = (start: number, end: number) => {
      const s = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`;
      const e = `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
      return `${s}-${e}`;
    };

    const groupKey = (c: typeof checked[number]) => `${c.courseName}|${c.dosen}|${c.hari}|${c.ruang}`;

    const groups = new Map<string, typeof checked>();
    for (const c of checked) {
      const key = groupKey(c);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    }

    const praktikumMerged: Record<string, unknown>[] = [];
    for (const items of groups.values()) {
      const parsed = items.map((c) => ({ c, jam: parseJam(c.jam) }));
      const valid = parsed.filter((p): p is { c: typeof checked[number]; jam: NonNullable<ReturnType<typeof parseJam>> } => p.jam !== null)
        .sort((a, b) => a.jam.start - b.jam.start);

      for (const p of parsed) {
        if (!p.jam) {
          praktikumMerged.push({
            KodeMK: '', MataKuliah: p.c.courseName, Kelas: p.c.kelas, SKS: '1',
            SMT: p.c.semester, DosenPengampuh: p.c.dosen, Hari: p.c.hari,
            Jam: p.c.jam || '', Ruang: p.c.ruang,
            Keterangan: p.c.keterangan || p.c.kelas || '-',
          });
        }
      }

      if (valid.length === 0) continue;

      let run = { items: [valid[0].c], start: valid[0].jam.start, end: valid[0].jam.end };
      for (let i = 1; i < valid.length; i++) {
        const v = valid[i];
        if (v.jam.start === run.end) {
          run.items.push(v.c);
          run.end = v.jam.end;
        } else {
          const first = run.items[0];
          praktikumMerged.push({
            KodeMK: '', MataKuliah: first.courseName, Kelas: first.kelas,
            SKS: String(run.items.length), SMT: first.semester, DosenPengampuh: first.dosen,
            Hari: first.hari, Jam: formatJam(run.start, run.end), Ruang: first.ruang,
            Keterangan: run.items.map((i) => i.keterangan).filter(Boolean).join(', ') || '-',
          });
          run = { items: [v.c], start: v.jam.start, end: v.jam.end };
        }
      }
      const first = run.items[0];
      praktikumMerged.push({
        KodeMK: '', MataKuliah: first.courseName, Kelas: first.kelas,
        SKS: String(run.items.length), SMT: first.semester, DosenPengampuh: first.dosen,
        Hari: first.hari, Jam: formatJam(run.start, run.end), Ruang: first.ruang,
        Keterangan: run.items.map((i) => i.keterangan).filter(Boolean).join(', ') || '-',
      });
    }

    const merged = [
      ...jadwalTeoriTerpilih.map((r) => ({
        ...r,
        Keterangan: '-',
      })),
      ...praktikumMerged,
    ];
    setJadwalFinal(merged);
    onNext();
  };

  const handleSkip = () => {
    if (jadwalFinal.length === 0) {
      const merged = jadwalTeoriTerpilih.map((r) => ({
        ...r,
        Keterangan: '-',
      }));
      setJadwalFinal(merged);
    }
    onNext();
  };

  const borderStyle = dropState === 'empty' || dropState === 'processing' ? 'border-dashed' : 'border-solid';
  const neonGlow = dropState === 'populated'
    ? 'shadow-[0_0_6px_rgba(0,255,200,0.5),0_0_14px_rgba(0,200,255,0.35),0_0_28px_rgba(150,0,255,0.2)] ring-[2px] ring-cyan-400/30'
    : '';
  const dragClasses = isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : '';
  const hasCandidates = praktikumCandidates.length > 0;
  const hasChecked = selectedCandidateIds.size > 0;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-5xl flex-col px-3 py-4 sm:justify-center sm:px-4 sm:py-6 lg:px-8">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2 sm:mb-4">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center text-zinc-400 hover:text-zinc-600 sm:h-8 sm:w-8 dark:hover:text-zinc-300"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="pixel-font text-[10px] uppercase tracking-wider text-zinc-400">
            Upload Practical Schedule
          </p>
          <p className="pixel-font mt-0.5 text-[8px] text-zinc-400">
            Upload your practical schedule XLSX
          </p>
        </div>
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
              {dropState === 'processing' || isScanning ? (
                <CatState pose="loading" size={56} message={truncate(fileName)} />
              ) : dropState === 'empty' ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-cat-bob">
                    <PixelCat pose="idle" size={48} />
                  </div>
                  <div>
                    <p className="pixel-font text-[9px] leading-relaxed text-zinc-500">
                      Tap to select your Practical file
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

            {/* Room prefix selection */}
            {dropState === 'populated' && praktikumRoomPrefixes.length > 0 && (
              <div className="border-2 border-t-0 border-cyan-400/40 px-3 py-3">
                <p className="pixel-font mb-2 text-[9px] text-zinc-500">Select Room Prefix</p>
                <Select value={selectedRoomPrefix} onValueChange={handlePrefixChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="[ Choose Room... ]" />
                  </SelectTrigger>
                  <SelectContent>
                    {praktikumRoomPrefixes.map((prefix) => (
                      <SelectItem key={prefix} value={prefix}>
                        {prefix}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Parsing spinner */}
            {isParsing && (
              <div className="flex flex-col items-center gap-2 border-2 border-t-0 border-cyan-400/40 px-3 py-6">
                <CatState pose="loading" size={48} message="Parsing schedule..." />
              </div>
            )}

            {/* Candidates */}
            {hasCandidates && !isParsing && (
              <div className="border-2 border-t-0 border-cyan-400/40 px-3 py-3">
                <p className="pixel-font mb-1 text-[9px] text-zinc-500">
                  {praktikumCandidates.length} jadwal ditemukan untuk {selectedRoomPrefix}
                </p>

                {/* Filters */}
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
                </div>

                {(filterKelas !== '__all__' || filterSemester !== '__all__') && (
                  <p className="pixel-font mb-2 text-[8px] text-zinc-500">
                    Filtered: {filteredCandidates.length} jadwal
                    {filterKelas ? ` • Kelas ${filterKelas}` : ''}
                    {filterSemester ? ` • SMT ${filterSemester}` : ''}
                  </p>
                )}

                {filteredCandidates.length > 0 ? (
                  <div className="mb-3 grid max-h-[50dvh] grid-cols-1 gap-2 overflow-y-auto md:grid-cols-2">
                    {filteredCandidates.map((cand) => {
                      const isChecked = selectedCandidateIds.has(cand.id);
                      return (
                        <label
                          key={cand.id}
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
                            onChange={() => toggleCandidateId(cand.id)}
                            className="mt-1 h-4 w-4 accent-cyan-500"
                          />
                          <div className="flex-1">
                            <p className="pixel-font text-[10px] font-semibold leading-tight text-zinc-800 dark:text-zinc-100">
                              {cand.courseName}
                            </p>
                            <p className="pixel-font mt-0.5 text-[8px] text-zinc-500">
                              {cand.dosen || '—'}
                              {cand.semester ? ` • SMT ${cand.semester}` : ''}
                              {' • Kelas '}{cand.kelas}{cand.keterangan ? ` (${cand.keterangan})` : ''}
                            </p>
                            {isChecked && (
                              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 border-t border-zinc-200 pt-1.5 dark:border-zinc-700">
                                <span className="pixel-font text-[8px] text-zinc-400">
                                  Hari: <span className="text-zinc-600 dark:text-zinc-300">{cand.hari}</span>
                                </span>
                                <span className="pixel-font text-[8px] text-zinc-400">
                                  Jam: <span className="text-zinc-600 dark:text-zinc-300">{cand.jam}</span>
                                </span>
                                <span className="pixel-font text-[8px] text-zinc-400">
                                  Ruang: <span className="text-zinc-600 dark:text-zinc-300">{cand.ruang}</span>
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
                    Continue ({selectedCandidateIds.size} selected)
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Skip button */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={handleSkip}
          className="pixel-font cursor-pointer px-4 py-3 text-center text-[9px] text-zinc-400 underline underline-offset-2 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          Skip → View Schedule
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
