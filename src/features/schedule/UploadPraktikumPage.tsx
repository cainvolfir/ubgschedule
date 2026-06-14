import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, FileSpreadsheet, Sparkles } from 'lucide-react';
import { useJadwalStore } from '../../store/useJadwalStore';
import { Button } from '../../components/ui/pixelact-ui/button';
import { Card, CardContent } from '../../components/ui/pixelact-ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/pixelact-ui/select';
import { cn } from '../../lib/utils';
import { CatState } from '../../components/CatState';
import { UBGMascot } from '../../components/UBGMascot';

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
    const worker = new Worker(new URL('../../workers/praktikum.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const { type, step, data } = e.data;
      switch (type) {
        case 'LOG': console.log(`[Praktikum Worker] ${step}:`, data); break;
        case 'WARN': console.warn(`[Praktikum Worker] ${step}:`, data); break;
        case 'ERROR': console.error(`[Praktikum Worker] ${step}:`, data); setIsScanning(false); setIsParsing(false); break;
        case 'SCAN_RESULT': setPraktikumRoomPrefixes(data.prefixes || []); setIsScanning(false); setDropState('populated'); break;
        case 'PARSE_RESULT': setPraktikumCandidates(data.candidates || []); setIsParsing(false); break;
      }
    };
    worker.onerror = () => { setIsScanning(false); setIsParsing(false); setDropState('empty'); };
    workerRef.current = worker;
    return () => { worker.terminate(); };
  }, []);

  const processFile = useCallback((file: File) => {
    if (!workerRef.current) return;
    setFileName(file.name); setDropState('processing'); setIsScanning(true);
    setPraktikumRoomPrefixes([]); setSelectedRoomPrefix(''); setPraktikumCandidates([]);
    setFilterKelas('__all__'); setFilterSemester('__all__');
    file.arrayBuffer().then((buffer) => {
      const bytes = new Uint8Array(buffer);
      setFileData(bytes);
      workerRef.current?.postMessage({ type: 'SCAN_XLSX', file: bytes });
    });
  }, []);

  const handlePrefixChange = useCallback((prefix: string) => {
    if (!workerRef.current || !fileData) return;
    setSelectedRoomPrefix(prefix); setFilterKelas('__all__'); setFilterSemester('__all__'); setIsParsing(true);
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
    const checked = filteredCandidates.filter((c) => selectedCandidateIds.has(c.id));
    const parseJam = (jam: string) => { const m = jam.match(/^(\d{2})[:.](\d{2})\s*[-–]\s*(\d{2})[:.](\d{2})$/); return m ? { start: parseInt(m[1]) * 60 + parseInt(m[2]), end: parseInt(m[3]) * 60 + parseInt(m[4]) } : null; };
    const formatJam = (s: number, e: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}-${String(Math.floor(e / 60)).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}`;
    const groupKey = (c: typeof checked[number]) => `${c.courseName}|${c.dosen}|${c.hari}|${c.ruang}`;
    const groups = new Map<string, typeof checked>();
    for (const c of checked) { const k = groupKey(c); if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(c); }
    const praktikumMerged: Record<string, unknown>[] = [];
    for (const items of groups.values()) {
      const parsed = items.map((c) => ({ c, jam: parseJam(c.jam) }));
      const valid = parsed.filter((p): p is { c: typeof checked[number]; jam: NonNullable<ReturnType<typeof parseJam>> } => p.jam !== null).sort((a, b) => a.jam.start - b.jam.start);
      for (const p of parsed) { if (!p.jam) praktikumMerged.push({ KodeMK: '', MataKuliah: p.c.courseName, Kelas: p.c.kelas, SKS: '1', SMT: p.c.semester, DosenPengampuh: p.c.dosen, Hari: p.c.hari, Jam: p.c.jam || '', Ruang: p.c.ruang, Keterangan: p.c.keterangan || p.c.kelas || '-' }); }
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

  const dragClasses = isDragOver ? 'border-[var(--secondary)] bg-secondary/5' : '';
  const hasCandidates = praktikumCandidates.length > 0;
  const hasChecked = selectedCandidateIds.size > 0;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-5xl flex-col px-4 py-8 sm:justify-center sm:px-6 sm:py-12 lg:px-8">
      {/* Header */}
      <div className="mb-8 sm:mb-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--border)] bg-card text-foreground shadow-sm transition-all hover:border-[var(--primary)] hover:shadow-md hover:scale-105 active:scale-95"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <p className="pixel-font text-[10px] uppercase tracking-[0.2em] text-secondary">
              Upload Practical Schedule
            </p>
            <p className="mt-3 text-[13px] text-muted-foreground leading-relaxed">
              Upload your practical schedule XLSX file
            </p>
          </div>
        </div>
      </div>

      <Card className={cn('w-full', dropState === 'populated' && 'shadow-none border-none bg-transparent')}>
        <CardContent className="p-0">
          {/* Drop zone */}
          <div
            role="button" tabIndex={0} onClick={handleClick} onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            className={cn(
              'relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] bg-card-solid px-5 py-5 text-center transition-all duration-200 sm:py-14',
              dragClasses,
              dropState === 'populated' && 'rounded-b-none border-b-0 border-solid border-[var(--secondary)]/30 bg-secondary/5',
            )}
          >
            {/* Decorative corner accents — hidden on small screens */}
            <div className="absolute top-3 left-3 h-6 w-6 rounded-tl-lg border-t-2 border-l-2 border-[var(--border)] opacity-30 hidden sm:block" />
            <div className="absolute top-3 right-3 h-6 w-6 rounded-tr-lg border-t-2 border-r-2 border-[var(--border)] opacity-30 hidden sm:block" />
            <div className="absolute bottom-3 left-3 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-[var(--border)] opacity-30 hidden sm:block" />
            <div className="absolute bottom-3 right-3 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-[var(--border)] opacity-30 hidden sm:block" />

            {dropState === 'processing' || isScanning ? (
              <div className="flex flex-col items-center gap-3">
                <CatState pose="loading" size={56} message={truncate(fileName)} />
                <div className="flex items-center gap-2 text-[9px] pixel-font text-secondary">
                  <Sparkles size={12} className="animate-pulse" />
                  Scanning spreadsheet...
                </div>
              </div>
            ) : dropState === 'empty' ? (
              <div className="flex flex-col items-center gap-3">
                <UBGMascot pose="idle" size={36} />
                <div className="text-center">
                  <p className="text-[12px] font-semibold text-foreground">Drop your spreadsheet here</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">or <span className="text-secondary font-medium underline underline-offset-2">browse files</span></p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-[9px] pixel-font text-muted-foreground border border-[var(--border)]">
                  <FileSpreadsheet size={12} />
                  Supports XLSX, XLS, CSV
                </div>
                <Button variant="secondary" size="sm" className="mt-0.5 sm:hidden text-[9px]">
                  <FileSpreadsheet size={12} />
                  Choose File
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2.5">
                <UBGMascot pose="tail-wag" size={36} />
                <p className="text-[11px] font-semibold text-success flex items-center gap-1.5">
                  <Sparkles size={12} />
                  {truncate(fileName)}
                </p>
                <p className="text-[10px] text-muted-foreground">Click to replace file</p>
              </div>
            )}
          </div>

          {/* Room prefix selection */}
          {dropState === 'populated' && praktikumRoomPrefixes.length > 0 && (
            <div className="overflow-hidden">
              <div className="border-2 border-t-0 border-[var(--border)] bg-card-solid px-4 py-4">
                <p className="mb-2.5 text-[11px] font-medium text-muted-foreground">Select Room Prefix</p>
                <Select value={selectedRoomPrefix} onValueChange={handlePrefixChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a room prefix..." />
                  </SelectTrigger>
                  <SelectContent>
                    {praktikumRoomPrefixes.map((prefix) => <SelectItem key={prefix} value={prefix}>{prefix}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Parsing spinner */}
          {isParsing && (
            <div className="flex flex-col items-center gap-2 border-2 border-t-0 border-[var(--border)] bg-card-solid px-4 py-10">
              <CatState pose="loading" size={48} message="Parsing schedule..." />
            </div>
          )}

          {/* Candidates */}
          {hasCandidates && !isParsing && (
            <div className="overflow-hidden">
              <div className="rounded-b-xl border-2 border-t-0 border-[var(--border)] bg-card-solid px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[12px] font-medium text-muted-foreground">{praktikumCandidates.length} classes found</p>
                  <div className="flex items-center gap-1 rounded-full bg-secondary/10 px-2.5 py-1 text-[8px] pixel-font text-secondary">{selectedCandidateIds.size} selected</div>
                </div>

                <div className="mb-5 flex flex-col gap-3.5 sm:flex-row sm:gap-3">
                  {[{ label: 'Kelas', value: filterKelas, setter: setFilterKelas, items: uniqueKelas, allLabel: 'All Classes' },
                    { label: 'Semester', value: filterSemester, setter: setFilterSemester, items: uniqueSemesters, allLabel: 'All SMT' },
                  ].map((f) => (
                    <div key={f.label} className="flex-1">
                      <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">{f.label}</p>
                      <Select value={f.value} onValueChange={f.setter}>
                        <SelectTrigger className="w-full"><SelectValue placeholder={`[ ${f.allLabel} ]`} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">[ {f.allLabel} ]</SelectItem>
                          {f.items.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                {(filterKelas !== '__all__' || filterSemester !== '__all__') && (
                  <p className="mb-3 text-[11px] text-muted-foreground">Showing {filteredCandidates.length} of {praktikumCandidates.length}</p>
                )}

                {filteredCandidates.length > 0 ? (
                  <div className="mb-5 grid max-h-[45dvh] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:gap-3 md:grid-cols-2">
                    {filteredCandidates.map((cand) => {
                      const isChecked = selectedCandidateIds.has(cand.id);
                      return (
                        <label
                          key={cand.id}
                          className={cn(
                            'group relative flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3.5 transition-all duration-200',
                            isChecked ? 'border-[var(--secondary)] bg-secondary/5' : 'border-[var(--border)] bg-card hover:border-[var(--border-strong)] hover:shadow-md',
                          )}
                        >
                          <input type="checkbox" checked={isChecked} onChange={() => toggleCandidateId(cand.id)} className="mt-0.5 h-4 w-4 rounded-md accent-[var(--secondary)] transition-transform group-hover:scale-110" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold leading-tight text-card-foreground truncate">{cand.courseName}</p>
                            <p className="mt-1 text-[11px] text-muted-foreground">{cand.dosen || '—'}{cand.semester ? ` • SMT ${cand.semester}` : ''} • {cand.kelas}{cand.keterangan ? ` (${cand.keterangan})` : ''}</p>
                            {isChecked && (
                              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-[var(--border)] pt-2">
                                {[{ l: 'Hari', v: cand.hari }, { l: 'Jam', v: cand.jam }, { l: 'Ruang', v: cand.ruang }].map((d) => (
                                  <span key={d.l} className="text-[11px] text-muted-foreground">{d.l}: <span className="text-foreground font-medium">{d.v}</span></span>
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
                  <Button variant="default" onClick={handleContinue} className="mt-3 w-full justify-center py-3.5 text-[10px] font-semibold gap-2">
                    Continue with {selectedCandidateIds.size} classes
                    <Sparkles size={12} />
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skip button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={handleSkip}
          className="group flex items-center gap-2 rounded-xl border-2 border-[var(--border)] bg-card-solid px-5 py-2.5 text-[10px] font-medium text-muted-foreground shadow-sm transition-all hover:border-[var(--primary)] hover:text-foreground hover:shadow-md"
        >
          Skip practical — View schedule
          <ArrowLeft size={12} className="rotate-180 transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleInputChange} />
    </div>
  );
}
